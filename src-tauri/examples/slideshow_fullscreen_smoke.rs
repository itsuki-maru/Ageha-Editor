//! Windows上の実際のIPC権限とスライドショーの全画面操作を確認する結合テスト。
//! 実行例: cargo run --example slideshow_fullscreen_smoke -- <2ページ以上のスライドHTMLのasset URL>

#[cfg(windows)]
fn main() {
    use std::{
        sync::mpsc,
        time::{Duration, Instant},
    };
    use tauri::{WebviewUrl, WebviewWindow, WebviewWindowBuilder};
    use webview2_com::ExecuteScriptCompletedHandler;
    use windows::core::HSTRING;

    // WebView2の返り値を読み、実際の画面とIPCの完了を確認する。
    fn evaluate(viewer: &WebviewWindow, script: &str) -> serde_json::Value {
        let (tx, rx) = mpsc::channel();
        let script = HSTRING::from(script);
        viewer
            .with_webview(move |webview| unsafe {
                webview
                    .controller()
                    .CoreWebView2()
                    .unwrap()
                    .ExecuteScript(
                        &script,
                        &ExecuteScriptCompletedHandler::create(Box::new(move |status, value| {
                            let _ =
                                tx.send(status.map(|_| value).map_err(|error| error.to_string()));
                            Ok(())
                        })),
                    )
                    .unwrap();
            })
            .unwrap();
        let result = rx.recv_timeout(Duration::from_secs(3)).unwrap().unwrap();
        serde_json::from_str(&result).unwrap()
    }

    fn wait_until(mut condition: impl FnMut() -> bool) {
        let deadline = Instant::now() + Duration::from_secs(10);
        while !condition() {
            assert!(
                Instant::now() < deadline,
                "スライドの読み込みまたは全画面操作がタイムアウトしました"
            );
            std::thread::sleep(Duration::from_millis(50));
        }
    }

    let url = std::env::args()
        .nth(1)
        .expect("検証するスライドHTMLのasset URLが必要です");
    let mut context = tauri::generate_context!();
    for window in &mut context.config_mut().app.windows {
        window.visible = false;
        window.url = WebviewUrl::External("about:blank".parse().unwrap());
    }
    let exit_code = tauri::Builder::default().setup(move |app| {
        let handle = app.handle().clone();
        tauri::async_runtime::spawn_blocking(move || {
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let viewer = WebviewWindowBuilder::new(&handle, "viewer-fullscreen-smoke", WebviewUrl::External(url.parse().unwrap()))
                    .title("全画面操作の検証").visible(false).skip_taskbar(true).fullscreen(true).build().unwrap();
                let mut page = serde_json::Value::Null;
                let ready = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| wait_until(|| {
                    page = evaluate(&viewer, "({ href: location.href, ready: document.readyState, wrapper: !!document.getElementById('slideshow-wrapper'), body: document.body && document.body.textContent.slice(0, 200) })");
                    page["ready"] == "complete" && page["wrapper"] == true
                })));
                assert!(ready.is_ok(), "スライドの読み込みに失敗しました: {page}");
                assert!(viewer.is_fullscreen().unwrap());
                let counter = evaluate(&viewer, "document.getElementById('slide-counter').textContent");
                assert_ne!(counter, "1 / 1", "2ページ以上のスライドが必要です");

                // 既存のスライド処理をそのまま実行し、IPCの拒否も検出する。
                evaluate(&viewer, r#"(() => {
                    window.__fullscreenSmoke = { errors: [] };
                    const report = console.error;
                    console.error = function(error) {
                        window.__fullscreenSmoke.errors.push(String(error));
                        report.call(console, error);
                    };
                })()"#);
                for (key, fullscreen) in [
                    ("Escape", false),
                    ("F11", true),
                    ("F11", false),
                    ("F11", true),
                    ("Escape", false),
                ] {
                    evaluate(&viewer, &format!("document.dispatchEvent(new KeyboardEvent('keydown', {{ key: '{key}', bubbles: true, cancelable: true }}))"));
                    wait_until(|| {
                        let state = evaluate(&viewer, "window.__fullscreenSmoke");
                        assert_eq!(state["errors"], serde_json::json!([]), "全画面操作のIPCが拒否されました");
                        viewer.is_fullscreen().unwrap() == fullscreen
                    });
                    assert_eq!(evaluate(&viewer, "document.getElementById('slide-counter').textContent"), counter, "全画面操作でページが変わりました");
                    println!("{key}: fullscreen={fullscreen}, IPC完了");
                }
                evaluate(&viewer, "document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))");
                let next_counter = evaluate(&viewer, "document.getElementById('slide-counter').textContent");
                assert!(next_counter.as_str().unwrap().starts_with("2 / "), "ページ送りに失敗しました");
                let _ = viewer.destroy();
                println!("全画面操作とページ送りの検証に成功しました");
            }));
            handle.exit(if result.is_ok() { 0 } else { 1 });
        });
        Ok(())
    }).build(context).expect("全画面操作の検証アプリを起動できませんでした").run_return(|_, _| {});
    std::process::exit(exit_code);
}

#[cfg(not(windows))]
fn main() {
    eprintln!("この結合テストはWindows上で実行してください。");
    std::process::exit(1);
}
