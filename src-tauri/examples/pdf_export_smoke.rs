//! Windows上で実際のWebView2によるPDF生成を確認する結合テスト。
//! 実行例: cargo run --example pdf_export_smoke -- <準備済みHTMLのパス> <出力PDFのパス> <幅> <高さ>
#[cfg(windows)]
#[path = "../src/handler/pdf.rs"]
mod pdf;

#[cfg(windows)]
fn main() {
    use std::sync::{
        Arc,
        atomic::{AtomicI32, Ordering},
    };
    use tauri::Manager;

    let args: Vec<String> = std::env::args().collect();
    assert_eq!(
        args.len(),
        5,
        "Expected HTML path, PDF path, width and height"
    );
    let html = std::fs::read_to_string(&args[1]).expect("Read prepared slide HTML");
    let path = std::path::absolute(&args[2])
        .unwrap()
        .to_string_lossy()
        .into_owned();
    let width: f64 = args[3].parse().unwrap();
    let height: f64 = args[4].parse().unwrap();
    let mut context = tauri::generate_context!();
    for window in &mut context.config_mut().app.windows {
        window.visible = false;
        window.url = tauri::WebviewUrl::External("about:blank".parse().unwrap());
    }
    let exit_code = Arc::new(AtomicI32::new(1));
    let result_code = exit_code.clone();
    tauri::Builder::default()
        .setup(move |app| {
            let main = app.get_webview_window("main").unwrap();
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match pdf::export_slide_pdf(main, html, path, width, height).await {
                    Ok(()) => {
                        result_code.store(0, Ordering::Relaxed);
                        println!("PDF export completed");
                        handle.exit(0);
                    }
                    Err(error) => {
                        eprintln!("PDF export failed: {error}");
                        handle.exit(1);
                    }
                }
            });
            Ok(())
        })
        .build(context)
        .expect("Start PDF integration check")
        .run_return(|_, _| {});
    std::process::exit(exit_code.load(Ordering::Relaxed));
}

#[cfg(not(windows))]
fn main() {
    eprintln!("The PDF integration check requires Windows.");
    std::process::exit(1);
}
