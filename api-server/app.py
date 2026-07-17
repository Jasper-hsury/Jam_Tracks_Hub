# -*- coding: utf-8 -*-

import csv
import hashlib
import json
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

import detect_key

try:
    import imageio_ffmpeg
except ImportError:
    imageio_ffmpeg = None


app = FastAPI(title="Jasper's Music Key Finder")
MODEL_VERSION = "2026-06-12-render-fast-audio"
SITE_DIR = Path(__file__).resolve().parent.parent
ANALYSIS_HISTORY_PATH = Path(__file__).with_name("analysis_history.csv")
ANALYSIS_JOB_ROOT = Path(tempfile.gettempdir()) / "jasper_music_analysis_jobs"
ANALYSIS_CACHE_PATH = Path(tempfile.gettempdir()) / "jasper_music_analysis_cache.json"
MAX_UPLOAD_BYTES = 60 * 1024 * 1024
MAX_CONTAINER_UPLOAD_BYTES = 25 * 1024 * 1024
UPLOAD_CHUNK_BYTES = 1024 * 1024
HEAVY_CONTAINER_EXTENSIONS = {".mp4", ".webm"}
ANALYSIS_SAMPLE_RATE = 22050
ANALYSIS_EXCERPT_DURATION = 18
ANALYSIS_EXCERPT_ANCHORS = (0.18, 0.50, 0.74)
API_SEGMENT_DURATION = 15
API_MAX_SEGMENTS = 3
FFMPEG_TIMEOUT_SECONDS = 90
FFMPEG_COMMAND = imageio_ffmpeg.get_ffmpeg_exe() if imageio_ffmpeg else "ffmpeg"
ANALYSIS_JOB_TTL_SECONDS = 60 * 60
ANALYSIS_JOB_LIMIT = 60
SUPPORTED_UPLOAD_EXTENSIONS = {
    ".aac",
    ".aiff",
    ".flac",
    ".m4a",
    ".mp3",
    ".mp4",
    ".ogg",
    ".wav",
    ".webm",
}
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
ANALYSIS_JOB_ROOT.mkdir(parents=True, exist_ok=True)
ANALYSIS_EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix="key-analysis")
ANALYSIS_JOBS = {}
ANALYSIS_JOBS_LOCK = threading.Lock()
ANALYSIS_CACHE_LOCK = threading.Lock()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_private_network_access_header(request, call_next):
    if (
        request.method == "OPTIONS"
        and request.headers.get("access-control-request-private-network", "").lower() == "true"
    ):
        origin = request.headers.get("origin") or "*"
        requested_method = request.headers.get("access-control-request-method") or "GET, POST, OPTIONS"
        requested_headers = request.headers.get("access-control-request-headers") or "*"

        return Response(
            status_code=204,
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": requested_method,
                "Access-Control-Allow-Headers": requested_headers,
                "Access-Control-Allow-Private-Network": "true",
                "Access-Control-Max-Age": "600",
                "Vary": "Origin",
            },
        )

    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    content_type = response.headers.get("content-type", "")
    is_html_page = (
        "text/html" in content_type
        or request.url.path == "/"
        or request.url.path.endswith(".html")
    )
    if is_html_page:
        response.headers["Cache-Control"] = "no-cache, max-age=0, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


BLOCKED_STATIC_FILES = [
    ".dockerignore",
    "API_DEPLOYMENT.md",
    "Dockerfile",
    "README.md",
    "Web_File_Naming_Guidelines.txt",
    "netlify.toml",
    "render.yaml",
    "start_all.ps1",
    "start_local_api_background.ps1",
    "start_render_local.ps1",
    "install_local_api_autostart.ps1",
    "uninstall_local_api_autostart.ps1",
]


class AnalyzeRequest(BaseModel):
    url: str


def utc_timestamp():
    return datetime.now(timezone.utc).isoformat()


