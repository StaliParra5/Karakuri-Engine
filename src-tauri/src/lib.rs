use std::fs;
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_shell::{process::CommandChild, process::CommandEvent, ShellExt};

struct EngineChildState(Mutex<Option<CommandChild>>);
struct BackendUrlState(String);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HistoryMetadata {
  title: String,
  artist: String,
  creator: String,
  intensity: u8,
  background_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HistoryResultSummary {
  tempo_bpm: f64,
  duration_ms: u64,
  beat_count: usize,
  onset_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DashboardHistoryEntry {
  id: String,
  timestamp: String,
  audio_path: String,
  audio_file_name: String,
  audio_extension: String,
  metadata: HistoryMetadata,
  result: HistoryResultSummary,
}

fn reserve_loopback_port() -> std::io::Result<u16> {
  let listener = TcpListener::bind("127.0.0.1:0")?;
  let port = listener.local_addr()?.port();
  drop(listener);
  Ok(port)
}

fn resolve_engine_command() -> (String, Vec<String>) {
  if cfg!(debug_assertions) {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let python = manifest_dir.join("../engine/.venv/Scripts/python.exe");
    let script = manifest_dir.join("../engine/main.py");

    (
      python.to_string_lossy().into_owned(),
      vec![script.to_string_lossy().into_owned()],
    )
  } else {
    ("engine_main".to_string(), Vec::new())
  }
}

fn history_file_path(app: &AppHandle) -> Result<PathBuf, String> {
  let history_dir = app
    .path()
    .app_local_data_dir()
    .map_err(|error| error.to_string())?;
  Ok(history_dir.join("dashboard-history.json"))
}

fn spawn_engine_sidecar(app: &AppHandle) -> Result<(String, CommandChild), String> {
  let port = reserve_loopback_port().map_err(|error| error.to_string())?;
  let backend_url = format!("http://127.0.0.1:{port}");
  let (program, mut base_args) = resolve_engine_command();
  base_args.push(port.to_string());

  let mut cmd = app.shell().command(program);
  
  if cfg!(debug_assertions) {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let python_path = manifest_dir.join("..");
    cmd = cmd.env("PYTHONPATH", python_path.to_string_lossy().into_owned());
  }

  let (mut rx, child) = cmd
    .args(base_args)
    .spawn()
    .map_err(|error| error.to_string())?;

  let app_handle = app.clone();
  tauri::async_runtime::spawn(async move {
    while let Some(event) = rx.recv().await {
      match event {
        CommandEvent::Stdout(line_bytes) => {
          let line = String::from_utf8_lossy(&line_bytes).trim().to_string();
          if !line.is_empty() {
            let _ = app_handle.emit("ai_progress_status", line);
          }
        }
        CommandEvent::Stderr(line_bytes) => {
          let line = String::from_utf8_lossy(&line_bytes).trim().to_string();
          if !line.is_empty() {
            eprintln!("Python Sidecar Stderr: {}", line);
            let _ = app_handle.emit("ai_progress_status", format!("ERROR: {}", line));
          }
        }
        _ => {}
      }
    }
  });

  Ok((backend_url, child))
}

#[tauri::command]
fn get_backend_url(state: State<'_, BackendUrlState>) -> String {
  state.0.clone()
}

#[tauri::command]
fn load_dashboard_history(app: AppHandle) -> Result<Vec<DashboardHistoryEntry>, String> {
  let history_path = history_file_path(&app)?;

  if !history_path.exists() {
    return Ok(Vec::new());
  }

  let payload = fs::read_to_string(history_path).map_err(|error| error.to_string())?;
  serde_json::from_str(&payload).map_err(|error| error.to_string())
}

#[tauri::command]
fn save_dashboard_history(
  app: AppHandle,
  entries: Vec<DashboardHistoryEntry>,
) -> Result<(), String> {
  let history_path = history_file_path(&app)?;

  if let Some(parent) = history_path.parent() {
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
  }

  let payload = serde_json::to_string_pretty(&entries).map_err(|error| error.to_string())?;
  fs::write(history_path, payload).map_err(|error| error.to_string())
}

#[tauri::command]
fn export_to_osu(osz_path: String) -> Result<String, String> {
  let osz_path_buf = PathBuf::from(&osz_path);
  if !osz_path_buf.exists() {
    return Err("OSZ file not found".into());
  }

  let file_name = osz_path_buf
    .file_name()
    .ok_or("Invalid OSZ filename")?
    .to_string_lossy()
    .into_owned();

  let mut songs_dir = None;

  if cfg!(target_os = "windows") {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
      let path = PathBuf::from(local_app_data).join("osu!").join("Songs");
      if path.exists() {
        songs_dir = Some(path);
      }
    }
  } else {
    if let Ok(xdg_data) = std::env::var("XDG_DATA_HOME") {
      let path = PathBuf::from(xdg_data).join("osu!").join("Songs");
      if path.exists() {
        songs_dir = Some(path);
      }
    } else if let Ok(home) = std::env::var("HOME") {
      let path = PathBuf::from(home).join(".local").join("share").join("osu!").join("Songs");
      if path.exists() {
        songs_dir = Some(path);
      }
    }
  }

  match songs_dir {
    Some(dir) => {
      let dest_path = dir.join(&file_name);
      std::fs::copy(&osz_path_buf, &dest_path)
        .map_err(|e| format!("Failed to copy OSZ to osu! folder: {}", e))?;
      Ok(dest_path.to_string_lossy().into_owned())
    }
    None => {
      Err("osu! Songs folder not found. OSZ remains in temporary directory.".into())
    }
  }
}

#[tauri::command]
fn select_audio_file() -> Result<Option<String>, String> {
  let file = rfd::FileDialog::new()
    .add_filter("Audio Files", &["mp3", "ogg", "wav"])
    .pick_file();
  
  Ok(file.map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
fn select_background_image() -> Result<Option<String>, String> {
  let file = rfd::FileDialog::new()
    .add_filter("Image Files", &["jpg", "jpeg", "png"])
    .pick_file();
  
  Ok(file.map(|p| p.to_string_lossy().into_owned()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      let (backend_url, child) = spawn_engine_sidecar(&app.handle())?;
      app.manage(BackendUrlState(backend_url));
      app.manage(EngineChildState(Mutex::new(Some(child))));

      let app_handle = app.handle().clone();
      std::thread::spawn(move || {
        let mut sys = sysinfo::System::new_all();
        loop {
          sys.refresh_all();
          let cpu_usage = sys.global_cpu_info().cpu_usage();
          let total_memory = sys.total_memory();
          let used_memory = sys.used_memory();
          
          let mut engine_cpu = 0.0;
          let mut engine_memory = 0u64;

          if let Some(state) = app_handle.try_state::<EngineChildState>() {
            let pid_opt = if let Ok(guard) = state.0.lock() {
              guard.as_ref().map(|c| c.pid())
            } else {
              None
            };
            if let Some(pid) = pid_opt {
              let sys_pid = sysinfo::Pid::from(pid as usize);
              sys.refresh_process(sys_pid);
              if let Some(proc) = sys.process(sys_pid) {
                engine_cpu = proc.cpu_usage();
                engine_memory = proc.memory();
              }
            }
          }
          
          let payload = serde_json::json!({
            "cpuUsage": cpu_usage,
            "totalMemory": total_memory,
            "usedMemory": used_memory,
            "engineCpuUsage": engine_cpu,
            "engineMemory": engine_memory,
          });
          
          let _ = app_handle.emit("hardware_telemetry", payload);
          std::thread::sleep(std::time::Duration::from_secs(1));
        }
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_backend_url,
      load_dashboard_history,
      save_dashboard_history,
      export_to_osu,
      select_audio_file,
      select_background_image
    ])
    .on_window_event(|window, event| {
      if matches!(event, WindowEvent::Destroyed) {
        if let Some(state) = window.try_state::<EngineChildState>() {
          if let Some(child) = state.0.lock().ok().and_then(|mut guard| guard.take()) {
            tauri::async_runtime::spawn(async move {
              let _ = child.kill();
            });
          }
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
  use super::reserve_loopback_port;

  #[test]
  fn reserves_a_loopback_port() {
    let port = reserve_loopback_port().expect("port reservation should succeed");
    assert!(port > 0);
  }
}
