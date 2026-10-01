import { normalizeStylePack } from "@/utils/stylePacks";
import { defineStore } from "pinia";
import { load, type Store as TauriStore } from "@tauri-apps/plugin-store";
import type { LocalStorageItem } from "../interface";

/** plugin-store が使うファイル名。OS 固有のデータディレクトリに配置される。 */
const FILE_NAME = "settings.json";
/** ストア内でデータを保存するキー名。スキーマ変更時はサフィックスをインクリメントする。 */
const STATE_KEY = "localState@v1";

const DEFAULT_STATE: LocalStorageItem = {
  isPreviewFromLocalStorage: true,
  isShowToolsFromLocalStorage: true,
  isScrollSyncFromLocalStorage: true,
  isVimModeFromLocalStorage: false,
  localeFromLocalStorage: "ja",
  stylePackFromLocalStorage: "standard",
};

// init() の多重呼び出しによる購読の重複を防ぐ。
let wired = false;

const bc =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("local-store-channel")
    : null;

// 毎回 load() を呼ぶとファイルハンドルが増えるため、Promise をキャッシュする。
let storePromise: Promise<TauriStore> | null = null;

function getStore(): Promise<TauriStore> {
  if (!storePromise) {
    // autoSave: 150 = 150ms デバウンスで自動保存。set() を呼べば保存予約まで行われる。
    storePromise = load(FILE_NAME, { autoSave: 150 });
  }
  return storePromise;
}

/**
 * ストレージから読んだ生データを LocalStorageItem へ正規化する。
 * 旧フォーマットのデータや欠落キーがあっても DEFAULT_STATE で補完する。
 * JSON 文字列・オブジェクト・null いずれの形式でも受け付ける。
 */
function normalize(input: unknown): LocalStorageItem {
  try {
    const obj = (typeof input === "string" ? JSON.parse(input) : input) ?? {};
    return {
      ...DEFAULT_STATE,
      ...(obj as Partial<LocalStorageItem>),
      stylePackFromLocalStorage: normalizeStylePack(obj.stylePackFromLocalStorage),
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function readState(): Promise<LocalStorageItem> {
  try {
    const store = await getStore();
    const raw = await store.get<string | object | null>(STATE_KEY);
    return normalize(raw ?? null);
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function writeState(state: LocalStorageItem): Promise<void> {
  const store = await getStore();
  await store.set(STATE_KEY, state);
}

async function deleteState(): Promise<void> {
  const store = await getStore();
  await store.delete(STATE_KEY);
}

function notifyPeers(payload: LocalStorageItem) {
  bc?.postMessage({ type: "local:update", state: payload });
}

export const useLocalStorageStore = defineStore({
  id: "localStorage",
  state: (): LocalStorageItem => ({ ...DEFAULT_STATE }),
  actions: {
    async init(): Promise<void> {
      const loaded = await readState();
      this.$patch(loaded);

      if (wired) return;
      wired = true;

      // コンポーネントのアンマウント後も設定の保存・同期を続ける。
      this.$subscribe(
        async (_mutation, state) => {
          // ストア全体ではなく、永続化したい項目だけを明示的に抽出する。
          const plain: LocalStorageItem = {
            isPreviewFromLocalStorage: state.isPreviewFromLocalStorage,
            isShowToolsFromLocalStorage: state.isShowToolsFromLocalStorage,
            isScrollSyncFromLocalStorage: state.isScrollSyncFromLocalStorage,
            isVimModeFromLocalStorage: state.isVimModeFromLocalStorage,
            localeFromLocalStorage: state.localeFromLocalStorage,
            stylePackFromLocalStorage: normalizeStylePack(state.stylePackFromLocalStorage),
          };
          await writeState(plain);
          notifyPeers(plain);
        },
        { detached: true },
      );

      // 値が変わっていない場合はパッチを当てないことで無限ループを防ぐ。
      bc?.addEventListener("message", (e: MessageEvent) => {
        if (e.data?.type !== "local:update") return;
        const next = normalize(e.data.state);
        const s = this.$state;
        if (
          s.isPreviewFromLocalStorage === next.isPreviewFromLocalStorage &&
          s.isShowToolsFromLocalStorage === next.isShowToolsFromLocalStorage &&
          s.isScrollSyncFromLocalStorage === next.isScrollSyncFromLocalStorage &&
          s.isVimModeFromLocalStorage === next.isVimModeFromLocalStorage &&
          s.stylePackFromLocalStorage === next.stylePackFromLocalStorage &&
          s.localeFromLocalStorage === next.localeFromLocalStorage
        )
          return;
        this.$patch(next);
      });
    },

    setStylePack(id: string) {
      this.stylePackFromLocalStorage = normalizeStylePack(id);
    },
    setPreview(isPreview: boolean | null) {
      this.isPreviewFromLocalStorage = isPreview;
    },
    setMarkdownTools(isMarkdownTools: boolean | null) {
      this.isShowToolsFromLocalStorage = isMarkdownTools;
    },
    setScrollSync(isScrollSync: boolean | null) {
      this.isScrollSyncFromLocalStorage = isScrollSync;
    },
    setVimMode(isVimMode: boolean | null) {
      this.isVimModeFromLocalStorage = isVimMode;
    },
    setLocale(locale: LocalStorageItem["localeFromLocalStorage"]) {
      this.localeFromLocalStorage = locale;
    },

    async clear() {
      this.$patch({ ...DEFAULT_STATE });
      await deleteState();
      notifyPeers(this.$state);
    },
  },
});