def load_analysis_cache():
    if not ANALYSIS_CACHE_PATH.exists():
        return {}

    try:
        data = json.loads(ANALYSIS_CACHE_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


ANALYSIS_CACHE = load_analysis_cache()


def save_analysis_cache():
    temporary_path = ANALYSIS_CACHE_PATH.with_suffix(".tmp")
    temporary_path.write_text(
        json.dumps(ANALYSIS_CACHE, ensure_ascii=True, separators=(",", ":")),
        encoding="utf-8",
    )
    temporary_path.replace(ANALYSIS_CACHE_PATH)


def analysis_cache_key(file_digest):
    return f"{MODEL_VERSION}:{file_digest}"


def get_cached_analysis(cache_key):
    with ANALYSIS_CACHE_LOCK:
        cached = ANALYSIS_CACHE.get(cache_key)
        return dict(cached) if isinstance(cached, dict) else None


def store_cached_analysis(cache_key, response):
    with ANALYSIS_CACHE_LOCK:
        ANALYSIS_CACHE[cache_key] = response

        if len(ANALYSIS_CACHE) > 100:
            oldest_keys = list(ANALYSIS_CACHE)[: len(ANALYSIS_CACHE) - 100]
            for key in oldest_keys:
                ANALYSIS_CACHE.pop(key, None)

        save_analysis_cache()


def prune_analysis_jobs():
    cutoff = time.time() - ANALYSIS_JOB_TTL_SECONDS

    with ANALYSIS_JOBS_LOCK:
        stale_ids = [
            job_id
            for job_id, job in ANALYSIS_JOBS.items()
            if job.get("updated_epoch", 0) < cutoff
        ]

        for job_id in stale_ids:
            ANALYSIS_JOBS.pop(job_id, None)

        if len(ANALYSIS_JOBS) > ANALYSIS_JOB_LIMIT:
            ordered_ids = sorted(
                ANALYSIS_JOBS,
                key=lambda job_id: ANALYSIS_JOBS[job_id].get("updated_epoch", 0),
            )
            for job_id in ordered_ids[: len(ANALYSIS_JOBS) - ANALYSIS_JOB_LIMIT]:
                ANALYSIS_JOBS.pop(job_id, None)


def create_analysis_job_record(filename):
    prune_analysis_jobs()
    job_id = uuid.uuid4().hex
    now_epoch = time.time()
    record = {
        "job_id": job_id,
        "filename": filename,
        "status": "queued",
        "stage": "Queued",
        "progress": 4,
        "cached": False,
        "created_at": utc_timestamp(),
        "updated_at": utc_timestamp(),
        "updated_epoch": now_epoch,
    }

    with ANALYSIS_JOBS_LOCK:
        ANALYSIS_JOBS[job_id] = record

    return job_id


def update_analysis_job(job_id, **updates):
    with ANALYSIS_JOBS_LOCK:
        job = ANALYSIS_JOBS.get(job_id)
        if not job:
            return

        job.update(updates)
        job["updated_at"] = utc_timestamp()
        job["updated_epoch"] = time.time()


def read_analysis_job(job_id):
    with ANALYSIS_JOBS_LOCK:
        job = ANALYSIS_JOBS.get(job_id)
        if not job:
            return None

        return {
            key: value
            for key, value in job.items()
            if key != "updated_epoch"
        }


def file_digest(path):
    digest = hashlib.sha256()

    with Path(path).open("rb") as source:
        while True:
            chunk = source.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)

    return digest.hexdigest()


def run_analysis_job(job_id, source_path, filename, cache_key, job_directory):
    try:
        update_analysis_job(
            job_id,
            status="processing",
            stage="Preparing audio",
            progress=16,
        )
        prepared_audio_path = prepare_audio_for_analysis(source_path, job_directory)

        update_analysis_job(
            job_id,
            stage="Extracting musical features",
            progress=44,
        )
        result = analyze_audio_path(prepared_audio_path)

        update_analysis_job(
            job_id,
            stage="Comparing key candidates",
            progress=78,
        )
        response = build_analysis_response(result, "file")
        response["filename"] = filename

        update_analysis_job(
            job_id,
            stage="Saving result",
            progress=92,
        )
        store_cached_analysis(cache_key, response)
        record_analysis_history(f"uploaded:{filename}", response)

        update_analysis_job(
            job_id,
            status="completed",
            stage="Complete",
            progress=100,
            result=response,
        )
    except Exception as error:
        update_analysis_job(
            job_id,
            status="failed",
            stage="Analysis failed",
            progress=100,
            error=str(error),
        )
    finally:
        shutil.rmtree(job_directory, ignore_errors=True)


