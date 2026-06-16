from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts import smoke_check


def test_check_file_reports_existing_and_missing_paths(tmp_path):
    existing = tmp_path / "exists.txt"
    existing.write_text("ok", encoding="utf-8")

    found = smoke_check.check_file("Existing file", existing)
    missing = smoke_check.check_file("Missing file", tmp_path / "missing.txt")

    assert found == {"name": "Existing file", "ok": True, "detail": str(existing)}
    assert missing["name"] == "Missing file"
    assert missing["ok"] is False
    assert "Missing" in missing["detail"]


def test_check_url_reports_json_response(monkeypatch):
    class FakeResponse:
        status = 200

        def read(self):
            return b'{"status": "ok"}'

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

    monkeypatch.setattr(smoke_check.request, "urlopen", lambda url, timeout: FakeResponse())

    result = smoke_check.check_url("Backend health", "http://127.0.0.1:8000/api/health")

    assert result["name"] == "Backend health"
    assert result["ok"] is True
    assert "HTTP 200" in result["detail"]


def test_run_checks_includes_backend_and_frontend_readiness(monkeypatch, tmp_path):
    required_files = [
        "data/American_Housing_Data_20231209.csv",
        "data/ASPUS.csv",
        "models/homescope_model.joblib",
        "models/homescope_metadata.json",
        "frontend/package.json",
    ]
    for path in required_files:
        target = tmp_path / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("ok", encoding="utf-8")

    monkeypatch.setattr(
        smoke_check,
        "check_url",
        lambda name, url, **kwargs: {"name": name, "ok": True, "detail": url},
    )

    checks = smoke_check.run_checks(tmp_path, "http://127.0.0.1:8000/api")
    names = {check["name"] for check in checks}

    assert "Housing CSV" in names
    assert "Saved model artifact" in names
    assert "Backend health endpoint" in names
    assert "Backend filters endpoint" in names
    assert "Backend market endpoint" in names
    assert "Backend predict endpoint" in names
    assert all(check["ok"] for check in checks)
