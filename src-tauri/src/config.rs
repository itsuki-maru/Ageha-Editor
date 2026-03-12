/// 起動時に確定した設定値を Tauri の managed state として保持する。
/// フロントから呼ばれる各コマンドは、必要なパス情報をここから参照する。
/// アプリケーション設定（Tauri State として管理）
pub struct AppConfig {
    pub args_file_path: String,
    pub css_file_path: String,
    pub slide_css_file_path: String,
}
