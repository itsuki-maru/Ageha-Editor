fn main() {
    tauri_build::build();
    // The WebView2 smoke example also needs Tauri's Common Controls v6 manifest.
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        let output = std::env::var("OUT_DIR").expect("Cargo output directory");
        println!("cargo:rustc-link-arg-examples={output}/resource.lib");
    }
}
