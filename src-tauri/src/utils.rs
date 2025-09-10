use std::{io, path, env};

// ファイルの絶対パスを取得する関数
pub fn get_abs_filepath(filename: &str) -> io::Result<path::PathBuf> {
    // ホームディレクトリを取得
    let home_dir = match dirs::home_dir() {
        Some(path) => path,
        None => {
            return Err(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Home directory not found.",
            ));
        }
    };

    let path = path::Path::new(filename);

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
