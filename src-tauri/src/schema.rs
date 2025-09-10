use serde::{Deserialize, Serialize};

// アプリケーション設定情報構造体
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ApplicationInitSetup {
    pub css_file_path: String,
    pub rust_log: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatusCode {
    pub status_code: u16,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LaunchRequestData {
    pub status: StatusCode,
    pub file_abs_path: String,
    pub text_data: String,
    pub css_data: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReadFileData {
    pub status: StatusCode,
    pub file_abs_path: String,
    pub text_data: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CssData {
    pub status: StatusCode,
    pub css_path: String,
    pub css_data: String,
}
