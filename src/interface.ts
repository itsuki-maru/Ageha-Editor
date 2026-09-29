// -------- ローカルストレージ --------

/** Tauri plugin-store に保存する UI 設定。null は未初期化を表す。 */
export interface LocalStorageItem {
  isShowToolsFromLocalStorage: boolean | null;
  isPreviewFromLocalStorage: boolean | null;
  isScrollSyncFromLocalStorage: boolean | null;
  isVimModeFromLocalStorage: boolean | null;
  localeFromLocalStorage: AppLocale | null;
}

// -------- ロケール --------

export type AppLocale = "ja" | "en";

// -------- 文書モード --------

/** 文書内容から導出し、永続化しない描画モード。 */
export type DocumentMode = "markdown" | "slides";

// -------- Rust IPC レスポンス --------

/** Rust コマンド共通のステータス。 */
export interface StatusCode {
  /** 200: 成功 / 500: エラー */
  status_code: number;
  message: string;
}

/** read_file コマンドのレスポンス。 */
export interface ResponseTextData {
  status: StatusCode;
  text_data: string;
}

/** 未保存判定に使う比較基準と現在の本文。 */
export interface DiffEditorData {
  /** 最後に保存・ロードした時点の本文（比較基準） */
  oldEditorContent: string;
  /** 現在の本文（エディタの最新状態） */
  newEditorContent: string;
}

/** request_launch_args コマンドが返す起動時初期データ。 */
export interface RustArgsInit {
  status: StatusCode;
  /** コマンドライン引数で渡されたファイルの絶対パス。引数なし時は空文字。 */
  file_abs_path: string;
  /** 対象ファイルの本文テキスト。ファイルなし時は空文字。 */
  text_data: string;
  /** `~/.ageha/ageha.css` の内容。Markdown プレビュー・出力に適用する。 */
  css_data: string;
  /** `~/.ageha/ageha-slide.css` の内容。スライドプレビュー・出力に適用する。 */
  slide_css_data: string;
}

// -------- スライド描画 --------

/** プレビューと各出力で共有する Marp の描画結果。 */
export interface SlideRenderResult {
  mode: "slides";
  /** Marp が生成したスライドの HTML 断片（section 要素の列） */
  html: string;
  /** Marp が生成したテーマ CSS（ageha-slide テーマを含む） */
  css: string;
  metadata: {
    slideCount: number;
  };
}
