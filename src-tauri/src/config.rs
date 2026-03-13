/// アプリ起動時に確定した設定パスを Tauri の managed state として保持する構造体。
/// フロントエンドから invoke されるすべてのコマンドは、
/// `tauri::State<'_, AppConfig>` を引数に取ることでここからパスを参照できる。
///
/// 各フィールドは main.rs の起動シーケンスで設定ファイルを読んだあと確定し、
/// 以後はアプリ終了まで変更されない（実質的に不変の設定値）。
pub struct AppConfig {
    /// コマンドライン引数で渡された「起動時に開くファイル」の絶対パス。
    /// 引数なしで起動した場合は空文字列が入り、新規文書として扱われる。
    pub args_file_path: String,

    /// `~/.ageha/ageha.css` の絶対パス。
    /// Markdown プレビュー・エクスポート・印刷に適用されるユーザー CSS のパス。
    pub css_file_path: String,

    /// `~/.ageha/ageha-slide.css` の絶対パス。
    /// スライドプレビュー・エクスポート・印刷に適用されるユーザー CSS のパス。
    pub slide_css_file_path: String,
}
