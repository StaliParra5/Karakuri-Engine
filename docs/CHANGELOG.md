# Registro de Cambios

## 2026-06-13 02:02:00 -05:00
- Implementada la Fase 5 (Compilación y Pulido) en el backend.
- Creado `engine/core/stage3_polish.py` que implementa validación estricta de Distance Snap e interpolación geométrica lineal de Sliders simulando una spline simple libre de bucles.
- Creado `engine/map_generator.py` que serializa metadatos, TimingPoints e HitObjects hacia el formato de archivo `osu file format v14` y los empaqueta en un `.osz` usando `zipfile`.
- Actualizado `engine/schemas/full.py` y `src/types/dashboard.ts` con nuevos esquemas de metadata (`title`, `artist`, `creator`, `intensity`, `background_path`) para acoplar la UI con la generación de la Capa 3.
- Modificado `engine/main.py` para invocar todas las fases secuencialmente en el threadpool y retornar la ruta resultante `osz_path`.
- Modificada la interfaz React (`src/App.tsx` y `src/components/result-panel.tsx`) para enviar metadata y mostrar la ruta del mapa generado con éxito.
- Instalado `pyinstaller` en el entorno `.venv`.
- Creados archivos `engine/build_engine.spec` y `engine/build.bat` para compilar un ejecutable independiente (standalone) con hooks explícitos para las librerías `soundfile` y `onnxruntime`.

## 2026-06-13 01:50:00 -05:00
- Implementada la Fase 4 de la Inteligencia Artificial (Capa ONNX) en el backend local.
- Creado script `engine/scripts/generate_model.py` que genera una arquitectura LSTM real con `torch` y exporta el modelo `osusync_model_v1_fp32.onnx`.
- Añadida `engine/core/stage2_spatial.py` para cuantización dinámica (FP32 a QInt8) e inferencia predictiva `(x, y, type)` con `onnxruntime`.
- Renombrado endpoint `/analyze/rhythm` a `/analyze/full` en `engine/main.py` y `src/App.tsx` para soportar el Pipeline Híbrido unificado (convergencia orquestada de Fase 1 y Fase 2).
- Ampliado `engine/requirements.txt` con `onnxruntime`, `onnx` y `torch`.
- Actualizados los esquemas en `engine/schemas/spatial.py` para devolver `spatial_objects` y métricas de inferencia.
- Verificado el pipeline integrado localmente, logrando decuantización e inferencia fluida bajo 20ms en CPU.
- Actualizados `docs/PROJECT_STATE.md` y `docs/ARCHITECTURE.md` para reflejar el cierre de la Fase 4.

## 2026-06-12 20:30:12 -05:00
- Implementada la Fase 3 del frontend premium en `src/App.tsx`, `src/components/`, `src/hooks/`, `src/lib/` y `src/types/`.
- Sustituida la shell inicial por un dashboard dark glassmorphism funcional con dropzone de audio, formulario de metadata/intensidad, telemetría del sidecar, resumen de resultados e historial reutilizable.
- Integrado el frontend con `POST /analyze/rhythm` y con el stream de progreso `ai_progress_status`.
- Añadidos comandos Tauri en `src-tauri/src/lib.rs` para cargar y guardar historial local JSON (`load_dashboard_history` y `save_dashboard_history`).
- Actualizadas las pruebas de frontend en `src/App.test.tsx` para cubrir estado vacío, drop válido e inválido, análisis exitoso y reutilización del historial.
- Ajustado `src/index.css` para acompañar la dirección visual premium de la Fase 3.
- Verificados `npm.cmd test`, `npm.cmd run build` y `C:\Users\Stanley\.cargo\bin\cargo.exe test --manifest-path src-tauri/Cargo.toml`.

## 2026-06-12 20:05:29 -05:00
- Implementada la Fase 2 del backend local en `engine/main.py`, `engine/core/` y `engine/schemas/`.
- Añadido `POST /analyze/rhythm` con validación Pydantic, ejecución asíncrona en threadpool y errores controlados `400`, `404`, `415` y `500`.
- Implementada `engine/core/stage1_rhythm.py` con análisis DSP determinista basado en `librosa`: carga mono, STFT, onset strength, detección de onsets y beat tracking.
- Ampliado `engine/requirements.txt` con `librosa`, `numpy` y `soundfile` para soportar la Capa 1 rítmica.
- Añadidas pruebas backend en `engine/tests/test_rhythm_api.py` para payload válido, errores de contrato, emisión de progreso y no bloqueo de `GET /health`.
- Actualizados `docs/PROJECT_STATE.md` y `docs/ARCHITECTURE.md` para reflejar el cierre de la Fase 2 del motor local.

## 2026-06-12 19:36:49 -05:00
- Implementada la Fase 1 del scaffold base del proyecto.
- Inicializado el frontend con Vite + React 19 + TypeScript en la raíz del workspace.
- Inicializado el repositorio git local del proyecto.
- Inicializado `src-tauri/` con Tauri v2 y configuración de build para `npm.cmd run dev` y `npm.cmd run build`.
- Instaladas dependencias de UI y runtime: TailwindCSS, `dnd-kit`, `lucide-react`, `@tauri-apps/api` y `@tauri-apps/plugin-shell`.
- Creado `engine/requirements.txt`, `engine/__init__.py`, `engine/main.py` y el entorno virtual `engine/.venv` con Python 3.11.
- Implementado `GET /health` en FastAPI con emisión de estado por `stdout`.
- Implementado el puente inicial en Rust/Tauri con reserva de puerto loopback, comando `get_backend_url`, captura de `stdout` y cierre del proceso hijo.
- Añadidos tests para frontend (`src/App.test.tsx`), backend (`engine/tests/test_health.py`) y Rust (`src-tauri/src/lib.rs`).
- Verificados `npm test`, `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml` y el test backend con Python 3.11 escalado.

## 2026-06-12 19:06:38 -05:00
- Leída e integrada la especificación canónica `docs/Especificación Técnica osu! Automapper.docx` y su versión `docs/Especificación Técnica osu! Automapper.md`.
- Actualizado `AI_RULES.md` para exigir la lectura obligatoria de la especificación antes de diseñar o codificar.
- Actualizados `.cursorrules`, `.windsurfrules` y `.clinerules` para incorporar la especificación como memoria operativa del IDE.
- Actualizado `docs/ARCHITECTURE.md` con el pipeline híbrido, el flujo sidecar y la topología monorepo definidos en la especificación.
- Actualizado `docs/PROJECT_STATE.md` para reflejar que la especificación ya forma parte de la memoria operativa del proyecto.

## 2026-06-12 19:02:52 -05:00
- Actualizado `AI_RULES.md` para definir `AI_RULES.md` y `docs/` como memoria operativa del proyecto.
- Actualizados `.cursorrules`, `.windsurfrules` y `.clinerules` para incluir las directivas completas del proyecto y el protocolo de documentación viva.
- Actualizado `docs/PROJECT_STATE.md` para reflejar la sincronización entre memoria operativa y reglas del IDE.

## 2026-06-12 19:00:40 -05:00
- Inicio del proyecto.
- Creado `AI_RULES.md` con la constitución base del proyecto.
- Creados `.cursorrules`, `.windsurfrules` y `.clinerules` en la raíz.
- Creada la carpeta `docs/`.
- Creado `docs/PROJECT_STATE.md` con estado inicial.
- Creado `docs/CHANGELOG.md` con el registro inicial.
- Creado `docs/ARCHITECTURE.md` con la arquitectura base.
