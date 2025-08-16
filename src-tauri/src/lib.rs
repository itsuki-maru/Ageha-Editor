use tauri::{Manager};
use std::{
    env,
};
mod handler;
mod schema;
mod config;

use handler::file::{
    read_file,
    save_file,
    request_launch_args,
};


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Some(_window) = app.get_webview_window("main") {
                #[cfg(debug_assertions)]
                {
                    _window.is_devtools_open();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_file,
            save_file,
            request_launch_args
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
