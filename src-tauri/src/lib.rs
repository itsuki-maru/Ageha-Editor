use tauri::{Manager};
use std::{
    fs,
    io::{BufWriter, Write},
    env,
    path::{Path, PathBuf},
};
use dirs;
mod schema;
use schema::{StatusCode, ReadFileData};
mod config;
use config::CONFIG;

#[tauri::command]
async fn request_launch_args() -> Result<ReadFileData, ReadFileData> {
    let target_file_abs = match get_abs_filepath(&CONFIG.args_file_path) {
        Ok(path) => path,
        Err(_) => return Err(
            ReadFileData {
                status: {
                    StatusCode { status_code: 500, message: "File absolute path get error.".to_string() }
                },
                file_abs_path: "".to_string(),
                text_data: "".to_string(),
            }
        )
    };

    let text_data = match fs::read_to_string(target_file_abs.clone()) {
        Ok(file) => file,
        Err(_) => return Err(
            ReadFileData {
                status: {
                    StatusCode { status_code: 500, message: "Markdown file read error.".to_string() }
                },
                file_abs_path: "".to_string(),
                text_data: "".to_string(),
            }
        )
    };

    Ok(ReadFileData {
        status: StatusCode { status_code: 200, message: "Read Ok.".to_string() },
        file_abs_path: format!("{}", target_file_abs.to_string_lossy()),
        text_data: text_data,
    })
}

#[tauri::command]
async fn read_file(target_file: &str) -> Result<ReadFileData, ReadFileData> {
    // 対象ファイルの絶対パスを取得
    let target_file_abs = match get_abs_filepath(target_file) {
        Ok(path) => path,
        Err(_) => return Err(
            ReadFileData {
                status: {
                    StatusCode { status_code: 500, message: "File absolute path get error.".to_string() }
                },
                file_abs_path: "".to_string(),
                text_data: "".to_string(),
            }
        )
    };

    let text_data = match fs::read_to_string(target_file_abs.clone()) {
        Ok(file) => file,
        Err(_) => return Err(
            ReadFileData {
                status: {
                    StatusCode { status_code: 500, message: "Markdown file read error.".to_string() }
                },
                file_abs_path: "".to_string(),
                text_data: "".to_string(),
            }
        )
    };

    Ok(ReadFileData {
        status: StatusCode { status_code: 200, message: "Read Ok.".to_string() },
        file_abs_path: format!("{}", target_file_abs.to_string_lossy()),
        text_data: text_data,
    })
}

#[tauri::command]
async fn save_file(
    save_path: &str,
    markdown_text_data: String
) -> Result<StatusCode, StatusCode> {
    let file = fs::File::create(&save_path);
    match file {
        Ok(file) => {
            let mut writer = BufWriter::new(file);
            let result = write!(writer, "{}", markdown_text_data);
            match result {
                Ok(_) => {
                    let result = writer.flush();
                    match result {
                        Ok(_) => Ok(StatusCode { status_code: 200, message: "Save Ok.".to_string() }),
                        Err(_) => Err(StatusCode { status_code: 500, message: "File Write Error.".to_string() })
                    }
                },
                Err(_) => Err(StatusCode { status_code: 500, message: "File Write Error.".to_string() })
            }
        },
        Err(_) => {
            Err(StatusCode { status_code: 500, message: "Save Error.".to_string() })
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                window.maximize().unwrap(); // 起動時に最大化
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![read_file, save_file, request_launch_args])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ファイルの絶対パスを取得する関数
pub fn get_abs_filepath(filename: &str) -> std::io::Result<PathBuf> {
    // ホームディレクトリを取得
    let home_dir = match dirs::home_dir() {
        Some(path) => path,
        None => {
            return Err(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Home directory not found.",
            ))
        }
    };

    let path = Path::new(filename);

    // パスがホームディレクトリからの相対パスであるかチェック
    if path.starts_with("~/") {
        // ホームディレクトリのパスに置換
        let without_tilde = path.strip_prefix("~/").expect("Cound not strip tilde.");
        Ok(home_dir.join(without_tilde))
    } else {
        // 通常のパス処理
        let current_dir = env::current_dir()?;
        Ok(current_dir.join(path))
    }
}
