use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct StatusCode {
    pub status_code: u16,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReadFileData {
    pub status: StatusCode,
    pub text_data: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArgsReadFileData {
    pub file_path: String,
    pub file_data: String,
}