def run_youtube_analysis_job(job_id, youtube_url, job_directory):
    try:
        update_analysis_job(
            job_id,
            status="processing",
            stage="Downloading YouTube audio",
            progress=18,
        )
        audio_path = detect_key.download_audio(youtube_url, job_directory)

        update_analysis_job(
            job_id,
            stage="Preparing audio",
            progress=38,
        )
        prepared_audio_path = prepare_audio_for_analysis(audio_path, job_directory)

        update_analysis_job(
            job_id,
            stage="Extracting musical features",
            progress=58,
        )
        result = analyze_audio_path(prepared_audio_path)

        update_analysis_job(
            job_id,
            stage="Comparing key candidates",
            progress=82,
        )
        response = build_analysis_response(result, "youtube")
        record_analysis_history(youtube_url, response)

        update_analysis_job(
            job_id,
            status="completed",
            stage="Complete",
            progress=100,
            result=response,
        )
    except Exception as error:
        update_analysis_job(
            job_id,
            status="failed",
            stage="YouTube analysis failed",
            progress=100,
            error=str(error),
        )
    finally:
        shutil.rmtree(job_directory, ignore_errors=True)


@contextmanager
def fast_analysis_settings():
    original_segment_duration = detect_key.SEGMENT_DURATION
    original_max_segments = detect_key.MAX_SEGMENTS

    detect_key.SEGMENT_DURATION = API_SEGMENT_DURATION
    detect_key.MAX_SEGMENTS = API_MAX_SEGMENTS

    try:
        yield
    finally:
        detect_key.SEGMENT_DURATION = original_segment_duration
        detect_key.MAX_SEGMENTS = original_max_segments


def run_media_command(command, timeout=FFMPEG_TIMEOUT_SECONDS):
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            encoding="utf-8",
            errors="replace",
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as error:
        raise RuntimeError("Audio preprocessing timed out. Try a shorter MP3 or WAV file.") from error

    if result.returncode != 0:
        error_text = (result.stderr or result.stdout or "Unknown ffmpeg error").strip()
        raise RuntimeError(f"Audio preprocessing failed: {error_text[-500:]}")

    return result


def probe_audio_duration(audio_path):
    command = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(audio_path),
    ]

    try:
        result = run_media_command(command, timeout=20)
        return max(0, float(result.stdout.strip()))
    except Exception:
        return None


def excerpt_offsets(duration):
    if not duration or duration <= ANALYSIS_EXCERPT_DURATION:
        return [0]

    max_offset = max(0, duration - ANALYSIS_EXCERPT_DURATION)
    offsets = []

    for anchor in ANALYSIS_EXCERPT_ANCHORS:
        offset = min(max_offset, max(0, duration * anchor))
        if all(abs(offset - existing) >= 8 for existing in offsets):
            offsets.append(offset)

    return offsets or [0]


def concat_file_line(path):
    safe_path = path.resolve().as_posix().replace("'", "'\\''")
    return f"file '{safe_path}'"


def prepare_audio_for_analysis(source_path, temp_dir):
    duration = probe_audio_duration(source_path)
    offsets = excerpt_offsets(duration)
    chunk_paths = []

    for index, offset in enumerate(offsets, start=1):
        chunk_path = Path(temp_dir) / f"analysis_chunk_{index}.wav"
        command = [
            FFMPEG_COMMAND,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-ss",
            f"{offset:.2f}",
            "-i",
            str(source_path),
            "-vn",
            "-t",
            str(ANALYSIS_EXCERPT_DURATION),
            "-ac",
            "1",
            "-ar",
            str(ANALYSIS_SAMPLE_RATE),
            str(chunk_path),
        ]
        run_media_command(command)

        if chunk_path.exists() and chunk_path.stat().st_size > 0:
            chunk_paths.append(chunk_path)

    if not chunk_paths:
        raise RuntimeError("No usable audio could be extracted from the uploaded file.")

    if len(chunk_paths) == 1:
        return chunk_paths[0]

    list_path = Path(temp_dir) / "analysis_chunks.txt"
    prepared_path = Path(temp_dir) / "analysis_audio.wav"
    list_path.write_text(
        "\n".join(concat_file_line(path) for path in chunk_paths),
        encoding="utf-8",
    )

    command = [
        FFMPEG_COMMAND,
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(list_path),
        "-c",
        "copy",
        str(prepared_path),
    ]
    run_media_command(command)

    return prepared_path


def analyze_audio_path(audio_path):
    with fast_analysis_settings():
        result = detect_key.detect_key_weighted_segments(audio_path)

    result["ml_prediction"] = detect_key.predict_with_ml(result)
    return result


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


