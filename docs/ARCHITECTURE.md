# Arquitectura de Karakuri Engine

Karakuri Engine usará la siguiente arquitectura base:

- Frontend: React 19 + TypeScript + Vite + TailwindCSS.
- Contenedor de escritorio: Tauri 2.0.
- Backend local: Python + FastAPI + Uvicorn.
- IA local y procesamiento de audio: `onnxruntime`, `librosa` y modelos ONNX.

## Restricciones
- No usar Electron como contenedor.
- No usar Node.js como backend.
- No usar `torch` ni `tensorflow` en producción.

## Flujo esperado
- El frontend en React se comunica con Tauri para la experiencia de escritorio.
- Tauri orquesta el backend local en Python/FastAPI.
- El backend procesa audio, ejecuta modelos ONNX y devuelve resultados al frontend.

## Gobernanza de asistentes
- `AI_RULES.md` define la constitución operativa del proyecto.
- `.cursorrules`, `.windsurfrules` y `.clinerules` replican las restricciones técnicas y el flujo obligatorio de documentación para asistentes del IDE.

## Especificación canónica del producto
- Fuente principal obligatoria: `docs/Especificación Técnica osu! Automapper.md`.
- Fuente original equivalente: `docs/Especificación Técnica osu! Automapper.docx`.

## Pipeline híbrido obligatorio
- `stage1_rhythm`: análisis DSP con librosa para STFT, onset strength, peak picking y beat tracking por programación dinámica.
- `stage2_spatial`: inferencia espacial con modelo OsuSync en ONNX Runtime, incluyendo cuantización dinámica a INT8.
- `stage3_polish`: pulido geométrico y validación heurística con Catmull-Rom centrípeta, distance snap y restricciones de jugabilidad.

## Salidas y formato
- El sistema genera `TimingPoints` y `HitObjects` compatibles con `.osu` v14.
- El resultado final se empaqueta en `.osz` junto con audio, fondo y archivo `.osu`.

## Interacción y persistencia
- La UI debe soportar importación por drag and drop con `dnd-kit`.
- La configuración de dificultad/intensidad altera principalmente distance spacing y pulido geométrico.
- El historial local debe persistirse en JSON sobre filesystem de Tauri.

## IPC y sidecar
- Tauri debe lanzar el backend Python como sidecar local en `127.0.0.1` con puerto dinámico.
- La comunicación de progreso debe emitirse por eventos desde el sidecar hacia React.
- El cierre de la app debe terminar limpiamente el proceso Python para evitar fugas y procesos zombis.

## Implementación actual de Fase 1
- La app web está montada sobre Vite + React 19 + TypeScript en la raíz del proyecto.
- `src-tauri/` fue inicializado con Tauri v2 y expone el comando `get_backend_url` al frontend.
- En desarrollo, Tauri resuelve un puerto libre en `127.0.0.1`, lanza `engine_main` con `engine/main.py <port>` y reemite el `stdout` del backend como evento `ai_progress_status`.
- La UI escucha `ai_progress_status`, consulta `get_backend_url` y ejecuta un `fetch` a `/health` para validar el puente.
- `default.json` de capabilities habilita `shell:allow-spawn` y `shell:allow-execute` para el comando `engine_main`.

## Implementación actual de Fase 2 y Fase 4 (Capa ONNX)
- `engine/main.py` mantiene `GET /health` y expone `POST /analyze/full` como contrato público del backend local, representando la convergencia orquestada del Pipeline Híbrido.
- La capa HTTP usa FastAPI + Pydantic para validar entrada/salida y delega el DSP y la inferencia a un threadpool para no bloquear el event loop.
- `engine/core/stage1_rhythm.py` concentra la Capa 1 determinista del pipeline: carga mono de audio, STFT, onset strength, peak picking y beat tracking con `librosa`.
- `engine/core/stage2_spatial.py` concentra la Capa 2 predictiva (IA): realiza cuantización dinámica del modelo FP32 original hacia `QInt8` usando `onnxruntime.quantization` e infiere los clústeres espaciales devolviendo un array de nodos con coordenadas y tipos.
- La respuesta final agrupa un esqueleto rítmico en milisegundos (`tempo_bpm`, `beat_times_ms`, `onset_times_ms`) junto a la salida espacial (`spatial_objects` y `spatial_metrics`).
- El backend emite hitos de progreso unificados por `stdout` (`loading audio`, `computing stft`, ..., `Decuantizando y mapeando resultados espaciales`) para que Rust/Tauri los retransmita por `ai_progress_status`.

## Implementación actual de Fase 3
- El frontend se descompuso en `components/`, `hooks/`, `lib/` y `types/` para separar layout, estado y contratos de datos.
- La dropzone usa `dnd-kit` para la estructura interactiva y eventos nativos de drag and drop de Tauri para capturar rutas reales de audio del sistema.
- La UI integra `POST /analyze/rhythm`, muestra overlay de ejecución, consume `ai_progress_status` y presenta un resumen rítmico mínimo con BPM, duración, beats y onsets.
- El historial local del dashboard se guarda como JSON por medio de comandos Tauri (`load_dashboard_history` y `save_dashboard_history`) sobre `app_local_data_dir`.
- Fuera del runtime Tauri, el frontend degrada a modo demostración y usa `localStorage` como fallback del historial para desarrollo web aislado.

## Topología monorepo esperada
- `src/`: frontend React.
- `src-tauri/`: contenedor nativo Rust/Tauri.
- `engine/`: backend Python con `main.py`, `core/stage1_rhythm.py`, `core/stage2_spatial.py`, `core/stage3_polish.py`, `map_generator.py` y `models/`.

## Empaquetado del backend
- El backend debe congelarse con PyInstaller.
- El archivo `.spec` debe incluir hooks explícitos para `soundfile` y `onnxruntime` para evitar fallos de librerías nativas en destino.
