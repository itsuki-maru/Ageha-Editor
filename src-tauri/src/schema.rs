use serde::{Deserialize, Serialize};

/// `~/.ageha/ageha.env.json` に保存される設定データの構造。
/// 起動時に読み込まれ、必要なら既定値で再生成される。
// アプリケーション設定情報構造体
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ApplicationInitSetup {
    pub css_file_path: String,
    #[serde(default = "default_slide_css_file_path")]
    pub slide_css_file_path: String,
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
/// フロントエンドへ返す簡易的なステータス情報。
/// 成否とメッセージだけを持つ共通レスポンスとして使う。
pub struct StatusCode {
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

#[derive(Debug, Serialize, Deserialize)]
/// フロントエンドが起動時データを要求したときに返す構造体。
/// 対象ファイルの内容と、各種 CSS テキストをまとめて含める。
pub struct LaunchRequestData {
    pub status: StatusCode,
    pub file_abs_path: String,
    pub text_data: String,
    pub css_data: String,
    pub slide_css_data: String,
}

impl LaunchRequestData {
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

#[derive(Debug, Serialize, Deserialize)]
/// ファイルを開いたときに返す Markdown 読み込み結果。
/// 読み込んだ本文と絶対パスをペアで返す。
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