def final_ml_confidence(ml_prediction, final_key):
    direct_confidence = model_confidence(ml_prediction, final_key)
    if direct_confidence is not None:
        return direct_confidence, "ML direct-key confidence"

    if not ml_prediction:
        return None, None

    family_prediction = ml_prediction.get("family")
    mode_prediction = ml_prediction.get("mode")
    if not family_prediction or not mode_prediction:
        return None, None

    family_confidence = family_prediction.get("confidence")
    mode_confidence = mode_prediction.get("confidence")
    if family_confidence is None or mode_confidence is None:
        return None, None

    _, final_mode = final_key.split()
    final_family = detect_key.key_to_family_key(final_key)
    if (
        family_prediction.get("prediction") != final_family
        or mode_prediction.get("prediction") != final_mode
    ):
        return None, None

    # Conservative combined confidence: the weaker part of family/mode evidence limits the result.
    return round(min(family_confidence, mode_confidence) * 100, 1), "ML combined confidence"


def prediction_summary(prediction, formatter=None):
    if not prediction:
        return None

    value = prediction.get("prediction")
    confidence = prediction.get("confidence")

    return {
        "prediction": formatter(value) if formatter and value else value,
        "confidence": round(confidence * 100, 1) if confidence is not None else None,
    }


def ranking_relative_score(ranking, target_key):
    if not ranking:
        return None

    top_score = ranking[0][1]
    if not top_score:
        return None

    for key, score in ranking:
        if key == target_key:
            return round(score / top_score * 100, 1)

    return None


def ranking_gap(ranking):
    if len(ranking) < 2 or not ranking[0][1]:
        return None

    return round((ranking[0][1] - ranking[1][1]) / ranking[0][1] * 100, 1)


def ranked_keys(ranking, max_items=5):
    if not ranking:
        return []

    top_score = ranking[0][1] or 1
    return [
        {
            "key": detect_key.format_key_name(key),
            "relative_score": round(score / top_score * 100, 1),
        }
        for key, score in ranking[:max_items]
    ]


def ranked_families(ranking, max_items=5):
    if not ranking:
        return []

    top_score = ranking[0][1] or 1
    return [
        {
            "family": detect_key.key_family_label(family_key),
            "relative_score": round(score / top_score * 100, 1),
        }
        for family_key, score in ranking[:max_items]
    ]


def strongest_notes(result, max_items=7):
    strengths = result.get("note_strengths")
    if strengths is None:
        return []

    note_scores = sorted(
        (
            {
                "note": note,
                "strength": round(float(strength) * 100, 1),
            }
            for note, strength in zip(detect_key.NOTES, strengths)
        ),
        key=lambda item: item["strength"],
        reverse=True,
    )

    return note_scores[:max_items]


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


def build_analysis_response(result, input_type):
    ml_prediction = result.get("ml_prediction")
    final_key = result["selected_key"]
    source = "rule"

    if ml_prediction and ml_prediction.get("final_key"):
        final_key = ml_prediction["final_key"]
        source = "machine learning"

    ml_confidence, ml_confidence_label = final_ml_confidence(ml_prediction, final_key)
    rule_confidence = ranking_relative_score(result["ranking"], result["selected_key"])
    final_rule_strength = ranking_relative_score(result["ranking"], final_key)
    confidence = ml_confidence if ml_confidence is not None else final_rule_strength
    confidence_label = ml_confidence_label if ml_confidence is not None else "Rule relative strength"
    rule_gap = ranking_gap(result["ranking"])
    confidence_value = confidence if confidence is not None else 0

    if confidence_value >= 65 and (rule_gap is None or rule_gap >= 18):
        certainty = "high"
        confidence_note = "The main evidence sources are clearly separated from the alternatives."
    elif confidence_value >= 42 and (rule_gap is None or rule_gap >= 8):
        certainty = "medium"
        confidence_note = "The result is plausible, but nearby keys still share meaningful evidence."
    else:
        certainty = "low"
        confidence_note = "The evidence is ambiguous. Treat the final key as a leading candidate, not a certainty."

    return {
        "final_key": detect_key.format_key_name(final_key),
        "source": source,
        "confidence": confidence,
        "confidence_label": confidence_label,
        "ml_confidence": ml_confidence,
        "rule_confidence": rule_confidence,
        "rule_gap": rule_gap,
        "priority_gap": ranking_gap(result["priority_ranking"]),
        "certainty": certainty,
        "uncertain": certainty == "low",
        "confidence_note": confidence_note,
        "rule_key": detect_key.format_key_name(result["selected_key"]),
        "priority_key": detect_key.format_key_name(result["priority_ranking"][0][0]),
        "key_family": detect_key.key_family_label(final_key),
        "main_notes": result["active_notes"],
        "strongest_notes": strongest_notes(result),
        "possible_keys": possible_keys(result, final_key),
        "overall_ranking": ranked_keys(result["ranking"]),
        "priority_ranking": ranked_keys(result["priority_ranking"]),
        "family_ranking": ranked_families(result["family_ranking"]),
        "priority_family_ranking": ranked_families(result["priority_family_ranking"]),
        "mode_resolution": result.get("relative_resolution"),
        "conflict_resolution": result.get("resolution"),
        "ml_details": {
            "family": prediction_summary(
                ml_prediction.get("family") if ml_prediction else None,
                detect_key.key_family_label,
            ),
            "mode": prediction_summary(ml_prediction.get("mode") if ml_prediction else None),
            "key": prediction_summary(
                ml_prediction.get("key") if ml_prediction else None,
                detect_key.format_key_name,
            ),
            "basis": ml_prediction.get("basis") if ml_prediction else None,
        },
        "model_version": MODEL_VERSION,
        "input_type": input_type,
    }


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


