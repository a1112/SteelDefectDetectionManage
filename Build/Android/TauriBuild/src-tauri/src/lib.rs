#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#[cfg(not(mobile))]
use tauri::Manager;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(mobile)]
            {
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    window.show()?;
                }
            }

            #[cfg(not(mobile))]
            if let Some(window) = app.get_webview_window("main") {
                startup_geometry::install(&window, (1120.0, 720.0), (840.0, 560.0), false)?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(not(mobile))]
mod startup_geometry;
