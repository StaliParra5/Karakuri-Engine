# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.hooks import collect_all

datas_sf, binaries_sf, hiddenimports_sf = collect_all('soundfile')
datas_onnx, binaries_onnx, hiddenimports_onnx = collect_all('onnxruntime')

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=binaries_sf + binaries_onnx,
    datas=datas_sf + datas_onnx,
    hiddenimports=hiddenimports_sf + hiddenimports_onnx + ['uvicorn', 'fastapi'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='engine_main',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
