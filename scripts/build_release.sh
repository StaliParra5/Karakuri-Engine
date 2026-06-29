#!/usr/bin/env bash
set -e

echo "=== [1/3] Construyendo sidecar Python con PyInstaller ==="
cd engine
source .venv/bin/activate
pyinstaller build_engine.spec --clean -y
cd ..

echo "=== [2/3] Preparando directorio de binarios de Tauri ==="
mkdir -p src-tauri/binaries

TARGET_TRIPLE=$(rustc -Vv | grep host | cut -f 2 -d ' ' || echo "x86_64-unknown-linux-gnu")
echo "Target detectado: $TARGET_TRIPLE"

if [ -f "engine/dist/engine_main" ]; then
    cp engine/dist/engine_main src-tauri/binaries/engine_main-$TARGET_TRIPLE
    chmod +x src-tauri/binaries/engine_main-$TARGET_TRIPLE
else
    echo "Advertencia: No se encontró el binario generado por PyInstaller en engine/dist/engine_main"
fi

echo "=== [3/3] Compilando bundle frontend ==="
npm run build
echo "¡Estructura de release preparada con éxito para Tauri!"