def record_analysis_history(reference, response):
    append_analysis_history(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "url": reference,
            "final_key": response["final_key"],
            "rule_key": response["rule_key"],
            "confidence": response["confidence"] if response["confidence"] is not None else "",
            "source": response["source"],
            "model_version": response["model_version"],
            "main_notes": ", ".join(response["main_notes"]),
        }
    )


@app.get("/api/health")
def health():
    with ANALYSIS_JOBS_LOCK:
        active_jobs = sum(
            1
            for job in ANALYSIS_JOBS.values()
            if job.get("status") in {"queued", "uploading", "processing"}
        )

    return {
        "status": "ok",
        "model_version": MODEL_VERSION,
        "analysis_queue": {
            "active_jobs": active_jobs,
            "max_workers": 1,
        },
        "youtube_cookies": detect_key.youtube_cookie_status(),
    }


@app.post("/api/analyze")
def analyze(request: AnalyzeRequest):
    try:
        youtube_url = detect_key.normalize_youtube_url(request.url)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    try:
        with tempfile.TemporaryDirectory(prefix="youtube_key_api_") as temp_dir:
            audio_path = detect_key.download_audio(youtube_url, temp_dir)
            prepared_audio_path = prepare_audio_for_analysis(audio_path, temp_dir)
            result = analyze_audio_path(prepared_audio_path)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    response = build_analysis_response(result, "youtube")
    record_analysis_history(youtube_url, response)

    return response


@app.post("/api/analyze/jobs", status_code=202)
def create_youtube_analysis_job(request: AnalyzeRequest):
    try:
        youtube_url = detect_key.normalize_youtube_url(request.url)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    video_id = detect_key.parse_youtube_video_id(youtube_url)
    job_id = create_analysis_job_record(f"youtube:{video_id}")
    job_directory = ANALYSIS_JOB_ROOT / job_id
    job_directory.mkdir(parents=True, exist_ok=True)

    update_analysis_job(
        job_id,
        status="queued",
        stage="Waiting for YouTube downloader",
        progress=8,
    )
    ANALYSIS_EXECUTOR.submit(
        run_youtube_analysis_job,
        job_id,
        youtube_url,
        job_directory,
    )

    return read_analysis_job(job_id)


@app.get("/api/analyze/jobs/{job_id}")
def get_youtube_analysis_job(job_id: str):
    job = read_analysis_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job was not found or has expired.")

    return job


