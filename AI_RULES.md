# CONSTITUCIÓN DE LA IA Y SISTEMA DE DOCUMENTACIÓN VIVA

## 1. IDENTIDAD DEL PROYECTO
- Nombre: Karakuri Engine
- Descripción: Motor de generación de beatmaps para osu! usando IA local.
- Filosofía: Recaudar información y contexto primero. El código debe ser modular, hiper-optimizado y con consumo mínimo de RAM/CPU.

## 2. ARQUITECTURA ESTRICTA
- Frontend: React 19 + TypeScript + Vite + TailwindCSS (Dark Glassmorphism).
- Contenedor: Tauri 2.0. Prohibido usar Electron.
- Motor/Backend: Python + FastAPI (Uvicorn local). Prohibido usar Node.js como backend.
- Inteligencia Artificial: Solo usar `onnxruntime` y `librosa`. Prohibido usar `torch` o `tensorflow` en producción.

## 3. PROTOCOLO DE DOCUMENTACIÓN VIVA
Por cada petición que modifique, agregue o elimine código:

1. Actualizar `docs/PROJECT_STATE.md` con lo que funciona, lo pendiente y lo roto.
2. Añadir una entrada en `docs/CHANGELOG.md` con fecha, hora y archivos modificados.
3. Actualizar `docs/ARCHITECTURE.md` cuando cambien librerías o flujos Frontend-Backend.

## 4. FLUJO OBLIGATORIO PARA ASISTENTES
Antes de cualquier acción:

1. Leer `AI_RULES.md`.
2. Leer `docs/PROJECT_STATE.md`.
3. Leer `docs/CHANGELOG.md`.

Al terminar una tarea, incluir siempre la confirmación:

Documentación actualizada en docs/CHANGELOG.md y docs/PROJECT_STATE.md

## 5. REGLAS DEL IDE Y MEMORIA OPERATIVA
- Los archivos `.cursorrules`, `.windsurfrules` y `.clinerules` deben reflejar estas mismas directivas y exigir la lectura previa de `AI_RULES.md` y `docs/`.
- Si una IA no tiene memoria persistente real, debe tratar `AI_RULES.md` y la carpeta `docs/` como la fuente de memoria operativa del proyecto.
- Ningún asistente debe implementar código, responder con conclusiones técnicas o modificar archivos sin haber sincronizado primero esta memoria operativa.

## 6. ESPECIFICACIÓN CANÓNICA OBLIGATORIA
- La especificación funcional y técnica canónica del producto está en `docs/Especificación Técnica osu! Automapper.md` y su versión fuente `docs/Especificación Técnica osu! Automapper.docx`.
- Antes de diseñar arquitectura, escribir código o proponer cambios del motor, cualquier asistente debe leer esa especificación además de `AI_RULES.md`, `docs/PROJECT_STATE.md` y `docs/CHANGELOG.md`.
- La implementación debe respetar estos invariantes de producto:
  - Motor híbrido de 3 capas: `stage1_rhythm` determinista con librosa, `stage2_spatial` predictiva con ONNX/OsuSync, `stage3_polish` heurística y geométrica restrictiva.
  - Arquitectura local-first con frontend React, contenedor Tauri, backend Python/FastAPI como sidecar y ejecución sin nube.
  - Serialización final a `.osu` v14 y empaquetado `.osz`.
  - Frontend con `dnd-kit` para drag and drop; no usar `react-beautiful-dnd`.
  - Persistencia histórica local ligera basada en JSON sobre filesystem de Tauri; no introducir una base de datos pesada sin decisión explícita.
  - Monorepo con separación clara entre `src/`, `src-tauri/` y `engine/`.
  - Empaquetado del backend con PyInstaller y hooks explícitos para `soundfile` y `onnxruntime`.
  - IPC Tauri/Python por sidecar, `spawn`, eventos de progreso y terminación limpia del proceso.
