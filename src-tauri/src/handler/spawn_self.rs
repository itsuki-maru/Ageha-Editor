use std::{env, process};

#[tauri::command]
// 現在の実行ファイルをもう一度起動し、
// 新しいエディタウィンドウを開くためのコマンド。
pub async fn spawn_self(_args: Vec<String>) -> Result<(), String> {
    // 実行中のアプリ自身の実体パスを取得し、それを新しいプロセスとして起動する。
    let exe = env::current_exe().map_err(|e| e.to_string())?;
    let mut cmd = process::Command::new(exe);

    #[cfg(target_os = "windows")]
    {
        // コンソールを出さない
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    // 起動だけ行い、親プロセス側ではハンドルを保持しない。
    cmd.spawn().map(|_| ()).map_err(|e| e.to_string())
}
