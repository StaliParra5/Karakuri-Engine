from pydantic import BaseModel, Field
from typing import List

class PredictedObject(BaseModel):
    time_ms: float = Field(..., description="Tiempo en milisegundos")
    x: float = Field(..., description="Coordenada X en píxeles de osu! [0, 512]")
    y: float = Field(..., description="Coordenada Y en píxeles de osu! [0, 384]")
    object_type: int = Field(..., description="Tipo de objeto (1=HitCircle, 2=Slider, 12=Spinner)")

class SpatialAnalysisResponse(BaseModel):
    predicted_objects: List[PredictedObject]
    metrics: dict = Field(default_factory=dict, description="Métricas de inferencia (tiempo, cuantización)")
