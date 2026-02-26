use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                // Wait a bit for the frontend to be ready
                std::thread::sleep(std::time::Duration::from_millis(500));

                // Read args
                let args: Vec<String> = std::env::args().collect();

                // If the user provided a file argument (args[0] is the executable)
                if args.len() > 1 {
                    let file_path = &args[1];
                    let _ = handle.emit("open-file", file_path);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
