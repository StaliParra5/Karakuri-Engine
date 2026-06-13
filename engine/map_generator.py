import os
import zipfile
import tempfile
import uuid
from typing import List, Dict, Any
from engine.schemas import FullAnalysisRequest

def generate_osz(
    request: FullAnalysisRequest,
    tempo_bpm: float,
    beat_times_ms: List[int],
    polished_objects: List[Dict[str, Any]]
) -> str:
    """
    Ensambla el archivo .osu v14 y lo empaqueta en un .osz junto con el audio.
    Retorna la ruta absoluta del archivo .osz generado en un directorio temporal.
    """
    osu_content = []
    
    # 1. [General]
    osu_content.append("osu file format v14\n")
    osu_content.append("[General]")
    audio_filename = os.path.basename(request.audio_path)
    osu_content.append(f"AudioFilename: {audio_filename}")
    osu_content.append("AudioLeadIn: 0")
    osu_content.append("Mode: 0")
    osu_content.append("StackLeniency: 0.7\n")
    
    # 2. [Metadata]
    osu_content.append("[Metadata]")
    osu_content.append(f"Title:{request.title}")
    osu_content.append(f"TitleUnicode:{request.title}")
    osu_content.append(f"Artist:{request.artist}")
    osu_content.append(f"ArtistUnicode:{request.artist}")
    osu_content.append(f"Creator:{request.creator}")
    osu_content.append("Version:Karakuri Generated")
    osu_content.append("Source:")
    osu_content.append("Tags:karakuri ai automapper\n")
    
    # 3. [Difficulty]
    osu_content.append("[Difficulty]")
    osu_content.append(f"HPDrainRate:{request.hp}")
    osu_content.append(f"CircleSize:{request.cs}")
    osu_content.append(f"OverallDifficulty:{request.od}")
    osu_content.append(f"ApproachRate:{request.ar}")
    osu_content.append("SliderMultiplier:1.4")
    osu_content.append("SliderTickRate:1\n")
    
    # [Events] for background
    osu_content.append("[Events]")
    osu_content.append("//Background and Video events")
    if request.background_path:
        osu_content.append(f'0,0,"{os.path.basename(request.background_path)}",0,0')
    osu_content.append("//Break Periods")
    osu_content.append("//Storyboard Layer 0 (Background)\n")
    
    # 4. [TimingPoints]
    osu_content.append("[TimingPoints]")
    ms_per_beat = 60000.0 / tempo_bpm if tempo_bpm > 0 else 500.0
    
    if len(beat_times_ms) > 0:
        first_beat = beat_times_ms[0]
        # offset, msPerBeat, meter, sampleSet, sampleIndex, volume, uninherited, effects
        osu_content.append(f"{first_beat},{ms_per_beat},4,1,0,50,1,0")
    osu_content.append("")
    
    # 5. [HitObjects]
    osu_content.append("[HitObjects]")
    for obj in polished_objects:
        x = int(obj["x"])
        y = int(obj["y"])
        t = int(obj["time_ms"])
        obj_type = int(obj["object_type"])
        
        if obj_type in [1, 5, 12]:  # Circle or Spinner (treated as circle for simplicity if not enough params)
            # x,y,time,type,hitSound,objectParams,hitSample
            osu_content.append(f"{x},{y},{t},{obj_type},0,0:0:0:0:")
        elif obj_type in [2, 6]:  # Slider
            slider_type = obj.get("slider_type", "L")
            end_x = int(obj.get("slider_end_x", x))
            end_y = int(obj.get("slider_end_y", y))
            length = obj.get("slider_length", 10.0)
            
            # format: x,y,time,type,hitSound,curveType|curvePoints,slides,length,edgeSounds,edgeSets,hitSample
            osu_content.append(f"{x},{y},{t},{obj_type},0,{slider_type}|{end_x}:{end_y},1,{length:.2f}")
    
    osu_text = "\n".join(osu_content)
    
    # Write to a zip file (.osz)
    temp_dir = tempfile.gettempdir()
    unique_id = uuid.uuid4().hex[:8]
    osz_filename = f"{request.artist} - {request.title} (Karakuri)_{unique_id}.osz"
    
    # Remove invalid characters for path
    invalid_chars = '<>:"/\\|?*'
    for c in invalid_chars:
        osz_filename = osz_filename.replace(c, '')
        
    osz_path = os.path.join(temp_dir, osz_filename)
    osu_filename = f"{request.artist} - {request.title} ({request.creator}) [Karakuri Generated].osu"
    for c in invalid_chars:
        osu_filename = osu_filename.replace(c, '')
    
    with zipfile.ZipFile(osz_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        # Add the .osu string
        zf.writestr(osu_filename, osu_text)
        
        # Add the audio file if it exists
        if os.path.exists(request.audio_path):
            zf.write(request.audio_path, arcname=audio_filename)
            
    return osz_path
