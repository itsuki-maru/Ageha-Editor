use crate::config::AppConfig;
use crate::schema::{LaunchRequestData, ReadFileData, StatusCode};
use crate::utils::get_abs_filepath;
use base64::Engine;
use std::{
    fs,
    io::{self, BufWriter, Write},
    path::{Path, PathBuf},
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

/// HTML 文字列を `~/.ageha/viewer_<timestamp>.html` に書き出し、そのパスを返す。
/// フロントエンドが WebviewWindow でこのファイルを開き、
/// ウィンドウを閉じた後に `delete_file` でクリーンアップする。
#[tauri::command]
pub async fn save_temp_html(html: String) -> Result<String, String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "Home directory not found.".to_string())?;
    let ageha_dir = home_dir.join(".ageha");

    let ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let file_path = ageha_dir.join(format!("viewer_{}.html", ms));

    let file = fs::File::create(&file_path).map_err(|e| e.to_string())?;
    let mut writer = BufWriter::new(file);
    write!(writer, "{}", html).map_err(|e| e.to_string())?;
    writer.flush().map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().into_owned())
}

/// 指定されたパスのファイルを削除する。
/// `save_temp_html` で作成した一時ファイルのクリーンアップ用。
#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
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

/// Markdown 画像記法のパス入力中に表示する候補を返す。
/// ディレクトリは末尾に `/` を付け、画像ファイルと同じ候補リストで返す。
/// @param input_path - ユーザーが `![alt](...)` 内で入力しているパス
/// @param base_file_path - 現在編集中の Markdown ファイルパス（相対パス基準）
#[tauri::command]
pub async fn list_image_path_suggestions(
    input_path: String,
    base_file_path: String,
) -> Result<Vec<String>, String> {
    // 入力済みパスを「検索するディレクトリ部分」と「ファイル名の前方一致部分」に分ける。
    let (dir_part, name_prefix) = split_path_input(&input_path);
    let search_dir = resolve_image_suggestion_dir(&dir_part, &base_file_path)?;
    let prefix_lower = name_prefix.to_ascii_lowercase();
    // フォルダを先に、画像ファイルを後に並べるため、いったん別々に集める。
    let mut directories = Vec::new();
    let mut image_files = Vec::new();

    let entries = match fs::read_dir(&search_dir) {
        Ok(entries) => entries,
        // 存在しないディレクトリを入力中でも、補完は空で返して編集を止めない。
        Err(_) => return Ok(Vec::new()),
    };

    for entry in entries.flatten() {
        let file_type = match entry.file_type() {
            Ok(file_type) => file_type,
            Err(_) => continue,
        };
        let name = entry.file_name().to_string_lossy().into_owned();
        // 隠しファイルと、入力中のプレフィックスに一致しない候補は表示しない。
        if name.starts_with('.') || !name.to_ascii_lowercase().starts_with(&prefix_lower) {
            continue;
        }

        if file_type.is_dir() {
            // ディレクトリ候補は選択後も続けて入力できるよう、末尾に `/` を付ける。
            directories.push(format!("{}{}/", dir_part, name));
        } else if is_image_path(&entry.path()) {
            image_files.push(format!("{}{}", dir_part, name));
        }
    }

    directories.sort_by_key(|path| path.to_ascii_lowercase());
    image_files.sort_by_key(|path| path.to_ascii_lowercase());
    directories.extend(image_files);
    // 大きなディレクトリで補完ポップアップが重くならないよう候補数を制限する。
    directories.truncate(50);
    Ok(directories)
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

// ファイルパスを分割する。ディレクトリ部分とファイル名部分に分ける
fn split_path_input(input_path: &str) -> (String, String) {
    let normalized = input_path.replace('\\', "/");
    match normalized.rfind('/') {
        Some(index) => (
            normalized[..=index].to_string(),
            normalized[index + 1..].to_string(),
        ),
        None => (String::new(), normalized),
    }
}

// 画像の補完候補ディレクトリを解決する
fn resolve_image_suggestion_dir(dir_part: &str, base_file_path: &str) -> Result<PathBuf, String> {
    // `/` 始まりの入力は、補完では Markdown ファイルからの相対パスとして扱う。
    let normalized_dir_part = normalize_relative_image_dir_part(dir_part);
    let dir_path = Path::new(&normalized_dir_part);
    if dir_path.is_absolute() {
        // Windows の `C:\...` など、明示的な絶対パスはそのまま検索対象にする。
        return Ok(dir_path.to_path_buf());
    }

    let base_dir = if base_file_path.is_empty() {
        // 未保存ファイルでは基準ファイルが無いため、アプリのカレントディレクトリを使う。
        std::env::current_dir().map_err(|e| e.to_string())?
    } else {
        // 保存済み Markdown の親ディレクトリを相対画像パスの基準にする。
        get_abs_filepath(base_file_path)
            .map_err(|e| e.to_string())?
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_default())
    };

    Ok(base_dir.join(dir_path))
}

