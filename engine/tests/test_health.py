import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
SITE_PACKAGES = ROOT / "engine" / ".venv" / "Lib" / "site-packages"

if SITE_PACKAGES.exists():
    sys.path.insert(0, str(SITE_PACKAGES))

sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient

from engine.main import app


class HealthCheckTests(unittest.TestCase):
    def test_health_returns_expected_payload(self) -> None:
        client = TestClient(app)

        response = client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "ok", "engine": "Karakuri v1.0"},
        )


if __name__ == "__main__":
    unittest.main()
