use crate::utils::get_abs_filepath;
use anyhow::{Context, Result, bail};
use serde::Serialize;
use serde_json::Value;
use std::{
    fs,
    io::{self, Write},
    path::Path,
    sync::{Mutex, mpsc},
    time::Duration,
};
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};

#[derive(Serialize)]
struct ExportInput {
    file_abs_path: String,
    text_data: String,
    css_data: String,
    slide_css_data: String,
    saved_settings: Option<Value>,
}

struct ExportJob {
    input: Mutex<Option<ExportInput>>,
    sender: mpsc::SyncSender<Result<String, String>>,
}

#[tauri::command]
fn md2html_input(job: State<'_, ExportJob>) -> Result<ExportInput, String> {
    job.input
        .lock()
        .map_err(|error| error.to_string())?
        .take()
        .ok_or_else(|| "The export input has already been loaded.".into())
}

#[tauri::command]
fn md2html_result(job: State<'_, ExportJob>, result: Result<String, String>) -> Result<(), String> {
    job.sender
        .try_send(result)
        .map_err(|error| error.to_string())
}

pub fn export_html(input: &Path, output: &Path, css: String, slide_css: String) -> Result<()> {
    let input = get_abs_filepath(input).context("resolve input path")?;
    let output = get_abs_filepath(output).context("resolve output path")?;
    let source = same_file::Handle::from_path(&input)
        .with_context(|| format!("open input {}", input.display()))?;
    ensure_distinct(&source, &output)?;
    let text_data = read_text(&input)?;
    if text_data.is_empty() {
        bail!("the input Markdown file is empty");
    }
    let file_abs_path = input
        .to_str()
        .context("the input path is not valid UTF-8")?
        .to_owned();
    let mut data = ExportInput {
        file_abs_path,
        text_data,
        css_data: css,
        slide_css_data: slide_css,
        saved_settings: None,
    };

    let mut context = crate::app_context();
    context.config_mut().app.windows.clear();
    let (sender, receiver) = mpsc::sync_channel(1);
    let (outcome, result) = mpsc::sync_channel(1);
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            md2html_input,
            md2html_result,
            crate::handler::file::read_binary_file_data_url,
        ])
        .setup(move |app| {
            data.saved_settings = read_saved_settings(app.handle());
            app.manage(ExportJob {
                input: Mutex::new(Some(data)),
                sender,
            });
            let window =
                WebviewWindowBuilder::new(app, "md2html", WebviewUrl::App("md2html.html".into()))
                    .visible(false)
                    .skip_taskbar(true)
                    .build()
                    .map(|_| ())
                    .context("create the hidden WebView");
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let rendered = window.and_then(|()| {
                    receiver
                        .recv_timeout(Duration::from_secs(60))
                        .context("waiting for the HTML renderer")
                        .and_then(|result| result.map_err(anyhow::Error::msg))
                });
                let _ = outcome.send(rendered);
                if let Some(window) = handle.get_webview_window("md2html") {
                    let _ = window.destroy();
                }
                handle.exit(0);
            });
            Ok(())
        })
        .build(context)
        .context("start the HTML renderer")?
        .run_return(|_, _| {});

    let html = result
        .try_recv()
        .context("the HTML renderer exited early")??;
    write_html(&source, &output, &html).with_context(|| format!("save output {}", output.display()))
}

fn read_text(path: &Path) -> Result<String> {
    fs::read_to_string(path).with_context(|| format!("read {}", path.display()))
}

fn read_saved_settings(app: &AppHandle) -> Option<Value> {
    // ストアプラグインは終了時に読み込んだ設定を保存するため、
    // 設定ファイルを直接読み込み、変換処理によるエディタ設定の上書きを防ぐ。
    let path = tauri_plugin_store::resolve_store_path(app, "settings.json").ok()?;
    let settings: Value = serde_json::from_slice(&fs::read(path).ok()?).ok()?;
    settings.get("localState@v1").cloned()
}

fn ensure_distinct(input: &same_file::Handle, output: &Path) -> Result<()> {
    match same_file::Handle::from_path(output) {
        Ok(target) if input == &target => bail!("input and output refer to the same file"),
        Ok(_) => Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error).with_context(|| format!("open output {}", output.display())),
    }
}

fn write_html(input: &same_file::Handle, output: &Path, html: &str) -> Result<()> {
    let directory = output
        .parent()
        .context("output path has no parent directory")?;
    let mut file = tempfile::NamedTempFile::new_in(directory)?;
    file.write_all(html.as_bytes())?;
    file.flush()?;
    ensure_distinct(input, output)?;
    file.persist(output)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn protects_the_input_even_if_the_output_is_a_hard_link() -> Result<()> {
        let directory = tempfile::tempdir()?;
        let input = directory.path().join("input.md");
        let output = directory.path().join("output.html");
        fs::write(&input, "# Source")?;
        fs::hard_link(&input, &output)?;
        let source = same_file::Handle::from_path(&input)?;

        assert!(write_html(&source, &output, "<h1>Export</h1>").is_err());
        assert_eq!(fs::read_to_string(&input)?, "# Source");
        assert_eq!(fs::read_to_string(&output)?, "# Source");
        Ok(())
    }
}
