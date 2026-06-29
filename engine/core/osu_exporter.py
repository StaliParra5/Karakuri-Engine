import os
import shutil
from pathlib import Path

def detect_osu_songs_folder() -> str | None:
    home = Path.home()
    possible_paths = [
        home / ".local/share/osu-wine/osu!/Songs",
        home / ".local/share/osu/Songs",
        home / ".var/app/sh.ppy.osu/data/osu/Songs",
        home / "Games/osu!/Songs",
        home / ".osu/Songs",
        Path("C:/Program Files/osu!/Songs"),
        Path("C:/Program Files (x86)/osu!/Songs"),
        home / "AppData/Local/osu!/Songs",
    ]
    for p in possible_paths:
        if p.exists() and p.is_dir():
            return str(p.resolve())
    return None

def install_osz_to_osu(osz_path: str, custom_songs_dir: str | None = None) -> dict:
    source = Path(osz_path)
    if not source.exists():
        raise FileNotFoundError(f"OSZ file not found at {osz_path}")

    target_dir = Path(custom_songs_dir) if custom_songs_dir else None
    if not target_dir or not target_dir.exists():
        detected = detect_osu_songs_folder()
        if not detected:
            raise RuntimeError("No se detectó la carpeta Songs de osu! en el sistema.")
        target_dir = Path(detected)

    destination = target_dir / source.name
    shutil.copy2(source, destination)
    return {
        "installed": True,
        "destination": str(destination),
        "songs_dir": str(target_dir)
    }
