/// 起動時に確定したパスを保持する Tauri の共有状態。
pub struct AppConfig {
    /// コマンドライン引数で渡された「起動時に開くファイル」の絶対パス。
    /// 引数なしで起動した場合は空文字列が入り、新規文書として扱われる。
    pub args_file_path: String,

    /// Markdown プレビュー・エクスポート・印刷に適用されるユーザー CSS のパス。
    pub css_file_path: String,

    /// スライドプレビュー・エクスポート・印刷に適用されるユーザー CSS のパス。
    pub slide_css_file_path: String,
}
