use std::{env, io, path};

/// `~/` はホームへ展開し、相対パスはカレントディレクトリ基準で絶対パスにする。
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
        let without_tilde = path.strip_prefix("~/").expect("Could not strip tilde.");
        Ok(home_dir.join(without_tilde))
    } else {
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
