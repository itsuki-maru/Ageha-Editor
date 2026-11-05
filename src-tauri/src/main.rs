// Windows の release ビルドで余計なコンソールウィンドウを出さないための設定。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clap::{Parser, Subcommand};
use std::{env, path::PathBuf, process::ExitCode};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod init;
mod schema;

#[derive(Parser)]
#[command(name = "ageha", version, args_conflicts_with_subcommands = true)]
struct Args {
    /// Markdown ファイルをエディタで開きます。
    #[arg(value_name = "FILE")]
    file: Option<PathBuf>,

    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Subcommand)]
enum Command {
    /// Markdown または Marp スライドを HTML に出力します。
    Md2html {
        #[arg(short, long, value_name = "FILE")]
        input: PathBuf,
        #[arg(short, long, value_name = "FILE")]
        output: PathBuf,
    },
}

fn main() -> ExitCode {
    let args = match Args::try_parse() {
        Ok(args) => args,
        Err(error) => {
            attach_console();
            error.exit();
        }
    };

    if let Some(Command::Md2html { input, output }) = args.command {
        attach_console();
        let result = init::read_export_styles()
            .and_then(|(css, slide_css)| ageha_lib::export_html(&input, &output, css, slide_css));
        return match result {
            Ok(()) => ExitCode::SUCCESS,
            Err(error) => {
                eprintln!("ageha md2html: {error:#}");
                ExitCode::FAILURE
            }
        };
    }

    let app_setup_path = init::get_application_user_setup_path();
    let default_env = init::read_or_create_json_env(app_setup_path);
    let args_file_path = args.file.unwrap_or_default().to_string_lossy().into_owned();
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
    ExitCode::SUCCESS
}

fn attach_console() {
    #[cfg(all(windows, not(debug_assertions)))]
    unsafe {
        use windows::Win32::System::Console::{
            ATTACH_PARENT_PROCESS, AttachConsole, GetStdHandle, STD_ERROR_HANDLE,
            STD_OUTPUT_HANDLE, SetStdHandle,
        };
        // コンソールへの接続でリダイレクト先のハンドルが置き換わる場合があるため、
        // 接続前にランチャーから継承したパイプやファイルのハンドルを保存する。
        let handles = [STD_OUTPUT_HANDLE, STD_ERROR_HANDLE].map(|kind| (kind, GetStdHandle(kind)));
        let _ = AttachConsole(ATTACH_PARENT_PROCESS);
        for (kind, handle) in handles {
            if let Ok(handle) = handle
                && !handle.is_invalid()
            {
                let _ = SetStdHandle(kind, handle);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_export_and_existing_editor_launches() {
        assert!(Args::try_parse_from(["ageha"]).unwrap().command.is_none());
        assert_eq!(
            Args::try_parse_from(["ageha", "日本 語.md"]).unwrap().file,
            Some(PathBuf::from("日本 語.md"))
        );
        let args = Args::try_parse_from(["ageha", "md2html", "-i", "日本 語.md", "-o", "out.html"])
            .unwrap();
        assert!(
            matches!(args.command, Some(Command::Md2html { input, output })
            if input == PathBuf::from("日本 語.md") && output == PathBuf::from("out.html"))
        );
        assert!(Args::try_parse_from(["ageha", "md2html", "-i", "note.md"]).is_err());
    }
}
