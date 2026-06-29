import os
import zipfile
import tempfile
import uuid
import shutil
from typing import List, Dict, Any, Tuple
from engine.schemas import FullAnalysisRequest

def try_inject_into_osu(osz_path: str) -> str:
    possible_dirs = [
        os.path.expanduser("~/.local/share/osu-wine/osu!/Songs"),
        os.path.expanduser("~/.osu/Songs"),
        os.path.expanduser("~/osu!/Songs"),
        os.path.expanduser("~/Games/osu!/Songs"),
    ]
    if os.name == "nt":
        appdata = os.environ.get("LOCALAPPDATA", "")
        if appdata:
            possible_dirs.insert(0, os.path.join(appdata, "osu!", "Songs"))

    for songs_dir in possible_dirs:
        if os.path.isdir(songs_dir) and os.access(songs_dir, os.W_OK):
            try:
                dest = os.path.join(songs_dir, os.path.basename(osz_path))
                shutil.copy2(osz_path, dest)
                return dest
            except Exception:
                pass
    return osz_path

def filter_objects_for_diff(objects: List[Dict[str, Any]], min_gap_ms: float) -> List[Dict[str, Any]]:
    if min_gap_ms <= 0:
        return objects
    filtered = []
    last_t = -10000.0
    for obj in objects:
        t = float(obj.get("time_ms", 0))
        if t - last_t >= min_gap_ms - 5.0:
            filtered.append(obj)
            last_t = t
    return filtered

def generate_osb_content(request: FullAnalysisRequest, kiai_ranges: List[Tuple[int, int]] = None) -> str:
    osb = [
        "[Events]",
        "//Background and Video events"
    ]
    if request.background_path:
        bg_name = os.path.basename(request.background_path)
        osb.append(f'0,0,"{bg_name}",0,0')
    osb.append("//Storyboard Layer 0 (Background)")
    if request.background_path and kiai_ranges:
        bg_name = os.path.basename(request.background_path)
        osb.append(f'Sprite,Background,Centre,"{bg_name}",320,240')
        for start_ms, end_ms in kiai_ranges:
            osb.append(f' C,0,{start_ms},{end_ms},255,255,255,255,230,200')
    return "\n".join(osb)

def build_single_osu_content(
    request: FullAnalysisRequest,
    version_name: str,
    cs: float,
    ar: float,
    od: float,
    hp: float,
    tempo_bpm: float,
    beat_times_ms: List[int],
    objects: List[Dict[str, Any]],
    kiai_ranges: List[Tuple[int, int]] = None
) -> str:
    osu_content = []
    osu_content.append("osu file format v14\n")
    osu_content.append("[General]")
    audio_filename = os.path.basename(request.audio_path)
    osu_content.append(f"AudioFilename: {audio_filename}")
    osu_content.append("AudioLeadIn: 0")
    mode_map = {"standard": 0, "taiko": 1, "catch": 2, "mania": 3}
    mode_int = mode_map.get(request.game_mode.lower(), 0)
    osu_content.append(f"Mode: {mode_int}")
    osu_content.append("StackLeniency: 0.7\n")

    osu_content.append("[Metadata]")
    osu_content.append(f"Title:{request.title}")
    osu_content.append(f"TitleUnicode:{request.title}")
    osu_content.append(f"Artist:{request.artist}")
    osu_content.append(f"ArtistUnicode:{request.artist}")
    osu_content.append(f"Creator:{request.creator}")
    osu_content.append(f"Version:{version_name}")
    osu_content.append("Source:")
    osu_content.append("Tags:karakuri ai automapper\n")

    osu_content.append("[Difficulty]")
    osu_content.append(f"HPDrainRate:{hp:.1f}")
    osu_content.append(f"CircleSize:{cs:.1f}")
    osu_content.append(f"OverallDifficulty:{od:.1f}")
    osu_content.append(f"ApproachRate:{ar:.1f}")
    osu_content.append("SliderMultiplier:1.4")
    osu_content.append("SliderTickRate:1\n")

    osu_content.append("[Events]")
    osu_content.append("//Background and Video events")
    if request.background_path:
        osu_content.append(f'0,0,"{os.path.basename(request.background_path)}",0,0')
    osu_content.append("//Break Periods")
    osu_content.append("//Storyboard Layer 0 (Background)\n")

    osu_content.append("[TimingPoints]")
    ms_per_beat = 60000.0 / tempo_bpm if tempo_bpm > 0 else 500.0

    if len(beat_times_ms) > 0:
        first_beat = beat_times_ms[0]
        osu_content.append(f"{first_beat},{ms_per_beat},4,1,0,50,1,0")
    if kiai_ranges:
        for start_ms, end_ms in kiai_ranges:
            osu_content.append(f"{start_ms},-100,4,1,0,70,0,1")
            osu_content.append(f"{end_ms},-100,4,1,0,50,0,0")
    osu_content.append("")

    osu_content.append("[HitObjects]")
    keys = max(1, int(cs)) if mode_int == 3 else 4
    for idx, obj in enumerate(objects):
        x = int(obj["x"])
        y = int(obj["y"])
        t = int(obj["time_ms"])
        obj_type = int(obj["object_type"])
        hs = int(obj.get("hit_sound", 0))

        if mode_int == 3:  # Mania
            col = int(x / 512.0 * keys) % keys
            x = int((col + 0.5) * (512.0 / keys))
            y = 192
            obj_type = 1
        elif mode_int == 1:  # Taiko
            y = 192
            obj_type = 1
            if hs == 0:
                hs = 2 if (idx % 4 == 3) else 0

        if obj_type in [1, 5, 12]:
            osu_content.append(f"{x},{y},{t},{obj_type},{hs},0:0:0:0:")
        elif obj_type in [2, 6]:
            slider_type = obj.get("slider_type", "L")
            end_x = int(obj.get("slider_end_x", x))
            end_y = int(obj.get("slider_end_y", y))
            length = obj.get("slider_length", 10.0)
            osu_content.append(f"{x},{y},{t},{obj_type},{hs},{slider_type}|{end_x}:{end_y},1,{length:.2f}")

    return "\n".join(osu_content)

