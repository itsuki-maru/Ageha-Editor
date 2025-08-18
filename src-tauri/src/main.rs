// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::config::CONFIG;
mod config;
mod schema;

fn main() {
    // 初期化処理（引数の取得と環境変数の設定）
    unsafe {
        env::set_var("RUST_LOG", "ageha=error".to_string());
    } // info, debug, error 開発時は適宜変更

    // 引数の処理
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

    // ログ設定
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_e| "ageha=error".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Launch args file: {}", &CONFIG.args_file_path);

    ageha_lib::run()
}
