import { defineStore } from "pinia";
import { load, type Store as TauriStore } from "@tauri-apps/plugin-store";
import type { LocalStorageItem } from "../interface";

// プレビュー表示・Vim モード・マークダウンツール表示など、
// 軽量な UI 設定を永続化しつつ複数ウィンドウ間でも同期するストア。
//
// 永続化: Tauri plugin-store（OS 固有データディレクトリ以下の settings.json）
// ウィンドウ間同期: BroadcastChannel を使い、追加の Rust IPC なしで実現している。
// デバウンス自動保存: autoSave: 150 を指定し、150ms 間隔で自動的にディスクへ書く。

/** plugin-store が使うファイル名。OS 固有のデータディレクトリに配置される。 */
const FILE_NAME = "settings.json";
/** ストア内でデータを保存するキー名。スキーマ変更時はサフィックスをインクリメントする。 */
const STATE_KEY = "localState@v1";

/** 各設定のデフォルト値。初回起動時や設定破損時のフォールバックとして使う。 */
const DEFAULT_STATE: LocalStorageItem = {
  isPreviewFromLocalStorage: true,
  isShowToolsFromLocalStorage: true,
  isVimModeFromLocalStorage: false,
};

// HMR（ホットリロード）や多重初期化で $subscribe が重複しないようにするフラグ。
// モジュールスコープに持つことで init() を複数回呼んでも一度しか配線されない。
let wired = false;

// ウィンドウ間の状態同期に BroadcastChannel を使う。
// Rust 側に IPC コマンドを追加せずに済む軽量なアプローチ。
// SSR 環境など window が存在しない場合は null を代入して無効化する。
const bc =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("local-store-channel")
    : null;

// TauriStore インスタンスを一度だけ生成して使い回す。
// 毎回 load() を呼ぶとファイルハンドルが増えるため、Promise をキャッシュする。
let storePromise: Promise<TauriStore> | null = null;

/** TauriStore を遅延初期化して返す。 */
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
    // スプレッドで不足フィールドをデフォルト値で埋める。
    return { ...DEFAULT_STATE, ...(obj as Partial<LocalStorageItem>) };
  } catch {
    // JSON パースに失敗した壊れたデータは破棄し、デフォルト値へ戻す。
    return { ...DEFAULT_STATE };
  }
}

/** TauriStore から設定を読み出して正規化して返す。 */
async function readState(): Promise<LocalStorageItem> {
  try {
    const store = await getStore();
    // plugin-store は文字列・オブジェクト・null どれを返す可能性もあるため normalize を通す。
    const raw = await store.get<string | object | null>(STATE_KEY);
    return normalize(raw ?? null);
  } catch {
    return { ...DEFAULT_STATE };
  }
}

/**
 * 設定を TauriStore へ書き込む。autoSave が有効なので save() の明示的呼び出しは不要。
 * @param state - 保存する設定値
 */
async function writeState(state: LocalStorageItem): Promise<void> {
  const store = await getStore();
  await store.set(STATE_KEY, state);
}

/** TauriStore の該当キーを削除する。clear アクションで使う。 */
async function deleteState(): Promise<void> {
  const store = await getStore();
  await store.delete(STATE_KEY);
}

/**
 * BroadcastChannel 経由で他のウィンドウへ設定変更を通知する。
 * @param payload - 送信する最新の設定値
 */
function notifyPeers(payload: LocalStorageItem) {
  bc?.postMessage({ type: "local:update", state: payload });
}

export const useLocalStorageStore = defineStore({
  id: "localStorage",
  state: (): LocalStorageItem => ({ ...DEFAULT_STATE }),
  actions: {
    /**
     * ストレージから設定を読み込み、変更監視とウィンドウ間同期を配線する。
     * アプリ起動時に一度だけ呼ぶ。HMR 対策として $subscribe の重複登録を防ぐ。
     */
    async init(): Promise<void> {
      // ストレージから前回の設定を復元する。
      const loaded = await readState();
      this.$patch(loaded);

      // wired フラグで $subscribe とメッセージリスナーの二重配線を防ぐ。
      if (wired) return;
      wired = true;

      // ストアの値が変化するたびに自動保存と他ウィンドウへの通知を行う。
      // detached: true にすることでストア破棄後もサブスクリプションが生き続ける。
      this.$subscribe(
        async (_mutation, state) => {
          // ストア全体ではなく、永続化したい項目だけを明示的に抽出する。
          // 将来的に永続化不要な一時的プロパティが増えたときの安全策。
          const plain: LocalStorageItem = {
            isPreviewFromLocalStorage: state.isPreviewFromLocalStorage,
            isShowToolsFromLocalStorage: state.isShowToolsFromLocalStorage,
            isVimModeFromLocalStorage: state.isVimModeFromLocalStorage,
          };
          await writeState(plain);
          notifyPeers(plain);
        },
        { detached: true },
      );

      // 他のウィンドウからの更新通知を受け取ったら自分の state も更新する。
      // 値が変わっていない場合はパッチを当てないことで無限ループを防ぐ。
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
        this.$patch(next);
      });
    },

    /** プレビューエリアの表示状態を更新する */
    setPreview(isPreview: boolean | null) {
      this.isPreviewFromLocalStorage = isPreview;
    },
    /** マークダウン入力ツールパネルの表示状態を更新する */
    setMarkdownTools(isMarkdownTools: boolean | null) {
      this.isShowToolsFromLocalStorage = isMarkdownTools;
    },
    /** Vim モードの有効状態を更新する */
    setVimMode(isVimMode: boolean | null) {
      this.isVimModeFromLocalStorage = isVimMode;
    },

    /** ストアをデフォルト値へリセットし、ストレージからも削除する */
    async clear() {
      this.$patch({ ...DEFAULT_STATE });
      await deleteState();
      notifyPeers(this.$state);
    },
  },
});
