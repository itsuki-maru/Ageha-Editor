use serde::{Deserialize, Serialize};

/// `~/.ageha/ageha.env.json` に保存されるアプリ設定の構造体。
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ApplicationInitSetup {
    /// Markdown 用カスタム CSS のファイルパス（例: `~/.ageha/ageha.css`）
    pub css_file_path: String,
    /// 旧設定に項目がなくても既定のスライド CSS を読み込めるようにする。
    #[serde(default = "default_slide_css_file_path")]
    pub slide_css_file_path: String,
    /// tracing ログレベル設定（例: `"ageha=error"`）
    pub rust_log: String,
}

fn default_slide_css_file_path() -> String {
    dirs::home_dir()
        .expect("User home directory get error.")
        .join(".ageha")
        .join("ageha-slide.css")
        .to_string_lossy()
        .into_owned()
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatusCode {
    /// 200: 成功 / 500: エラー
    pub status_code: u16,
    pub message: String,
}

impl StatusCode {
    pub fn ok(msg: &str) -> Self {
        Self {
            status_code: 200,
            message: msg.to_string(),
        }
    }

    pub fn error(msg: &str) -> Self {
        Self {
            status_code: 500,
            message: msg.to_string(),
        }
    }
}

/// `request_launch_args` コマンドがフロントエンドへ返す起動時データ。
#[derive(Debug, Serialize, Deserialize)]
pub struct LaunchRequestData {
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
#[derive(Debug, Serialize, Deserialize)]
pub struct ReadFileData {
    pub status: StatusCode,
    pub file_abs_path: String,
    pub text_data: String,
}

impl ReadFileData {
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
