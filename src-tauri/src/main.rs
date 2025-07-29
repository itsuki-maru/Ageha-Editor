// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
mod config;
mod utils;
mod schema;

fn main() {
    // 初期化処理
    let args: Vec<String> = env::args().collect();
    if args.len() > 1 {
        let file_path = &args[1];
        unsafe {
            env::set_var("LAUNCH_ARGS_FILE_PATH", file_path);
        }
    } else {
        unsafe {
            env::set_var("LAUNCH_ARGS_FILE_PATH", "".to_string());
        }
    }
    ageha_lib::run()
}
