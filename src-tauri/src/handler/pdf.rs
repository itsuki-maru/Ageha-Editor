#[cfg(windows)]
use tauri::Manager;
use tauri::WebviewWindow;

/// Windowsのプリンタードライバーを介さず、ChromiumのPDF生成機能で出力する。
#[tauri::command]
pub async fn export_slide_pdf(
    window: WebviewWindow,
    html: String,
    path: String,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("PDF export is only available from the editor.".into());
    }
    validate_pdf_target(&path, width, height)?;
    #[cfg(windows)]
    {
        let app = window.app_handle().clone();
        tauri::async_runtime::spawn_blocking(move || {
            native::export(&app, &html, &path, width, height)
        })
        .await
        .map_err(|error| error.to_string())?
    }
    #[cfg(not(windows))]
    {
        let _ = html;
        Err("Direct PDF export currently requires Windows. Use Print on this platform.".into())
    }
}

fn validate_pdf_target(path: &str, width: f64, height: f64) -> Result<(), String> {
    let path = std::path::Path::new(path);
    if !path.is_absolute()
        || !path
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("pdf"))
        || !width.is_finite()
        || !height.is_finite()
        || !(1.0..=19200.0).contains(&width)
        || !(1.0..=19200.0).contains(&height)
    {
        return Err("Invalid PDF path or slide dimensions.".into());
    }
    Ok(())
}

#[cfg(windows)]
mod native {
    use std::{
        fs,
        sync::{
            atomic::{AtomicU64, Ordering},
            mpsc,
        },
        time::{Duration, Instant},
    };
    use tauri::{AppHandle, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
    use webview2_com::{
        ExecuteScriptCompletedHandler,
        Microsoft::Web::WebView2::Win32::{
            ICoreWebView2_2, ICoreWebView2_7, ICoreWebView2Environment6,
        },
        PrintToPdfCompletedHandler,
    };
    use windows::core::{HSTRING, Interface};

    static NEXT_EXPORT: AtomicU64 = AtomicU64::new(0);

    pub fn export(
        app: &AppHandle,
        html: &str,
        path: &str,
        width: f64,
        height: f64,
    ) -> Result<(), String> {
        let id = NEXT_EXPORT.fetch_add(1, Ordering::Relaxed);
        let label = format!("pdf-export-{}-{id}", std::process::id());
        let html_path = std::env::temp_dir().join(format!("ageha-{label}.html"));
        let pdf_path = std::path::Path::new(path).with_file_name(format!(".ageha-{label}.pdf"));
        fs::write(&html_path, html).map_err(|error| error.to_string())?;
        let result = (|| {
            let url = tauri::Url::from_file_path(&html_path)
                .map_err(|_| "Invalid temporary HTML path.")?;
            let viewer = WebviewWindowBuilder::new(app, &label, WebviewUrl::External(url))
                .title("PDF export")
                .visible(false)
                .skip_taskbar(true)
                .inner_size(width, height)
                .build()
                .map_err(|error| error.to_string())?;
            let result = (|| {
                wait_for_assets(&viewer)?;
                print(&viewer, &pdf_path.to_string_lossy(), width, height)?;
                // PDFの生成が完了してから、指定された保存先のファイルを置き換える。
                fs::rename(&pdf_path, path).map_err(|error| error.to_string())?;
                Ok(())
            })();
            let _ = viewer.destroy();
            result
        })();
        let _ = fs::remove_file(html_path);
        let _ = fs::remove_file(pdf_path);
        result
    }

    fn wait_for_assets(viewer: &WebviewWindow) -> Result<(), String> {
        let deadline = Instant::now() + Duration::from_secs(30);
        while Instant::now() < deadline {
            let (tx, rx) = mpsc::channel();
            viewer
                .with_webview(move |webview| unsafe {
                    let failure = tx.clone();
                    let result = (|| {
                        let core = webview.controller().CoreWebView2()?;
                        core.ExecuteScript(
                            &HSTRING::from("window.__agehaPdfState || 'loading'"),
                            &ExecuteScriptCompletedHandler::create(Box::new(
                                move |status, state| {
                                    let _ = tx.send(
                                        status.map(|_| state).map_err(|error| error.to_string()),
                                    );
                                    Ok(())
                                },
                            )),
                        )
                    })();
                    if let Err(error) = result {
                        let _ = failure.send(Err(error.to_string()));
                    }
                })
                .map_err(|error| error.to_string())?;
            let state = rx
                .recv_timeout(deadline.saturating_duration_since(Instant::now()))
                .map_err(|_| "Timed out waiting for slide assets.")??;
            match state.as_str() {
                "\"ready\"" => return Ok(()),
                "\"error\"" => return Err("A slide image or font could not be loaded.".into()),
                _ => std::thread::sleep(Duration::from_millis(100)),
            }
        }
        Err("Timed out waiting for slide assets.".into())
    }

    fn print(viewer: &WebviewWindow, path: &str, width: f64, height: f64) -> Result<(), String> {
        let (tx, rx) = mpsc::channel();
        let path = path.to_owned();
        viewer
            .with_webview(move |webview| unsafe {
                let failure = tx.clone();
                let result = (|| {
                    let base = webview.controller().CoreWebView2()?;
                    let core: ICoreWebView2_7 = base.cast()?;
                    let core2: ICoreWebView2_2 = base.cast()?;
                    let environment: ICoreWebView2Environment6 = core2.Environment()?.cast()?;
                    let settings = environment.CreatePrintSettings()?;
                    // WebView2はインチ単位で指定するため、MarpのCSSピクセル（96 dpi）から変換する。
                    settings.SetPageWidth(width / 96.0)?;
                    settings.SetPageHeight(height / 96.0)?;
                    settings.SetMarginTop(0.0)?;
                    settings.SetMarginBottom(0.0)?;
                    settings.SetMarginLeft(0.0)?;
                    settings.SetMarginRight(0.0)?;
                    settings.SetScaleFactor(1.0)?;
                    settings.SetShouldPrintBackgrounds(true)?;
                    settings.SetShouldPrintHeaderAndFooter(false)?;
                    core.PrintToPdf(
                        &HSTRING::from(path),
                        &settings,
                        &PrintToPdfCompletedHandler::create(Box::new(move |status, success| {
                            let result = status.map_err(|error| error.to_string()).and_then(|_| {
                                if success {
                                    Ok(())
                                } else {
                                    Err("PDF rendering failed.".into())
                                }
                            });
                            let _ = tx.send(result);
                            Ok(())
                        })),
                    )
                })();
                if let Err(error) = result {
                    let _ = failure.send(Err(error.to_string()));
                }
            })
            .map_err(|error| error.to_string())?;
        rx.recv_timeout(Duration::from_secs(120))
            .map_err(|_| "PDF export timed out.")?
    }
}

#[cfg(test)]
mod tests {
    use super::validate_pdf_target;

    #[test]
    fn rejects_invalid_dimensions_and_targets() {
        let path = std::env::temp_dir().join("slides.pdf");
        let path = path.to_str().unwrap();
        assert!(validate_pdf_target(path, 1280.0, 720.0).is_ok());
        for width in [0.0, -1.0, f64::NAN, f64::INFINITY, 19201.0] {
            assert!(validate_pdf_target(path, width, 720.0).is_err());
        }
        assert!(validate_pdf_target("relative.pdf", 1280.0, 720.0).is_err());
        assert!(validate_pdf_target(&path.replace(".pdf", ".html"), 1280.0, 720.0).is_err());
    }
}
