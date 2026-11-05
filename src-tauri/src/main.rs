#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::{LogicalSize, Size, State, WebviewWindow};

#[derive(Default)]
struct SavedWindowSize(Mutex<Option<(f64, f64)>>);

#[tauri::command]
fn set_mini_mode(
    mini: bool,
    window: WebviewWindow,
    saved_size: State<'_, SavedWindowSize>,
) -> Result<(), String> {
    if mini {
        let mut saved = saved_size.0.lock().map_err(|error| error.to_string())?;
        if saved.is_none() {
            let size = window.inner_size().map_err(|error| error.to_string())?;
            let scale = window.scale_factor().map_err(|error| error.to_string())?;
            *saved = Some((size.width as f64 / scale, size.height as f64 / scale));
        }

        window
            .set_min_size(Some(Size::Logical(LogicalSize::new(350.0, 280.0))))
            .map_err(|error| error.to_string())?;
        window
            .set_resizable(false)
            .map_err(|error| error.to_string())?;
        window
            .set_size(Size::Logical(LogicalSize::new(430.0, 330.0)))
            .map_err(|error| error.to_string())?;
        window
            .set_always_on_top(true)
            .map_err(|error| error.to_string())?;
    } else {
        window
            .set_always_on_top(false)
            .map_err(|error| error.to_string())?;
        window
            .set_resizable(true)
            .map_err(|error| error.to_string())?;
        window
            .set_min_size(Some(Size::Logical(LogicalSize::new(600.0, 540.0))))
            .map_err(|error| error.to_string())?;

        let size = saved_size
            .0
            .lock()
            .map_err(|error| error.to_string())?
            .take()
            .unwrap_or((960.0, 740.0));
        window
            .set_size(Size::Logical(LogicalSize::new(size.0, size.1)))
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(SavedWindowSize::default())
        .invoke_handler(tauri::generate_handler![set_mini_mode])
        .run(tauri::generate_context!())
        .expect("failed to start Work Cheer");
}
