$ErrorActionPreference = "Stop"

Write-Host "=== [1/3] Construyendo sidecar Python con PyInstaller en Windows ===" -ForegroundColor Cyan
Set-Location engine
if (Test-Path ".venv\Scripts\Activate.ps1") {
    & .\.venv\Scripts\Activate.ps1
}
pyinstaller build_engine.spec --clean -y
Set-Location ..

Write-Host "=== [2/3] Preparando directorio de binarios de Tauri ===" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "src-tauri\binaries" | Out-Null

$targetTriple = "x86_64-pc-windows-msvc"
try {
    $rustcInfo = rustc -Vv
    foreach ($line in $rustcInfo -split "`n") {
        if ($line -match "^host:\s+(.+)$") {
            $targetTriple = $matches[1].Trim()
            break
        }
    }
} catch {
    Write-Host "No se pudo obtener target de rustc, usando por defecto: $targetTriple" -ForegroundColor Yellow
}

Write-Host "Target detectado: $targetTriple" -ForegroundColor Green

$sourceExe = "engine\dist\engine_main.exe"
$destExe = "src-tauri\binaries\engine_main-$targetTriple.exe"

if (Test-Path $sourceExe) {
    Copy-Item -Force $sourceExe $destExe
    Write-Host "Copiado sidecar a $destExe" -ForegroundColor Green
} else {
    Write-Host "Advertencia: No se encontró el binario generado en $sourceExe" -ForegroundColor Yellow
}

Write-Host "=== [3/3] Compilando bundle frontend ===" -ForegroundColor Cyan
npm run build
Write-Host "¡Estructura de release preparada con éxito para Tauri en Windows!" -ForegroundColor Green
