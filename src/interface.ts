// フロントエンド全体で共有する型をまとめて定義している。
// 永続化データ、Rust とのやり取り、スライド描画結果の形をここで揃える。
// ローカルストレージの情報格納
export interface LocalStorageItem {
  isShowToolsFromLocalStorage: boolean | null;
  isPreviewFromLocalStorage: boolean | null;
  isVimModeFromLocalStorage: boolean | null;
}

export type DocumentMode = "markdown" | "slides";

export interface StatusCode {
  status_code: number;
  message: string;
}

// Rustバックエンドから取得したマークダウンファイルの情報
export interface ResponseTextData {
  status: StatusCode;
  text_data: string;
}

// 初期データとの差分を保持
export interface DiffEditorData {
  oldEditorContent: string;
  newEditorContent: string;
}

// Rust側から受け取ったファイル保持
export interface RustArgsInit {
  status: StatusCode;
  file_abs_path: string;
  text_data: string;
  css_data: string;
  slide_css_data: string;
}

export interface SlideRenderResult {
  mode: "slides";
  html: string;
  css: string;
  metadata: {
    slideCount: number;
  };
}