// 画像の相対パスを正規化する。`![alt](/` は OS ルートではなく、現在ファイル基準のルート候補として扱う
fn normalize_relative_image_dir_part(dir_part: &str) -> String {
    // `![alt](/` は OS ルートではなく、現在ファイル基準のルート候補として扱う。
    if dir_part == "/" {
        return String::from("./");
    }

    // `/images/` のような入力も `./images/` と同じ検索先に正規化する
    if dir_part.starts_with('/') && !dir_part.starts_with("//") {
        return format!(".{}", dir_part);
    }

    dir_part.to_string()
}

// 画像ファイルかどうかを判定する。プレビューや埋め込み処理で扱える代表的な画像拡張子だけを候補に出す
fn is_image_path(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.to_ascii_lowercase())
            .as_deref(),
        Some("png" | "jpg" | "jpeg" | "svg" | "webp" | "gif" | "bmp" | "avif" | "ico")
    )
}

#[cfg(test)]
mod tests {
    use super::{
        guess_mime_type, is_image_path, normalize_relative_image_dir_part, save_file_inner,
        split_path_input,
    };
    use std::{
        fs,
        path::{Path, PathBuf},
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn splits_path_input_into_directory_and_prefix() {
        assert_eq!(
            split_path_input("images/icons/ag"),
            (String::from("images/icons/"), String::from("ag"))
        );
        assert_eq!(
            split_path_input("images\\ag"),
            (String::from("images/"), String::from("ag"))
        );
        assert_eq!(
            split_path_input("ag"),
            (String::new(), String::from("ag"))
        );
    }

    #[test]
    fn normalizes_root_relative_image_directory_as_document_relative() {
        assert_eq!(normalize_relative_image_dir_part("/"), "./");
        assert_eq!(normalize_relative_image_dir_part("/images/"), "./images/");
        assert_eq!(normalize_relative_image_dir_part("//server/share/"), "//server/share/");
        assert_eq!(normalize_relative_image_dir_part("images/"), "images/");
    }

    #[test]
    fn guesses_supported_image_mime_types_case_insensitively() {
        assert_eq!(guess_mime_type(Path::new("sample.PNG")), "image/png");
        assert_eq!(guess_mime_type(Path::new("sample.jpeg")), "image/jpeg");
        assert_eq!(guess_mime_type(Path::new("sample.svg")), "image/svg+xml");
        assert_eq!(
            guess_mime_type(Path::new("sample.txt")),
            "application/octet-stream"
        );
    }

    #[test]
    fn detects_supported_image_paths() {
        assert!(is_image_path(Path::new("photo.WEBP")));
        assert!(is_image_path(Path::new("icon.ico")));
        assert!(!is_image_path(Path::new("document.md")));
    }

    #[test]
    fn saves_file_contents() {
        let path = unique_temp_file_path();

        let status = save_file_inner(&path.to_string_lossy(), "hello ageha")
            .expect("file should be saved");

        assert_eq!(status.status_code, 200);
        assert_eq!(status.message, "Save Ok.");
        assert_eq!(
            fs::read_to_string(&path).expect("saved file should be readable"),
            "hello ageha"
        );

        let _ = fs::remove_file(path);
    }

    fn unique_temp_file_path() -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("ageha-file-test-{}.md", nanos))
    }
}
