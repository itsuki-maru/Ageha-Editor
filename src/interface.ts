// フロントエンド全体で共有する型定義をここへ集約している。
// Rust バックエンドとのデータ受け渡し、スライド描画結果、
// ローカルストレージへ永続化するデータの形を一か所で揃える。

// -------- ローカルストレージ --------

/** Tauri plugin-store に永続化する UI 設定項目。
 *  各フィールドは未初期化状態を表す null を許容し、
 *  ストア初期化完了後に bool 値へ置き換わる。 */
export interface LocalStorageItem {
  /** マークダウン入力ツールパネルの表示状態 */
  isShowToolsFromLocalStorage: boolean | null;
  /** プレビューエリアの表示状態 */
  isPreviewFromLocalStorage: boolean | null;
  /** Vim キーバインドの有効状態 */
  isVimModeFromLocalStorage: boolean | null;
}

// -------- 文書モード --------

/** エディタが現在どの描画モードで動作しているかを示す判別型。
 *  frontmatter の `marp: true` を検出すると "slides" へ切り替わる。
 *  モードは文書内容から毎回導出されるため、永続化しない。 */
export type DocumentMode = "markdown" | "slides";

// -------- Rust IPC レスポンス --------

/** Rust 側コマンドが返す共通ステータス情報。
 *  HTTP ライクな status_code (200: 成功 / 500: エラー) を採用している。 */
export interface StatusCode {
  /** 200: 成功 / 500: エラー */
  status_code: number;
  /** ユーザーや開発者向けのメッセージ文字列 */
  message: string;
}

/** `read_file` コマンドが返すファイル読み込み結果。
 *  本文テキストと、OS が認識する絶対パスをペアで受け取る。 */
export interface ResponseTextData {
  status: StatusCode;
  /** 読み込んだファイルの UTF-8 テキスト本文 */
  text_data: string;
}

/** 変更追跡のために保持する、編集前後のテキスト差分情報。
 *  現在の本文を保存前の基準値と比較することで未保存状態を判定する。 */
export interface DiffEditorData {
  /** 最後に保存・ロードした時点の本文（比較基準） */
  oldEditorContent: string;
  /** 現在の本文（エディタの最新状態） */
  newEditorContent: string;
}

/** `request_launch_args` コマンドが返す起動時初期データ。
 *  アプリ起動直後に一度だけ取得し、Pinia ストアへキャッシュする。 */
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

/** Marp によるスライドレンダリング結果。
 *  プレビュー用 iframe への注入・HTML エクスポート・印刷の
 *  3 つの出力経路で共通利用する。 */
export interface SlideRenderResult {
  /** 常に "slides" 固定。DocumentMode との判別タグとして機能する。 */
  mode: "slides";
  /** Marp が生成したスライドの HTML 断片（section 要素の列） */
  html: string;
  /** Marp が生成したテーマ CSS（ageha-slide テーマを含む） */
  css: string;
  metadata: {
    /** ドキュメント内のスライド枚数（section 要素の数をカウント） */
    slideCount: number;
  };
}