def generate_osz(
    request: FullAnalysisRequest,
    tempo_bpm: float,
    beat_times_ms: List[int],
    polished_objects: List[Dict[str, Any]],
    kiai_ranges: List[Tuple[int, int]] = None
) -> str:
    """
    Ensambla un mapset completo de 5 dificultades y un archivo de Storyboard .osb,
    empaquetándolos junto al audio en un .osz y copiándolo a osu!/Songs.
    """
    ms_per_beat = 60000.0 / tempo_bpm if tempo_bpm > 0 else 500.0

    # Definir spread de 5 dificultades
    # (Nombre, CS, AR, OD, HP, min_gap_ms)
    req_diff = request.difficulty.lower()
    diff_spread = [
        ("Easy", 3.0, 4.0, 3.0, 3.0, ms_per_beat * 0.9),
        ("Normal", 3.5, 6.0, 5.0, 4.0, ms_per_beat * 0.45),
        ("Hard", 4.0, 8.0, 7.0, 5.5, ms_per_beat * 0.22),
        ("Insane", request.cs if req_diff == "insane" else 4.2, request.ar if req_diff == "insane" else 9.0, request.od if req_diff == "insane" else 8.0, request.hp if req_diff == "insane" else 6.0, 0.0),
        ("Expert", min(10.0, request.cs + 0.5) if req_diff == "expert" else 4.5, min(10.0, request.ar + 0.5) if req_diff == "expert" else 9.5, min(10.0, request.od + 0.5) if req_diff == "expert" else 8.5, min(10.0, request.hp + 0.5) if req_diff == "expert" else 6.5, 0.0)
    ]

    # Asegurar que la dificultad pedida explícitamente tenga las estadísticas y versión exacta solicitada
    # Si la solicitada no coincide con ninguna del spread estándar, agregamos una extra o sobrescribimos Insane
    found = False
    for i, (d_name, _, _, _, _, gap) in enumerate(diff_spread):
        if d_name.lower() == req_diff:
            diff_spread[i] = (d_name, request.cs, request.ar, request.od, request.hp, gap)
            found = True
            break
    if not found:
        diff_spread.append((request.difficulty.capitalize(), request.cs, request.ar, request.od, request.hp, 0.0))

    temp_dir = tempfile.gettempdir()
    unique_id = uuid.uuid4().hex[:8]
    invalid_chars = '<>:"/\\|?*'

    osz_filename = f"{request.artist} - {request.title} (Karakuri)_{unique_id}.osz"
    for c in invalid_chars:
        osz_filename = osz_filename.replace(c, '')
    osz_path = os.path.join(temp_dir, osz_filename)

    audio_filename = os.path.basename(request.audio_path)

    with zipfile.ZipFile(osz_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        # 1. Audio
        if os.path.exists(request.audio_path):
            zf.write(request.audio_path, arcname=audio_filename)

        # 2. Background image si existe
        if request.background_path and os.path.exists(request.background_path):
            zf.write(request.background_path, arcname=os.path.basename(request.background_path))

        # 3. Storyboard (.osb)
        osb_text = generate_osb_content(request, kiai_ranges)
        osb_filename = f"{request.artist} - {request.title} ({request.creator}).osb"
        for c in invalid_chars:
            osb_filename = osb_filename.replace(c, '')
        zf.writestr(osb_filename, osb_text)

        # 4. Los archivos .osu del spread
        for ver_name, cs, ar, od, hp, gap_ms in diff_spread:
            diff_objects = filter_objects_for_diff(polished_objects, gap_ms)
            osu_text = build_single_osu_content(
                request, ver_name, cs, ar, od, hp, tempo_bpm, beat_times_ms, diff_objects, kiai_ranges
            )
            osu_filename = f"{request.artist} - {request.title} ({request.creator}) [{ver_name}].osu"
            for c in invalid_chars:
                osu_filename = osu_filename.replace(c, '')
            zf.writestr(osu_filename, osu_text)

    return try_inject_into_osu(osz_path)
