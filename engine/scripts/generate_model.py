import os
import torch
import torch.nn as nn

class OsuSyncMockModel(nn.Module):
    def __init__(self, input_dim=10, hidden_dim=64):
        super(OsuSyncMockModel, self).__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, batch_first=True)
        # xy output [x, y], typically NNs output normalized values between 0 and 1
        self.fc_coords = nn.Linear(hidden_dim, 2)
        # 3 types: HitCircle, Slider, Spinner (logits)
        self.fc_types = nn.Linear(hidden_dim, 3)

    def forward(self, x):
        out, _ = self.lstm(x)
        coords = torch.sigmoid(self.fc_coords(out)) # Normalizado [0, 1]
        types = self.fc_types(out) # Logits
        return coords, types

def generate():
    model = OsuSyncMockModel()
    model.eval()
    
    # Dummy input: batch_size=1, seq_length=100, feature_dim=10
    dummy_input = torch.randn(1, 100, 10)
    
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
    os.makedirs(models_dir, exist_ok=True)
    export_path = os.path.join(models_dir, "osusync_model_v1_fp32.onnx")
    
    torch.onnx.export(
        model,
        dummy_input,
        export_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=['rhythm_features'],
        output_names=['coordinates', 'object_types']
    )
    print(f"Modelo ONNX generado exitosamente en {export_path}")

if __name__ == '__main__':
    generate()
