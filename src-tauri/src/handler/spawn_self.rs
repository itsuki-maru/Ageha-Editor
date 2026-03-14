use std::{env, process};

/// 現在の実行ファイル自身を新しいプロセスとして起動する Tauri コマンド。
/// フロントエンドの「新規ウィンドウ」ボタン（Ctrl+Alt+N）から呼ばれる。
///
/// 設計方針:
/// - 実行ファイルのパスを `env::current_exe()` で動的に取得するため、
///   インストール先が変わっても正しく動作する。
/// - 子プロセスのハンドルは保持しない（spawn して親は忘れる）。
///   子ウィンドウのライフサイクルは子プロセス自身が管理する。
/// - Windows のリリースビルドでは `CREATE_NO_WINDOW` フラグを付与し、
///   余計なコンソールウィンドウが出ないようにする。
#[tauri::command]
pub async fn spawn_self(_args: Vec<String>) -> Result<(), String> {
    // 実行中の自分自身の実体パスを取得する。
    let exe = env::current_exe().map_err(|e| e.to_string())?;
    let mut cmd = process::Command::new(exe);

    #[cfg(target_os = "windows")]
    {
        // Windows では `CREATE_NO_WINDOW` フラグを立て、コンソールウィンドウを非表示にする。
        // このフラグがないと、リリースビルドでも一瞬コンソールが出ることがある。
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    // プロセスを起動し、ハンドルを破棄する（`_` で受けて即ドロップ）。
    // 親がハンドルを保持しないため、新しいウィンドウは独立して動作する。
    cmd.spawn().map(|_| ()).map_err(|e| e.to_string())
}