@app.post("/api/analyze-file/jobs", status_code=202)
async def create_file_analysis_job(file: UploadFile = File(...)):
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()

    if extension not in SUPPORTED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Please upload an audio file: MP3, WAV, M4A, FLAC, OGG, WEBM, AAC, AIFF, or MP4.",
        )

    job_id = create_analysis_job_record(filename)
    job_directory = ANALYSIS_JOB_ROOT / job_id
    job_directory.mkdir(parents=True, exist_ok=True)
    audio_path = job_directory / f"uploaded_audio{extension}"
    uploaded_bytes = 0
    digest = hashlib.sha256()

    try:
        update_analysis_job(
            job_id,
            status="uploading",
            stage="Receiving audio",
            progress=8,
        )

        with audio_path.open("wb") as output_file:
            while True:
                chunk = await file.read(UPLOAD_CHUNK_BYTES)
                if not chunk:
                    break

                uploaded_bytes += len(chunk)
                if uploaded_bytes > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="Audio file is too large. Please upload a file under 60 MB.",
                    )

                digest.update(chunk)
                output_file.write(chunk)

        if uploaded_bytes == 0:
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")

        if (
            extension in HEAVY_CONTAINER_EXTENSIONS
            and uploaded_bytes > MAX_CONTAINER_UPLOAD_BYTES
        ):
            raise HTTPException(
                status_code=413,
                detail=(
                    "MP4 and WEBM files are too heavy for stable analysis. "
                    "Please export the audio as MP3, WAV, M4A, or FLAC under 25 MB."
                ),
            )

        cache_key = analysis_cache_key(digest.hexdigest())
        cached_response = get_cached_analysis(cache_key)

        if cached_response:
            cached_response["filename"] = filename
            update_analysis_job(
                job_id,
                status="completed",
                stage="Loaded cached result",
                progress=100,
                cached=True,
                result=cached_response,
            )
            shutil.rmtree(job_directory, ignore_errors=True)
        else:
            update_analysis_job(
                job_id,
                status="queued",
                stage="Waiting for analyzer",
                progress=12,
            )
            ANALYSIS_EXECUTOR.submit(
                run_analysis_job,
                job_id,
                audio_path,
                filename,
                cache_key,
                job_directory,
            )

        return read_analysis_job(job_id)
    except HTTPException as error:
        update_analysis_job(
            job_id,
            status="failed",
            stage="Upload failed",
            progress=100,
            error=error.detail,
        )
        shutil.rmtree(job_directory, ignore_errors=True)
        raise
    except Exception as error:
        update_analysis_job(
            job_id,
            status="failed",
            stage="Upload failed",
            progress=100,
            error=str(error),
        )
        shutil.rmtree(job_directory, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(error)) from error
    finally:
        await file.close()


@app.get("/api/analyze-file/jobs/{job_id}")
def get_file_analysis_job(job_id: str):
    job = read_analysis_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job was not found or has expired.")

    return job


@app.post("/api/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()

    if extension not in SUPPORTED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Please upload an audio file: MP3, WAV, M4A, FLAC, OGG, WEBM, AAC, AIFF, or MP4.",
        )

    try:
        with tempfile.TemporaryDirectory(prefix="uploaded_key_api_") as temp_dir:
            audio_path = Path(temp_dir) / f"uploaded_audio{extension}"
            uploaded_bytes = 0

            with audio_path.open("wb") as output_file:
                while True:
                    chunk = await file.read(UPLOAD_CHUNK_BYTES)
                    if not chunk:
                        break

                    uploaded_bytes += len(chunk)
                    if uploaded_bytes > MAX_UPLOAD_BYTES:
                        raise HTTPException(
                            status_code=413,
                            detail="Audio file is too large. Please upload a file under 60 MB.",
                        )

                    output_file.write(chunk)

            if uploaded_bytes == 0:
                raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")

            if (
                extension in HEAVY_CONTAINER_EXTENSIONS
                and uploaded_bytes > MAX_CONTAINER_UPLOAD_BYTES
            ):
                raise HTTPException(
                    status_code=413,
                    detail=(
                        "MP4 and WEBM files are too heavy for stable Render analysis. "
                        "Please export the audio as MP3, WAV, M4A, or FLAC under 25 MB."
                    ),
                )

            prepared_audio_path = prepare_audio_for_analysis(audio_path, temp_dir)
            result = analyze_audio_path(prepared_audio_path)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    finally:
        await file.close()

    response = build_analysis_response(result, "file")
    record_analysis_history(f"uploaded:{filename}", response)
    return response


@app.api_route("/api-server/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
def hide_api_server_files(path: str):
    raise HTTPException(status_code=404, detail="Not found.")


@app.api_route(
    "/api/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    include_in_schema=False,
)
def api_not_found(path: str):
    raise HTTPException(status_code=404, detail="API route not found.")


def hide_internal_static_file():
    raise HTTPException(status_code=404, detail="Not found.")


for blocked_file in BLOCKED_STATIC_FILES:
    app.add_api_route(
        f"/{blocked_file}",
        hide_internal_static_file,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        include_in_schema=False,
    )


@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, error: StarletteHTTPException):
    if request.url.path.startswith("/api/"):
        return JSONResponse(
            status_code=error.status_code,
            content={"detail": error.detail},
        )

    if error.status_code == 404:
        return FileResponse(SITE_DIR / "404.html", status_code=404)

    return JSONResponse(
        status_code=error.status_code,
        content={"detail": error.detail},
    )


app.mount("/", StaticFiles(directory=SITE_DIR, html=True), name="site")
