# -*- coding: utf-8 -*-

import csv
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import detect_key


app = FastAPI(title="Jasper's Music Key Finder")
MODEL_VERSION = "2026-06-02-r1"
SITE_DIR = Path(__file__).resolve().parent.parent
ANALYSIS_HISTORY_PATH = Path(__file__).with_name("analysis_history.csv")
ANALYSIS_HISTORY_FIELDS = [
    "timestamp",
    "url",
    "final_key",
    "rule_key",
    "confidence",
    "source",
    "model_version",
    "main_notes",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BLOCKED_STATIC_FILES = [
    ".dockerignore",
    "API_DEPLOYMENT.md",
    "Dockerfile",
    "README.md",
    "Web_File_Naming_Guidelines.txt",
    "netlify.toml",
    "render.yaml",
    "start_all.ps1",
    "start_render_local.ps1",
]


class AnalyzeRequest(BaseModel):
    url: str


def model_confidence(ml_prediction, final_key):
    if not ml_prediction:
        return None

    direct_key = ml_prediction.get("key")
    if not direct_key or direct_key.get("prediction") != final_key:
        return None

    confidence = direct_key.get("confidence")
    if confidence is None:
        return None

    return round(confidence * 100, 1)


def possible_keys(result, final_key):
    final_score = None
    for key, score in result["ranking"]:
        if key == final_key:
            final_score = score
            break

    if final_score is None or final_score == 0:
        final_score = result["ranking"][0][1]

    candidates = []

    for key, score in result["ranking"]:
        if key == final_key:
            continue

        candidates.append(
            {
                "key": detect_key.format_key_name(key),
                "relative_score": round(score / final_score * 100, 1),
            }
        )

        if len(candidates) >= 3:
            break

    return candidates


def append_analysis_history(row):
    expected_header = ",".join(ANALYSIS_HISTORY_FIELDS)

    if ANALYSIS_HISTORY_PATH.exists():
        existing_text = ANALYSIS_HISTORY_PATH.read_text(encoding="utf-8-sig")
        existing_lines = existing_text.splitlines()

        if existing_lines and existing_lines[0] != expected_header:
            ANALYSIS_HISTORY_PATH.write_text(
                "\n".join([expected_header, *existing_lines[1:]]) + "\n",
                encoding="utf-8-sig",
            )

    with ANALYSIS_HISTORY_PATH.open("a", newline="", encoding="utf-8-sig") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=ANALYSIS_HISTORY_FIELDS)

        if ANALYSIS_HISTORY_PATH.stat().st_size == 0:
            writer.writeheader()

        writer.writerow(row)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model_version": MODEL_VERSION,
        "youtube_cookies": detect_key.youtube_cookie_status(),
    }


@app.post("/api/analyze")
def analyze(request: AnalyzeRequest):
    youtube_url = request.url.strip()

    if not youtube_url:
        raise HTTPException(status_code=400, detail="YouTube link is required.")

    try:
        with tempfile.TemporaryDirectory(prefix="youtube_key_api_") as temp_dir:
            audio_path = detect_key.download_audio(youtube_url, temp_dir)
            result = detect_key.detect_key_weighted_segments(audio_path)
            result["ml_prediction"] = detect_key.predict_with_ml(result)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    ml_prediction = result.get("ml_prediction")
    final_key = result["selected_key"]
    source = "rule"

    if ml_prediction and ml_prediction.get("final_key"):
        final_key = ml_prediction["final_key"]
        source = "machine learning"

    response = {
        "final_key": detect_key.format_key_name(final_key),
        "source": source,
        "confidence": model_confidence(ml_prediction, final_key),
        "rule_key": detect_key.format_key_name(result["selected_key"]),
        "main_notes": result["active_notes"],
        "possible_keys": possible_keys(result, final_key),
        "model_version": MODEL_VERSION,
    }

    append_analysis_history(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "url": youtube_url,
            "final_key": response["final_key"],
            "rule_key": response["rule_key"],
            "confidence": response["confidence"] if response["confidence"] is not None else "",
            "source": response["source"],
            "model_version": response["model_version"],
            "main_notes": ", ".join(response["main_notes"]),
        }
    )

    return response


@app.api_route("/api-server/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
def hide_api_server_files(path: str):
    raise HTTPException(status_code=404, detail="Not found.")


def hide_internal_static_file():
    raise HTTPException(status_code=404, detail="Not found.")


for blocked_file in BLOCKED_STATIC_FILES:
    app.add_api_route(
        f"/{blocked_file}",
        hide_internal_static_file,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        include_in_schema=False,
    )


app.mount("/", StaticFiles(directory=SITE_DIR, html=True), name="site")
