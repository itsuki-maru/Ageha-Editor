use tauri::{Emitter, Manager};
use std::{fs, io::{BufWriter, Write}, env};
mod schema;
mod utils;
use schema::{StatusCode, ReadFileData, ArgsReadFileData};

#[tauri::command]
async fn read_file(target_file: &str) -> Result<ReadFileData, ReadFileData> {
    // 対象ファイルの絶対パスを取得
    let target_file_abs = match utils::get_abs_filepath(target_file) {
        Ok(path) => path,
        Err(_) => return Err(
            ReadFileData {
                status: {
                    StatusCode { status_code: 500, message: "File absolute path get error.".to_string() }
                },
                text_data: "".to_string(),
            }
        )
    };

    let text_data = match fs::read_to_string(target_file_abs) {
        Ok(file) => file,
        Err(_) => return Err(
            ReadFileData {
                status: {
                    StatusCode { status_code: 500, message: "Markdown file read error.".to_string() }
                },
                text_data: "".to_string(),
            }
        )
    };

    Ok(ReadFileData {
        status: StatusCode { status_code: 200, message: "Read Ok.".to_string() },
        text_data: text_data,
    })
}

fn read_file_sync(target_file: &str) -> Result<ReadFileData, ReadFileData> {
    // 対象ファイルの絶対パスを取得
    let target_file_abs = match utils::get_abs_filepath(target_file) {
        Ok(path) => path,
        Err(_) => return Err(
            ReadFileData {
                status: {
                    StatusCode { status_code: 500, message: "File absolute path get error.".to_string() }
                },
                text_data: "".to_string(),
            }
        )
    };

    let text_data = match fs::read_to_string(target_file_abs) {
        Ok(file) => file,
        Err(_) => return Err(
            ReadFileData {
                status: {
                    StatusCode { status_code: 500, message: "Markdown file read error.".to_string() }
                },
                text_data: "".to_string(),
            }
        )
    };

    Ok(ReadFileData {
        status: StatusCode { status_code: 200, message: "Read Ok.".to_string() },
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
            }
            let args: Vec<String> = env::args().collect();
            if args.len() > 1 {
                let file_path = &args[1];
                let result = read_file_sync(&file_path);
                match result {
                    Ok(result) => {
                        let file_data: ArgsReadFileData = ArgsReadFileData {
                            file_path: file_path.to_string(),
                            file_data: result.text_data
                        };
                        app.emit("open-file", file_data)?; 
                    },
                    Err(_e) => {
                        
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![read_file, save_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
