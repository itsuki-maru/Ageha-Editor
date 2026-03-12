import { defineStore } from "pinia";
import { load, type Store as TauriStore } from "@tauri-apps/plugin-store";
import type { LocalStorageItem } from "../interface";

// プレビュー表示状態や Vim モードなど、
// 軽量な UI 設定を保存しつつ複数ウィンドウ間でも同期するストア。
// plugin-storeの設定
const FILE_NAME = "settings.json";
const STATE_KEY = "localState@v1";

const DEFAULT_STATE: LocalStorageItem = {
  isPreviewFromLocalStorage: true,
  isShowToolsFromLocalStorage: true,
  isVimModeFromLocalStorage: false,
};

// HMR/多重init防止
let wired = false;

// BroadcastChannel を使うことで、
// Rust 側の追加 IPC を増やさずにウィンドウ間同期を実現している。
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
function normalize(input: unknown): LocalStorageItem {
  try {
    // 旧フォーマットや欠落キーがあっても既定値で補完する。
    const obj = (typeof input === "string" ? JSON.parse(input) : input) ?? {};
    return { ...DEFAULT_STATE, ...(obj as Partial<LocalStorageItem>) };
  } catch {
    // 壊れたJSONは破棄してデフォルト値へ戻す
    return { ...DEFAULT_STATE };
  }
}

// 読み込み
async function readState(): Promise<LocalStorageItem> {
  try {
    const store = await getStore();
    const raw = await store.get<string | object | null>(STATE_KEY);
    // plugin-store からは文字列・オブジェクトどちらも返り得るため normalize を通す。
    return normalize(raw ?? null);
  } catch {
    return { ...DEFAULT_STATE };
  }
}

// 書き込み（autoSaveの設定のためsave()は不要）
async function writeState(state: LocalStorageItem): Promise<void> {
  const store = await getStore();
  // autoSave が有効なので set だけで保存予約まで行われる。
  await store.set(STATE_KEY, state);
}

// 削除
async function deleteState(): Promise<void> {
  const store = await getStore();
  await store.delete(STATE_KEY);
}

// 他WebViewへ更新通知
function notifyPeers(payload: LocalStorageItem) {
  bc?.postMessage({ type: "local:update", state: payload });
}

export const useLocalStorageStore = defineStore({
  id: "localStorage",
  state: (): LocalStorageItem => ({ ...DEFAULT_STATE }),
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
          const plain: LocalStorageItem = {
            isPreviewFromLocalStorage: state.isPreviewFromLocalStorage,
            isShowToolsFromLocalStorage: state.isShowToolsFromLocalStorage,
            isVimModeFromLocalStorage: state.isVimModeFromLocalStorage,
          };
          // Store 全体ではなく、永続化したい項目だけを明示的に抽出する。
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
          s.isPreviewFromLocalStorage === next.isPreviewFromLocalStorage &&
          s.isShowToolsFromLocalStorage === next.isShowToolsFromLocalStorage &&
          s.isVimModeFromLocalStorage === next.isVimModeFromLocalStorage
        )
          return;
        // 他ウィンドウ側で変化があった場合だけ自分の state を更新する。
        this.$patch(next);
      });
    },

    // 値の更新
    setPreview(isPreview: boolean | null) {
      this.isPreviewFromLocalStorage = isPreview;
    },
    setMarkdownTools(isMarkdownTools: boolean | null) {
      this.isShowToolsFromLocalStorage = isMarkdownTools;
    },
    setVimMode(isVimMode: boolean | null) {
      this.isVimModeFromLocalStorage = isVimMode;
    },

    // クリア
    async clear() {
      this.$patch({ ...DEFAULT_STATE });
      await deleteState();
      notifyPeers(this.$state);
    },
  },
});
