use crate::config::AppConfig;
use crate::schema::{LaunchRequestData, ReadFileData, StatusCode};
use crate::utils::get_abs_filepath;
use base64::Engine;
use std::{
    fs,
    io::{self, BufWriter, Write},
    path::Path,
};

// フロントエンドから invoke されるファイル関連コマンド群。
// 起動データ取得、Markdown 読み込み、保存、画像の data URL 化をここで扱う。
#[tauri::command]
pub async fn request_launch_args(
    config: tauri::State<'_, AppConfig>,
) -> Result<LaunchRequestData, LaunchRequestData> {
    // 通常 Markdown 用 CSS とスライド用 CSS をまとめて返しておくことで、
    // フロントエンド側は起動直後から必要な見た目を組み立てられる。
    let css_data = fs::read_to_string(&config.css_file_path).map_err(|_| {
        LaunchRequestData::error("CSS file read error.", String::new(), String::new())
    })?;
    let slide_css_data = fs::read_to_string(&config.slide_css_file_path).map_err(|_| {
        LaunchRequestData::error("Slide CSS file read error.", css_data.clone(), String::new())
    })?;

    // ファイルパス取得
    // 起動引数で渡されたパスは相対表記の可能性があるため絶対パスへ正規化する。
    let target_file_abs = match get_abs_filepath(&config.args_file_path) {
        Ok(path) => path,
        Err(_) => {
            return Err(LaunchRequestData::error(
                "File absolute path get error.",
                css_data,
                slide_css_data,
            ));
        }
    };

    // 起動引数にファイルが付いていない状態は正常系なので、
    // ここではエラーにせず空データを返して新規文書扱いにする。
    let text_data = match fs::read_to_string(&target_file_abs) {
        Ok(file) => file,
        Err(_) => {
            return Ok(LaunchRequestData {
                status: StatusCode::error("Markdown file read error."),
                file_abs_path: String::new(),
                text_data: String::new(),
                css_data,
                slide_css_data,
            });
        }
    };

    // ここまで成功したら、起動直後に必要なデータ一式をまとめて返す。
    Ok(LaunchRequestData {
        status: StatusCode::ok("Read Ok."),
        file_abs_path: format!("{}", target_file_abs.to_string_lossy()),
        text_data,
        css_data,
        slide_css_data,
    })
}

#[tauri::command]
pub async fn read_file(target_file: &str) -> Result<ReadFileData, ReadFileData> {
    // フロントから指定されたパスを絶対パスへ直してから読む。
    let target_file_abs = get_abs_filepath(target_file)
        .map_err(|_| ReadFileData::error("File absolute path get error."))?;

    // テキストとして読めない場合は Markdown 読み込み失敗として返す。
    let text_data = fs::read_to_string(&target_file_abs)
        .map_err(|_| ReadFileData::error("Markdown file read error."))?;

    Ok(ReadFileData {
        status: StatusCode::ok("Read Ok."),
        file_abs_path: format!("{}", target_file_abs.to_string_lossy()),
        text_data,
    })
}

#[tauri::command]
pub async fn save_file(
    save_path: &str,
    markdown_text_data: String,
) -> Result<StatusCode, StatusCode> {
    // 書き込み処理本体は同期関数へ分け、ここでは Tauri コマンドの結果整形だけを行う。
    save_file_inner(save_path, &markdown_text_data)
        .map_err(|e| StatusCode::error(&format!("Save Error: {}", e)))
}

fn save_file_inner(save_path: &str, data: &str) -> io::Result<StatusCode> {
    // BufWriter を挟み、テキストをまとめてディスクへ書き出す。
    let file = fs::File::create(save_path)?;
    let mut writer = BufWriter::new(file);
    write!(writer, "{}", data)?;
    writer.flush()?;
    Ok(StatusCode::ok("Save Ok."))
}

#[tauri::command]
pub async fn read_binary_file_data_url(target_file: &str) -> Result<String, String> {
    // スライドプレビューや印刷用 HTML は srcdoc / 別ウィンドウで扱うため、
    // ローカル画像は data URL 化しておかないと参照切れしやすい。
    let target_file_abs =
        get_abs_filepath(target_file).map_err(|_| String::from("File absolute path get error."))?;
    // バイナリ本体を Base64 化し、ブラウザ側がそのまま使える data URL を返す。
    let bytes = fs::read(&target_file_abs).map_err(|_| String::from("Binary file read error."))?;
    let mime = guess_mime_type(&target_file_abs);
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{};base64,{}", mime, encoded))
}

fn guess_mime_type(path: &Path) -> &'static str {
    // 画像拡張子ごとに妥当な MIME を割り当て、data URL の先頭へ付与する。
    match path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("svg") => "image/svg+xml",
        Some("webp") => "image/webp",
        Some("bmp") => "image/bmp",
        Some("avif") => "image/avif",
        Some("ico") => "image/x-icon",
        _ => "application/octet-stream",
    }
}
