// Windows の release ビルドで余計なコンソールウィンドウを出さないための設定。
// ここを削除すると配布時の見た目に影響するので残しておく。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod init;
mod schema;

// デスクトップ版アプリケーションの実行開始地点。
// 設定ファイル、ログ設定、起動引数を整えたあとで Tauri 本体へ処理を渡す。
fn main() {
    // 初期化処理（設定ディレクトリ/ファイルの作成）
    let app_setup_path = init::get_application_user_setup_path();
    let default_env = init::read_or_create_json_env(app_setup_path);

    // 引数の処理
    let args: Vec<String> = env::args().collect();
    // 先頭引数があれば起動時に開く対象ファイルとして採用する。
    let args_file_path = if args.len() > 1 {
        args[1].clone()
    } else {
        String::new()
    };

    // CSS の実パスは設定ファイルから取得し、run 関数へそのまま渡す。
    let css_file_path = default_env.css_file_path.clone();
    let slide_css_file_path = default_env.slide_css_file_path.clone();

    // ログ設定
    unsafe {
        env::set_var("RUST_LOG", &default_env.rust_log);
    }

    tracing_subscriber::registry()
        .with(
            // 環境変数が無ければ設定ファイル側の既定ログレベルを使う。
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_e| "ageha=error".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Launch args file: {}", &args_file_path);
    info!("Launch CSS file: {}", &css_file_path);
    info!("Launch slide CSS file: {}", &slide_css_file_path);

    // 準備が終わったら Tauri ランタイムの起動へ処理を引き渡す。
    ageha_lib::run(args_file_path, css_file_path, slide_css_file_path);
}
