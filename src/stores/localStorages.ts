import { defineStore } from "pinia";
import { load, type Store as TauriStore } from "@tauri-apps/plugin-store";
import type { LocalStrageItem } from "../interface";

// plugin-storeの設定
const FILE_NAME = "settings.json";
const STATE_KEY = "localState@v1";

const DEFAULT_STATE: LocalStrageItem = {
  isPreviewFromLocalStrage: true,
  isShowToolsFromLocalStrage: true,
};

// HMR/多重init防止
let wired = false;

const bc =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("local-store-channel")
    : null;

// LazyStoreを一度だけロードして使い回す
let storePromise: Promise<TauriStore> | null = null;
function getStore(): Promise<TauriStore> {
  if (!storePromise) {
    // autoSave: true/数値(ms)/falseのいずれか
    // 150ms デバウンスで自動保存する設定とする
    storePromise = load(FILE_NAME, { autoSave: 150 });
  }
  return storePromise;
}

// 不足フィールド補完付き正規化
function normalize(input: unknown): LocalStrageItem {
  try {
    const obj = (typeof input === "string" ? JSON.parse(input) : input) ?? {};
    return { ...DEFAULT_STATE, ...(obj as Partial<LocalStrageItem>) };
  } catch {
    // 壊れたJSONは破棄してデフォルト値へ戻す
    return { ...DEFAULT_STATE };
  }
}

// 読み込み
async function readState(): Promise<LocalStrageItem> {
  try {
    const store = await getStore();
    const raw = await store.get<string | object | null>(STATE_KEY);
    return normalize(raw ?? null);
  } catch {
    return { ...DEFAULT_STATE };
  }
}

// 書き込み（autoSaveの設定のためsave()は不要）
async function writeState(state: LocalStrageItem): Promise<void> {
  const store = await getStore();
  await store.set(STATE_KEY, state);
}

// 削除
async function deleteState(): Promise<void> {
  const store = await getStore();
  await store.delete(STATE_KEY);
}

// 他WebViewへ更新通知
function notifyPeers(payload: LocalStrageItem) {
  bc?.postMessage({ type: "local:update", state: payload });
}

export const useLocalStorageStore = defineStore({
  id: "localStorage",
  state: (): LocalStrageItem => ({ ...DEFAULT_STATE }),
  getters: {
    isLoggedIn: (s) => !!s.isPreviewFromLocalStrage && !!s.isShowToolsFromLocalStrage,
  },
  actions: {
    async init(): Promise<void> {
      // 復元
      const loaded = await readState();
      this.$patch(loaded);

      // 多重配線防止（HMR対策）
      if (wired) return;
      wired = true;

      // 変更検知と自動保存
      this.$subscribe(
        async (_mutation, state) => {
          const plain: LocalStrageItem = {
            isPreviewFromLocalStrage: state.isPreviewFromLocalStrage,
            isShowToolsFromLocalStrage: state.isShowToolsFromLocalStrage,
          };
          await writeState(plain);
          notifyPeers(plain);
        },
        { detached: true },
      );

      // 他WebView/タブからの更新反映
      bc?.addEventListener("message", (e: MessageEvent) => {
        if (e.data?.type !== "local:update") return;
        const next = normalize(e.data.state);
        const s = this.$state;
        if (
          s.isPreviewFromLocalStrage === next.isPreviewFromLocalStrage &&
          s.isShowToolsFromLocalStrage === next.isShowToolsFromLocalStrage
        )
          return;
        this.$patch(next);
      });
    },

    // 値の更新
    setPreview(isPreview: boolean | null) {
      this.isPreviewFromLocalStrage = isPreview;
    },
    setMarkdownTools(isMarkdownTools: boolean | null) {
      this.isShowToolsFromLocalStrage = isMarkdownTools;
    },

    // クリア
    async clear() {
      this.$patch({ ...DEFAULT_STATE });
      await deleteState();
      notifyPeers(this.$state);
    },
  },
});
