use serde::{Deserialize, Serialize};

// Rust バックエンドとフロントエンドの間でやり取りするデータ構造を定義するモジュール。
// Tauri の invoke / IPC レイヤーを通じて JSON へシリアライズ・デシリアライズされる。

/// `~/.ageha/ageha.env.json` に保存されるアプリ設定の構造体。
/// 起動時に読み込まれ、存在しない場合は既定値で自動生成される。
/// serde の `default` 属性で旧フォーマットとの後方互換も確保している。
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ApplicationInitSetup {
    /// Markdown 用カスタム CSS のファイルパス（例: `~/.ageha/ageha.css`）
    pub css_file_path: String,
    /// スライド用カスタム CSS のファイルパス。
    /// 旧フォーマットにこのフィールドが存在しない場合は `default_slide_css_file_path()` の値を使う。
    #[serde(default = "default_slide_css_file_path")]
    pub slide_css_file_path: String,
    /// tracing ログレベル設定（例: `"ageha=error"`）
    pub rust_log: String,
}

/// `slide_css_file_path` フィールドの serde デフォルト値ファクトリ。
/// ユーザーのホームディレクトリを基準に `~/.ageha/ageha-slide.css` を返す。
fn default_slide_css_file_path() -> String {
    dirs::home_dir()
        .expect("User home directory get error.")
        .join(".ageha")
        .join("ageha-slide.css")
        .to_string_lossy()
        .into_owned()
}

/// フロントエンドへ返す共通ステータス情報。
/// HTTP ライクな status_code（200: 成功 / 500: エラー）とメッセージを持つ。
/// 各コマンドのレスポンスに埋め込んで使う。
#[derive(Debug, Serialize, Deserialize)]
pub struct StatusCode {
    /// 200: 成功 / 500: エラー
    pub status_code: u16,
    /// ユーザーまたは開発者向けのメッセージ文字列
    pub message: String,
}

impl StatusCode {
    /// 成功ステータス (200) を生成するファクトリメソッド。
    pub fn ok(msg: &str) -> Self {
        Self {
            status_code: 200,
            message: msg.to_string(),
        }
    }

    /// エラーステータス (500) を生成するファクトリメソッド。
    pub fn error(msg: &str) -> Self {
        Self {
            status_code: 500,
            message: msg.to_string(),
        }
    }
}

/// `request_launch_args` コマンドがフロントエンドへ返す起動時データ。
/// アプリ起動直後に一度だけ取得し、Pinia ストアへキャッシュして使う。
#[derive(Debug, Serialize, Deserialize)]
pub struct LaunchRequestData {
    /// コマンドの成否と付加メッセージ
    pub status: StatusCode,
    /// 起動引数で渡されたファイルの絶対パス（引数なし時は空文字）
    pub file_abs_path: String,
    /// 対象ファイルの UTF-8 本文テキスト（ファイルなし時は空文字）
    pub text_data: String,
    /// `ageha.css` の内容（Markdown プレビュー・出力に適用するユーザー CSS）
    pub css_data: String,
    /// `ageha-slide.css` の内容（スライドプレビュー・出力に適用するユーザー CSS）
    pub slide_css_data: String,
}

impl LaunchRequestData {
    /// エラー時のレスポンスを生成するファクトリメソッド。
    /// CSS データは取得済みの場合は渡し、エラー後もプレビューが壊れないようにする。
    pub fn error(msg: &str, css_data: String, slide_css_data: String) -> Self {
        Self {
            status: StatusCode::error(msg),
            file_abs_path: String::new(),
            text_data: String::new(),
            css_data,
            slide_css_data,
        }
    }
}

/// `read_file` コマンドがフロントエンドへ返すファイル読み込み結果。
/// ファイルを開く操作とドラッグ&ドロップのどちらでも使う。
#[derive(Debug, Serialize, Deserialize)]
pub struct ReadFileData {
    /// コマンドの成否と付加メッセージ
    pub status: StatusCode,
    /// 読み込んだファイルの OS が認識する絶対パス
    pub file_abs_path: String,
    /// 読み込んだファイルの UTF-8 本文テキスト
    pub text_data: String,
}

impl ReadFileData {
    /// エラー時のレスポンスを生成するファクトリメソッド。
    pub fn error(msg: &str) -> Self {
        Self {
            status: StatusCode::error(msg),
            file_abs_path: String::new(),
            text_data: String::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{LaunchRequestData, ReadFileData, StatusCode};

    #[test]
    fn creates_success_and_error_status_codes() {
        let ok = StatusCode::ok("Read Ok.");
        let error = StatusCode::error("Read Error.");

        assert_eq!(ok.status_code, 200);
        assert_eq!(ok.message, "Read Ok.");
        assert_eq!(error.status_code, 500);
        assert_eq!(error.message, "Read Error.");
    }

    #[test]
    fn creates_launch_error_response_with_css_payloads() {
        let response = LaunchRequestData::error(
            "CSS file read error.",
            String::from("body {}"),
            String::from("section {}"),
        );

        assert_eq!(response.status.status_code, 500);
        assert_eq!(response.file_abs_path, "");
        assert_eq!(response.text_data, "");
        assert_eq!(response.css_data, "body {}");
        assert_eq!(response.slide_css_data, "section {}");
    }

    #[test]
    fn creates_read_file_error_response() {
        let response = ReadFileData::error("Markdown file read error.");

        assert_eq!(response.status.status_code, 500);
        assert_eq!(response.file_abs_path, "");
        assert_eq!(response.text_data, "");
    }
}
