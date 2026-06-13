@echo off
echo Building Karakuri Engine Backend...
.venv\Scripts\pyinstaller --clean build_engine.spec
echo Build complete.
pause
