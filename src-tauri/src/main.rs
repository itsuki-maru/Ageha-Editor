// Windows の release ビルドで余計なコンソールウィンドウを出さないための設定。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod init;
mod schema;

fn main() {
    let app_setup_path = init::get_application_user_setup_path();
    let default_env = init::read_or_create_json_env(app_setup_path);

    let args: Vec<String> = env::args().collect();
    let args_file_path = if args.len() > 1 {
        args[1].clone()
    } else {
        String::new()
    };

    let css_file_path = default_env.css_file_path.clone();
    let slide_css_file_path = default_env.slide_css_file_path.clone();

    unsafe {
        env::set_var("RUST_LOG", &default_env.rust_log);
    }

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_e| "ageha=error".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Launch args file: {}", &args_file_path);
    info!("Launch CSS file: {}", &css_file_path);
    info!("Launch slide CSS file: {}", &slide_css_file_path);

    ageha_lib::run(args_file_path, css_file_path, slide_css_file_path);
}
