#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(not(mobile))]
use tauri::{LogicalSize, Manager, Size};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      #[cfg(not(mobile))]
      {
        if let Some(window) = app.get_webview_window("main") {
          if let Ok(Some(monitor)) = window.primary_monitor() {
            let size = monitor.size();
            let width = (size.width as f64 * 0.7).round();
            let height = (size.height as f64 * 0.7).round();
            let _ = window.set_size(Size::Logical(LogicalSize { width, height }));
            let _ = window.center();
          }
        }
      }
      #[cfg(mobile)]
      {
        let _ = app;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
