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
// 起動データ取得・Markdown 読み込み・ファイル保存・ローカル画像 data URL 化
// の 4 機能をここで実装する。
// 実際のファイル I/O は Rust の標準ライブラリで行い、
// Tauri コマンドはリクエストの受け取りとレスポンスの整形のみを担う。

/// アプリ起動時にフロントエンドが一度だけ呼び出すコマンド。
/// 以下のデータをまとめて返すことで、起動シーケンス中の IPC 往復を最小化する:
///   - 起動引数で指定されたファイルの絶対パスと本文テキスト
///   - Markdown 用・スライド用の両 CSS ファイルの内容
///
/// CSS の読み込みに失敗した場合は LaunchRequestData::error として Err を返し、
/// ファイルが存在しない場合（引数なし起動）は Ok の空データを返す。
#[tauri::command]
pub async fn request_launch_args(
    config: tauri::State<'_, AppConfig>,
) -> Result<LaunchRequestData, LaunchRequestData> {
    // Markdown 用 CSS を読む。失敗時は即座にエラーレスポンスを返す。
    let css_data = fs::read_to_string(&config.css_file_path).map_err(|_| {
        LaunchRequestData::error("CSS file read error.", String::new(), String::new())
    })?;

    // スライド用 CSS を読む。CSS 取得済みなのでエラー時に渡せる。
    let slide_css_data = fs::read_to_string(&config.slide_css_file_path).map_err(|_| {
        LaunchRequestData::error(
            "Slide CSS file read error.",
            css_data.clone(),
            String::new(),
        )
    })?;

    // 起動引数のパスは相対表記の可能性があるため絶対パスへ正規化する。
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

    // 指定されたファイルを読む。
    // 引数なし起動では空文字列のパスが渡るため read_to_string が失敗するが、
    // これは正常系（新規文書扱い）なので Ok の空データを返す。
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

    // すべて成功した場合に起動直後に必要なデータ一式をまとめて返す。
    Ok(LaunchRequestData {
        status: StatusCode::ok("Read Ok."),
        file_abs_path: format!("{}", target_file_abs.to_string_lossy()),
        text_data,
        css_data,
        slide_css_data,
    })
}

/// 指定されたパスの Markdown（テキスト）ファイルを読み込んで返すコマンド。
/// ファイルを開くダイアログやドラッグ&ドロップから呼ばれる。
/// @param target_file - 読み込む対象ファイルのパス（相対パスも可）
#[tauri::command]
pub async fn read_file(target_file: &str) -> Result<ReadFileData, ReadFileData> {
    // フロントから受け取ったパスを絶対パスへ正規化する。
    let target_file_abs = get_abs_filepath(target_file)
        .map_err(|_| ReadFileData::error("File absolute path get error."))?;

    // テキストとして読めない場合（バイナリファイル等）はエラーを返す。
    let text_data = fs::read_to_string(&target_file_abs)
        .map_err(|_| ReadFileData::error("Markdown file read error."))?;

    Ok(ReadFileData {
        status: StatusCode::ok("Read Ok."),
        file_abs_path: format!("{}", target_file_abs.to_string_lossy()),
        text_data,
    })
}

/// 指定されたパスへテキストデータを保存するコマンド。
/// Markdown ファイルと HTML エクスポートの両方で使う汎用保存コマンド。
/// @param save_path         - 保存先のファイルパス
/// @param markdown_text_data - 保存するテキストデータ（UTF-8）
#[tauri::command]
pub async fn save_file(
    save_path: &str,
    markdown_text_data: String,
) -> Result<StatusCode, StatusCode> {
    // 実際の書き込みは同期関数に委譲し、ここでは Tauri コマンド用の型変換のみを行う。
    save_file_inner(save_path, &markdown_text_data)
        .map_err(|e| StatusCode::error(&format!("Save Error: {}", e)))
}

/// ファイルへテキストを書き込む実装関数。
/// BufWriter を使うことでシステムコールの回数を減らして効率よく書き込む。
fn save_file_inner(save_path: &str, data: &str) -> io::Result<StatusCode> {
    let file = fs::File::create(save_path)?;
    let mut writer = BufWriter::new(file);
    write!(writer, "{}", data)?;
    // flush() を明示的に呼んでバッファ内のデータを確実にディスクへ書き出す。
    writer.flush()?;
    Ok(StatusCode::ok("Save Ok."))
}

/// 指定されたローカル画像ファイルを Base64 エンコードして data URL として返すコマンド。
/// スライドや印刷用 HTML は srcdoc / 別ウィンドウで使うため、
/// ローカル画像を data URL 化しておかないと参照切れが起きやすい。
/// @param target_file - 変換する画像ファイルのパス
#[tauri::command]
pub async fn read_binary_file_data_url(target_file: &str) -> Result<String, String> {
    let target_file_abs =
        get_abs_filepath(target_file).map_err(|_| String::from("File absolute path get error."))?;
    // ファイルをバイナリとして読む（テキストデコードなし）。
    let bytes = fs::read(&target_file_abs).map_err(|_| String::from("Binary file read error."))?;
    // 画像の種類を拡張子から推定し、data URL のヘッダに使う MIME タイプを決める。
    let mime = guess_mime_type(&target_file_abs);
    // 標準 Base64 エンコード（STANDARD = + / = パディングあり）を使う。
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{};base64,{}", mime, encoded))
}

/// ファイルパスの拡張子から MIME タイプを推定して返す。
/// 対応外の拡張子は `application/octet-stream` を返し、
/// ブラウザが適切に処理できるようにする。
fn guess_mime_type(path: &Path) -> &'static str {
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
        // 対応外の形式。ブラウザは octet-stream をそのままバイナリとして扱う。
        _ => "application/octet-stream",
    }
}
