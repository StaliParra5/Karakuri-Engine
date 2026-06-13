# Estado del Proyecto

## Funcionando
- Archivo `AI_RULES.md` creado con las directivas base del proyecto.
- Estructura de reglas para asistentes e IDE creada en la raíz y alineada con `AI_RULES.md`.
- Sistema de documentación viva inicializado en `docs/`.
- La especificación técnica de `osu! Automapper` quedó integrada como memoria operativa obligatoria para futuras implementaciones.
- Monorepo inicializado con frontend Vite/React/TypeScript en la raíz, contenedor Tauri v2 en `src-tauri/` y backend Python/FastAPI en `engine/`.
- Repositorio git local inicializado para soportar el flujo de trabajo del monorepo.
- TailwindCSS, `dnd-kit`, `lucide-react`, `@tauri-apps/api` y `@tauri-apps/plugin-shell` quedaron instalados y enlazados a la UI base del puente.
- `engine/.venv` fue creado con Python 3.11 y dependencias activas para el backend local (`fastapi`, `uvicorn`, `httpx`, `librosa`, `numpy`, `soundfile`).
- El endpoint `GET /health` del backend responde `{"status":"ok","engine":"Karakuri v1.0"}` y emite progreso por `stdout`.
- Tauri quedó configurado con puerto dinámico en loopback, comando `get_backend_url`, captura de `stdout` del backend y cierre explícito del proceso hijo.
- Fase 2 del backend local quedó implementada con `POST /analyze/rhythm`, ejecución asíncrona en threadpool y contrato HTTP estable para análisis rítmico.
- La Capa 1 `stage1_rhythm` ya analiza audio mono en `22050 Hz`, calcula STFT, onset strength, detección de onsets y beat tracking con `librosa`.
- El backend devuelve un esqueleto rítmico usable por Tauri con `tempo_bpm`, `beat_times_ms`, `onset_times_ms`, `duration_ms`, `sample_rate`, `frame_hop_length` y `analysis_window_fft`.
- La Fase 3 del frontend premium quedó implementada con dashboard dark glassmorphism funcional, dropzone nativa para audio, formulario de metadata/intensidad, telemetría del sidecar, resumen de resultados e historial reutilizable.
- El historial del dashboard se persiste como JSON local vía comandos Tauri en `app_local_data_dir`.
- Existen pruebas frontend para estado vacío, drop válido e inválido, ejecución del análisis, render del resultado y reutilización del historial.
- La Fase 4 (Capa ONNX) quedó implementada con cuantización dinámica QInt8 real y una red neuronal base (`stage2_spatial`) generada con `torch`.
- El endpoint `/analyze/full` orquesta el pipeline híbrido (Librosa + ONNX) en una sola llamada convergente, retornando un objeto unificado con `spatial_objects` y `spatial_metrics`.
- La Fase 5 (Compilación y Pulido) quedó implementada: la Capa 3 procesa splines Catmull-Rom centrípetas y Distance Snap; el ensamblador genera el `.osu` y empaqueta `.osz`; la API devuelve el `osz_path`.
- Se instaló PyInstaller y se configuró `engine/build_engine.spec` y `engine/build.bat` con hooks explícitos para compilar el backend.

## Pendiente
- Verificar de extremo a extremo el flujo visual en `tauri dev` con drag and drop real del sistema operativo y copia del archivo `.osz` generado.
- Reemplazar el contrato de desarrollo del comando `engine_main` por el binario congelado de PyInstaller para producción.

## Roto
- El wrapper `engine/.venv/Scripts/python.exe` no puede verificarse desde el sandbox local; para pruebas se usó Python 3.11 con acceso escalado.
