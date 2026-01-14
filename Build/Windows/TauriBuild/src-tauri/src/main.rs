#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{LogicalSize, Manager, Size};

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      if let Some(window) = app.get_window("main") {
        if let Ok(Some(monitor)) = window.primary_monitor() {
          let size = monitor.size();
          let width = (size.width as f64 * 0.7).round();
          let height = (size.height as f64 * 0.7).round();
          let _ = window.set_size(Size::Logical(LogicalSize {
            width,
            height,
          }));
          let _ = window.center();
        }
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
