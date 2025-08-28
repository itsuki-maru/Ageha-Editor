use std::{
    process,
    env,
};

#[tauri::command]
pub async fn spawn_self(_args: Vec<String>) -> Result<(), String> {
    let exe = env::current_exe().map_err(|e| e.to_string())?;
    let mut cmd = process::Command::new(exe);

    #[cfg(target_os = "windows")]
    {
        // コンソールを出さない
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd.spawn().map(|_| ()).map_err(|e| e.to_string())
}