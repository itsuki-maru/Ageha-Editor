use tauri::Manager;
mod config;
mod handler;
mod schema;
mod utils;

use config::AppConfig;
use handler::file::{
    delete_file, list_image_path_suggestions, read_binary_file_data_url, read_file,
    request_launch_args, save_file, save_temp_html,
};
use handler::pdf::export_slide_pdf;
use handler::spawn_self::spawn_self;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(args_file_path: String, css_file_path: String, slide_css_file_path: String) {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppConfig {
            args_file_path,
            css_file_path,
            slide_css_file_path,
        })
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
            read_binary_file_data_url,
            list_image_path_suggestions,
            read_file,
            save_file,
            save_temp_html,
            delete_file,
            request_launch_args,
            spawn_self,
            export_slide_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
