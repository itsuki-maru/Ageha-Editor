use tauri::Manager;
mod config;
mod handler;
mod schema;
mod utils;

use config::AppConfig;
use handler::file::{read_binary_file_data_url, read_file, request_launch_args, save_file};
use handler::spawn_self::spawn_self;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
// Tauri ランタイムへプラグイン、共有設定、invoke 可能なコマンドを登録する。
// フロントエンドとバックエンドを接続する中心的な組み立て処理である。
pub fn run(args_file_path: String, css_file_path: String, slide_css_file_path: String) {
    tauri::Builder::default()
        // フロント側の設定永続化で使う plugin-store を登録する。
        .plugin(tauri_plugin_store::Builder::new().build())
        // 標準ダイアログと外部オープナーを有効化する。
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        // 起動時に確定したパス類は AppConfig として全コマンドから参照できるようにする。
        .manage(AppConfig {
            args_file_path,
            css_file_path,
            slide_css_file_path,
        })
        .setup(|app| {
            if let Some(_window) = app.get_webview_window("main") {
                #[cfg(debug_assertions)]
                {
                    // 開発時はデバッグ用の入り口だけ残しておく。
                    _window.is_devtools_open();
                }
            }
            Ok(())
        })
        // フロントエンドから呼び出せるコマンドをここでまとめて公開する。
        .invoke_handler(tauri::generate_handler![
            read_binary_file_data_url,
            read_file,
            save_file,
            request_launch_args,
            spawn_self,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
