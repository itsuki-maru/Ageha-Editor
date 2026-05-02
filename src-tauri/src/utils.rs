use std::{env, io, path};

// コマンドライン引数やフロントエンドから渡されたファイルパスを
// Rust 側で扱いやすい絶対パスへ正規化するユーティリティ。

/// 任意のファイルパス文字列を絶対パスへ変換して返す。
///
/// 変換ルール:
/// - `~/` で始まる場合: ホームディレクトリに展開する（例: `~/.ageha/foo.css` → `/home/user/.ageha/foo.css`）
/// - 相対パスの場合: `env::current_dir()` を基準に絶対パスへ変換する
/// - 既に絶対パスの場合: そのまま PathBuf へ変換する（`current_dir` を基準にしても絶対パスが返る）
///
/// # Errors
/// ホームディレクトリが取得できない場合や、カレントディレクトリが取得できない場合にエラーを返す。
pub fn get_abs_filepath(filename: &str) -> io::Result<path::PathBuf> {
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

    if path.starts_with("~/") {
        // `~/` プレフィックスをホームディレクトリのパスで置換する。
        // フロントエンドや設定ファイルから `~/` 表記が渡ることを想定している。
        let without_tilde = path.strip_prefix("~/").expect("Could not strip tilde.");
        Ok(home_dir.join(without_tilde))
    } else {
        // 相対パス・絶対パスどちらも current_dir().join() で一元処理する。
        // 絶対パスを join() に渡すと current_dir は無視され、絶対パスがそのまま返る。
        let current_dir = env::current_dir()?;
        Ok(current_dir.join(path))
    }
}

#[cfg(test)]
mod tests {
    use super::get_abs_filepath;
    use std::{env, path::PathBuf};

    #[test]
    fn expands_home_directory_prefix() {
        let actual = get_abs_filepath("~/ageha-test.md").expect("path should resolve");
        let expected = dirs::home_dir()
            .expect("home directory should exist")
            .join("ageha-test.md");

        assert_eq!(actual, expected);
    }

    #[test]
    fn resolves_relative_path_from_current_directory() {
        let current_dir = env::current_dir().expect("current dir should resolve");

        let actual = get_abs_filepath("docs/note.md").expect("path should resolve");

        assert_eq!(actual, current_dir.join("docs/note.md"));
    }

    #[test]
    fn keeps_absolute_path_absolute() {
        let absolute = env::current_dir()
            .expect("current dir should resolve")
            .join("docs")
            .join("note.md");

        let actual = get_abs_filepath(&absolute.to_string_lossy()).expect("path should resolve");

        assert_eq!(actual, PathBuf::from(absolute));
    }
}
