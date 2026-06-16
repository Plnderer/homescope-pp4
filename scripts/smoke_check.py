from __future__ import annotations

from pathlib import Path
import argparse
import json
import sys
from urllib import error, request


ROOT = Path(__file__).resolve().parents[1]


def check_file(name: str, path: str | Path) -> dict:
    resolved = Path(path)
    if resolved.exists():
        return {"name": name, "ok": True, "detail": str(resolved)}
    return {"name": name, "ok": False, "detail": f"Missing: {resolved}"}


def check_url(
    name: str,
    url: str,
    timeout: float = 5.0,
    method: str = "GET",
    payload: dict | None = None,
) -> dict:
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    url_request = request.Request(url, data=data, headers=headers, method=method)
    try:
        with request.urlopen(url_request, timeout=timeout) as response:
            body = response.read()
    except error.URLError as exc:
        return {"name": name, "ok": False, "detail": f"Request failed: {exc}"}
    except TimeoutError:
        return {"name": name, "ok": False, "detail": "Request timed out"}

    detail = f"HTTP {response.status}"
    try:
        parsed = json.loads(body.decode("utf-8"))
        if isinstance(parsed, dict):
            keys = ", ".join(sorted(parsed.keys())[:5])
            detail = f"{detail}; keys: {keys}"
    except (UnicodeDecodeError, json.JSONDecodeError):
        pass

    return {"name": name, "ok": 200 <= response.status < 300, "detail": detail}


def run_checks(root: Path = ROOT, api_base: str = "http://127.0.0.1:8000/api") -> list[dict]:
    base = api_base.rstrip("/")
    return [
        check_file("Housing CSV", root / "data" / "American_Housing_Data_20231209.csv"),
        check_file("ASPUS CSV", root / "data" / "ASPUS.csv"),
        check_file("Saved model artifact", root / "models" / "homescope_model.joblib"),
        check_file("Saved model metadata", root / "models" / "homescope_metadata.json"),
        check_file("Frontend package file", root / "frontend" / "package.json"),
        check_url("Backend health endpoint", f"{base}/health"),
        check_url("Backend summary endpoint", f"{base}/summary"),
        check_url("Backend filters endpoint", f"{base}/filters"),
        check_url("Backend market endpoint", f"{base}/market?min_beds=1&min_baths=1&min_sqft=500&max_sqft=0"),
        check_url("Backend models endpoint", f"{base}/models"),
        check_url(
            "Backend predict endpoint",
            f"{base}/predict",
            method="POST",
            payload={
                "state": "New York",
                "city": "New York",
                "beds": 3,
                "baths": 2,
                "living_space": 1800,
                "listing_price": 725000,
            },
        ),
    ]


def print_checks(checks: list[dict]) -> None:
    for check in checks:
        label = "PASS" if check["ok"] else "FAIL"
        print(f"[{label}] {check['name']}: {check['detail']}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run HomeScope demo readiness smoke checks.")
    parser.add_argument(
        "--api-base",
        default="http://127.0.0.1:8000/api",
        help="FastAPI base URL. Default: http://127.0.0.1:8000/api",
    )
    args = parser.parse_args()

    checks = run_checks(ROOT, args.api_base)
    print_checks(checks)
    return 0 if all(check["ok"] for check in checks) else 1


if __name__ == "__main__":
    sys.exit(main())
