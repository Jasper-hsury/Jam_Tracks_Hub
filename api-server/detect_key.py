# -*- coding: utf-8 -*-

import os
import shutil
import subprocess
import sys
import tempfile
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import joblib
import librosa
import numpy as np
import pandas as pd

try:
    import imageio_ffmpeg
except ImportError:
    imageio_ffmpeg = None


NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11]
MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10]

MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
                          2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53,
                          2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

SEGMENT_DURATION = 30
MAX_SEGMENTS = 5
PRIORITY_OVERRIDE_MARGIN = 0.15
PRIORITY_TOP_GAP_MARGIN = 0.08
RELATIVE_SCORE_CLOSE_RATIO = 0.86
RELATIVE_TONIC_MARGIN = 0.10
RELATIVE_PRIORITY_TONIC_MARGIN = 0.07
BASS_ROOT_SCORE_WEIGHT = 0.22
BASS_ROOT_RELATIVE_MARGIN = 0.08
BASS_ROOT_EDGE_WEIGHT = 1.45
FAMILY_PRIORITY_OVERRIDE_MARGIN = 0.12
FAMILY_PRIORITY_TOP_GAP_MARGIN = 0.06
PROJECT_DIR = Path(__file__).resolve().parent
MODEL_DIR = PROJECT_DIR / "models"
YOUTUBE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
DEFAULT_COOKIES_FILE = PROJECT_DIR / "youtube_cookies.txt"
RENDER_COOKIES_FILE = Path("/etc/secrets/youtube_cookies.txt")
FFMPEG_COMMAND = imageio_ffmpeg.get_ffmpeg_exe() if imageio_ffmpeg else "ffmpeg"

# This is an approximate instrument-priority model, not true source separation.
# Keyboard and bass are intentionally dominant; guitar and full mix are secondary.
ANALYSIS_LAYERS = [
    {
        "id": "keyboard",
        "label": "Keyboard",
        "weight": 0.40,
        "priority": True,
        "fmin": "C2",
        "n_octaves": 5,
    },
    {
        "id": "bass",
        "label": "Bass",
        "weight": 0.40,
        "priority": True,
        "fmin": "C1",
        "n_octaves": 3,
    },
    {
        "id": "guitar",
        "label": "Guitar",
        "weight": 0.15,
        "priority": False,
        "fmin": "E2",
        "n_octaves": 4,
    },
    {
        "id": "other",
        "label": "Other",
        "weight": 0.05,
        "priority": False,
        "fmin": "C1",
        "n_octaves": 7,
    },
]


def run_command(command, timeout=150):
    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as error:
        raise RuntimeError(
            "YouTube audio download timed out. The video may be restricted or YouTube may be blocking the server."
        ) from error
    except subprocess.CalledProcessError as error:
        stdout = (error.stdout or "").strip()
        stderr = (error.stderr or "").strip()
        details = stderr or stdout or str(error)
        lower_details = details.lower()

        if "sign in to confirm" in lower_details or "not a bot" in lower_details:
            message = (
                "YouTube blocked the server download. The server cookies may have expired; "
                "refresh the YouTube cookies on Render and try again."
            )
        elif "video unavailable" in lower_details or "private video" in lower_details:
            message = "This YouTube video is private, unavailable, or region restricted."
        elif "unsupported url" in lower_details:
            message = "Please paste a valid YouTube video URL."
        else:
            message = f"YouTube download failed: {details[-800:]}"

        raise RuntimeError(message) from error

    return result.stdout.strip()


def youtube_cookie_args(work_dir=None):
    cookie_candidates = [
        os.environ.get("YOUTUBE_COOKIES_FILE"),
        RENDER_COOKIES_FILE,
        DEFAULT_COOKIES_FILE,
    ]

    for candidate in cookie_candidates:
        if not candidate:
            continue

        cookie_path = Path(candidate)
        if cookie_path.exists() and cookie_path.is_file() and cookie_path.stat().st_size > 0:
            if work_dir:
                writable_cookie_path = Path(work_dir) / "youtube_cookies_working.txt"
                shutil.copyfile(cookie_path, writable_cookie_path)
                return ["--cookies", str(writable_cookie_path)]

            return ["--cookies", str(cookie_path)]

    return []


def youtube_cookie_status():
    cookie_candidates = [
        ("environment", os.environ.get("YOUTUBE_COOKIES_FILE")),
        ("render_secret", RENDER_COOKIES_FILE),
        ("local_file", DEFAULT_COOKIES_FILE),
    ]

    for source, candidate in cookie_candidates:
        if not candidate:
            continue

        cookie_path = Path(candidate)
        if cookie_path.exists() and cookie_path.is_file() and cookie_path.stat().st_size > 0:
            return {
                "configured": True,
                "source": source,
                "size": cookie_path.stat().st_size,
            }

    return {
        "configured": False,
        "source": None,
        "size": 0,
    }


def get_video_id(youtube_url):
    parsed_id = parse_youtube_video_id(youtube_url)
    if parsed_id:
        return parsed_id

    command = [
        "yt-dlp",
        "--no-playlist",
        *youtube_cookie_args(),
        "--get-id",
        youtube_url,
    ]
    return run_command(command).splitlines()[-1]


def parse_youtube_video_id(youtube_url):
    normalized_url = youtube_url.strip()
    if normalized_url and "://" not in normalized_url:
        normalized_url = f"https://{normalized_url}"

    parsed = urlparse(normalized_url)
    host = parsed.netloc.lower()
    if host.startswith("www."):
        host = host[4:]

    candidate = ""

    if host == "youtu.be":
        candidate = parsed.path.strip("/").split("/")[0]
    elif host in {"youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"}:
        if parsed.path == "/watch":
            candidate = parse_qs(parsed.query).get("v", [""])[0]
        else:
            parts = [part for part in parsed.path.split("/") if part]
            if len(parts) >= 2 and parts[0] in {"embed", "shorts", "live"}:
                candidate = parts[1]

    return candidate if YOUTUBE_ID_RE.match(candidate) else ""


def normalize_youtube_url(youtube_url):
    video_id = parse_youtube_video_id(youtube_url)
    if not video_id:
        raise ValueError(
            "Please paste a valid YouTube video link, such as https://www.youtube.com/watch?v=..."
        )

    return f"https://www.youtube.com/watch?v={video_id}"


def download_audio(youtube_url, download_dir):
    youtube_url = normalize_youtube_url(youtube_url)
    video_id = get_video_id(youtube_url)
    download_dir = Path(download_dir)
    download_dir.mkdir(exist_ok=True)

    output_template = str(download_dir / f"{video_id}.%(ext)s")
    audio_path = download_dir / f"{video_id}.wav"

    download_errors = []
    cookie_args = youtube_cookie_args(download_dir)
    cookie_attempts = [cookie_args]
    if cookie_args:
        cookie_attempts.append([])
    format_attempts = [None, "18/best"]

    for cookie_attempt in cookie_attempts:
        base_command = [
            sys.executable,
            "-m",
            "yt_dlp",
            "--no-playlist",
            "--js-runtimes",
            "deno",
            "--js-runtimes",
            "node",
            "--js-runtimes",
            "quickjs",
            "--js-runtimes",
            "bun",
            *cookie_attempt,
            "--ffmpeg-location",
            FFMPEG_COMMAND,
            "--quiet",
            "--no-warnings",
            "--force-overwrites",
            "--no-continue",
            "--retries",
            "3",
            "--fragment-retries",
            "3",
            "--socket-timeout",
            "20",
            "-x",
            "--audio-format",
            "wav",
            "-o",
            output_template,
        ]

        for format_selector in format_attempts:
            command = [*base_command]

            if format_selector:
                command.extend(["-f", format_selector])

            command.append(youtube_url)

            try:
                run_command(command)
                break
            except RuntimeError as error:
                download_errors.append(str(error))
                lower_error = str(error).lower()
                is_retryable_block = any(
                    marker in lower_error
                    for marker in ["403", "forbidden", "youtube blocked", "cookies may have expired"]
                )

                if not is_retryable_block:
                    raise
        else:
            continue

        break
    else:
        raise RuntimeError(download_errors[-1] if download_errors else "YouTube download failed.")

    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file was not created: {audio_path}")

    return audio_path


def get_audio_duration(audio_path):
    try:
        return librosa.get_duration(path=audio_path)
    except TypeError:
        return librosa.get_duration(filename=str(audio_path))


def create_segments(audio_path):
    total_duration = get_audio_duration(audio_path)
    if total_duration <= 0:
        return []

    duration = min(SEGMENT_DURATION, total_duration)
    max_offset = max(0, total_duration - duration)

    if max_offset == 0:
        return [(0, duration)]

    anchors = [0.18, 0.32, 0.46, 0.60, 0.74]
    offsets = []

    for anchor in anchors:
        offset = min(max_offset, total_duration * anchor)
        if all(abs(offset - existing) >= 8 for existing in offsets):
            offsets.append(offset)

    return [(round(offset, 1), round(duration, 1)) for offset in offsets[:MAX_SEGMENTS]]


def normalize_strength(chroma_strength):
    chroma_strength = np.asarray(chroma_strength, dtype=float)
    max_strength = chroma_strength.max()
    if max_strength == 0:
        return None
    return chroma_strength / max_strength


def estimate_tuning(y, sr):
    try:
        return librosa.estimate_tuning(y=y, sr=sr)
    except Exception:
        return 0.0


def get_layer_chroma_strength(y_harmonic, sr, layer):
    hop_length = 512
    chroma = librosa.feature.chroma_cqt(
        y=y_harmonic,
        sr=sr,
        hop_length=hop_length,
        fmin=librosa.note_to_hz(layer["fmin"]),
        n_octaves=layer["n_octaves"],
        tuning=estimate_tuning(y_harmonic, sr),
    )

    rms = librosa.feature.rms(y=y_harmonic, hop_length=hop_length)[0]
    frame_count = min(chroma.shape[1], len(rms))
    if frame_count == 0:
        return None

    chroma = chroma[:, :frame_count]
    rms = rms[:frame_count]

    energy_cutoff = np.percentile(rms, 35)
    active_frames = rms >= energy_cutoff

    if active_frames.sum() >= 3:
        chroma_summary = np.median(chroma[:, active_frames], axis=1)
    else:
        chroma_summary = np.median(chroma, axis=1)

    strength = normalize_strength(chroma_summary)
    if strength is None:
        return None

    return strength ** 1.15


def get_bass_root_profile(y_harmonic, sr):
    hop_length = 1024
    chroma = librosa.feature.chroma_cqt(
        y=y_harmonic,
        sr=sr,
        hop_length=hop_length,
        fmin=librosa.note_to_hz("C1"),
        n_octaves=3,
        tuning=estimate_tuning(y_harmonic, sr),
    )

    rms = librosa.feature.rms(y=y_harmonic, hop_length=hop_length)[0]
    frame_count = min(chroma.shape[1], len(rms))
    if frame_count == 0:
        return None

    chroma = chroma[:, :frame_count]
    rms = rms[:frame_count]

    energy_cutoff = np.percentile(rms, 45)
    active_frames = rms >= energy_cutoff
    if active_frames.sum() < 3:
        return None

    root_profile = np.zeros(12)
    active_indices = np.flatnonzero(active_frames)
    rms_max = rms.max() or 1

    for frame_index in active_indices:
        frame = chroma[:, frame_index]
        frame_max = frame.max()
        if frame_max == 0:
            continue

        root_index = int(np.argmax(frame))
        sorted_frame = np.sort(frame)
        second_best = sorted_frame[-2] if len(sorted_frame) > 1 else 0
        clarity = max(0, (frame_max - second_best) / frame_max)
        energy_weight = rms[frame_index] / rms_max

        position = frame_index / max(1, frame_count - 1)
        edge_weight = BASS_ROOT_EDGE_WEIGHT if position <= 0.2 or position >= 0.8 else 1.0

        root_profile[root_index] += (0.4 + energy_weight) * (1.0 + clarity) * edge_weight

    return normalize_strength(root_profile)


def get_segment_layer_strengths(audio_path, offset, duration):
    y, sr = librosa.load(
        audio_path,
        mono=True,
        offset=offset,
        duration=duration,
    )

    if len(y) == 0:
        return None

    y_harmonic = librosa.effects.harmonic(y)
    layer_strengths = {}

    for layer in ANALYSIS_LAYERS:
        strength = get_layer_chroma_strength(y_harmonic, sr, layer)
        if strength is not None:
            layer_strengths[layer["id"]] = strength

    bass_root_profile = get_bass_root_profile(y_harmonic, sr)
    if bass_root_profile is not None:
        layer_strengths["_bass_root_profile"] = bass_root_profile

    if not layer_strengths:
        return None

    return layer_strengths


def profile_score(chroma_strength, root_index, mode):
    profile = MAJOR_PROFILE if mode == "major" else MINOR_PROFILE
    rotated_profile = np.roll(profile, root_index)
    score = np.corrcoef(chroma_strength, rotated_profile)[0, 1]
    if np.isnan(score):
        return 0
    return score


def get_scale_notes(root_index, mode):
    intervals = MAJOR_INTERVALS if mode == "major" else MINOR_INTERVALS
    return [(root_index + interval) % 12 for interval in intervals]


def accidental_conflict_penalty(chroma_strength, root_index, mode):
    if mode == "major":
        major_third = chroma_strength[(root_index + 4) % 12]
        minor_third = chroma_strength[(root_index + 3) % 12]
        leading_tone = chroma_strength[(root_index + 11) % 12]
        flat_seventh = chroma_strength[(root_index + 10) % 12]

        third_conflict = max(0, minor_third - major_third) * 3.0
        seventh_conflict = max(0, flat_seventh - leading_tone) * 5.0
        missing_leading = max(0, 0.45 - leading_tone) * 1.5

        return third_conflict + seventh_conflict + missing_leading

    minor_third = chroma_strength[(root_index + 3) % 12]
    major_third = chroma_strength[(root_index + 4) % 12]
    flat_seventh = chroma_strength[(root_index + 10) % 12]
    leading_tone = chroma_strength[(root_index + 11) % 12]

    third_conflict = max(0, major_third - minor_third) * 3.0
    # Harmonic minor often contains the leading tone, so this penalty is gentler.
    seventh_conflict = max(0, leading_tone - flat_seventh) * 0.8

    return third_conflict + seventh_conflict


def key_family_score(chroma_strength, root_index, mode):
    scale_notes = get_scale_notes(root_index, mode)
    in_scale = sum(chroma_strength[i] for i in scale_notes)
    out_scale = sum(chroma_strength[i] for i in range(12) if i not in scale_notes)
    return in_scale - out_scale * 1.8


def major_family_key(root_index):
    return f"{NOTES[root_index]} major"


def family_relative_minor_key(family_key):
    note, _mode = family_key.split()
    root_index = NOTES.index(note)
    return f"{NOTES[(root_index + 9) % 12]} minor"


def key_to_family_key(key):
    note, mode = key.split()
    if mode == "major":
        return key

    root_index = NOTES.index(note)
    return f"{NOTES[(root_index + 3) % 12]} major"


def detect_family_candidates(chroma_strength):
    candidates = []

    for root_index in range(12):
        scale_notes = [(root_index + interval) % 12 for interval in MAJOR_INTERVALS]
        in_scale = sum(chroma_strength[i] for i in scale_notes)
        out_scale = sum(
            chroma_strength[i]
            for i in range(12)
            if i not in scale_notes
        )

        relative_minor_root = (root_index + 9) % 12
        major_profile = profile_score(chroma_strength, root_index, "major")
        minor_profile = profile_score(chroma_strength, relative_minor_root, "minor")

        score = (
            in_scale * 1.6
            - out_scale * 2.0
            + max(major_profile, minor_profile) * 1.6
            + (major_profile + minor_profile) * 0.5
        )
        candidates.append((score, major_family_key(root_index)))

    candidates.sort(reverse=True, key=lambda item: item[0])
    return candidates


def add_family_scores(score_board, family_candidates, multiplier):
    if not family_candidates:
        return

    gap = (
        family_candidates[0][0] - family_candidates[1][0]
        if len(family_candidates) > 1
        else 0
    )
    gap_bonus = 1.0 + max(0, min(gap, 2.0)) * 0.12

    for rank, (score, family_key) in enumerate(family_candidates[:5]):
        rank_bonus = 1.0 / (rank + 1)
        score_board[family_key] = (
            score_board.get(family_key, 0)
            + score * multiplier * rank_bonus * gap_bonus
        )


def triad_strength(note_strengths, key):
    if note_strengths is None:
        return 0

    root_index = key_root_index(key)
    _note, mode = key.split()
    third = (root_index + 4) % 12 if mode == "major" else (root_index + 3) % 12
    fifth = (root_index + 7) % 12

    return (
        note_strengths[root_index] * 1.4
        + note_strengths[third] * 0.9
        + note_strengths[fifth] * 0.8
    )


def choose_mode_in_family(
    family_key,
    final_scores,
    priority_scores,
    average_strength,
    priority_strength,
    bass_root_strength,
):
    major_key = family_key
    minor_key = family_relative_minor_key(family_key)

    major_score = (
        key_score(final_scores, major_key) * 0.18
        + key_score(priority_scores, major_key) * 0.22
        + key_tonic_strength(average_strength, major_key) * 0.8
        + key_tonic_strength(priority_strength, major_key) * 1.1
        + key_tonic_strength(bass_root_strength, major_key) * 1.8
        + triad_strength(average_strength, major_key) * 0.45
        + triad_strength(priority_strength, major_key) * 0.6
    )
    minor_score = (
        key_score(final_scores, minor_key) * 0.18
        + key_score(priority_scores, minor_key) * 0.22
        + key_tonic_strength(average_strength, minor_key) * 0.8
        + key_tonic_strength(priority_strength, minor_key) * 1.1
        + key_tonic_strength(bass_root_strength, minor_key) * 1.8
        + triad_strength(average_strength, minor_key) * 0.45
        + triad_strength(priority_strength, minor_key) * 0.6
    )

    selected_key = minor_key if minor_score > major_score else major_key

    return {
        "family_key": family_key,
        "major_key": major_key,
        "minor_key": minor_key,
        "major_mode_score": major_score,
        "minor_mode_score": minor_score,
        "selected_key": selected_key,
    }


def score_scale(chroma_strength, scale_notes, root_index, mode):
    in_scale_score = sum(chroma_strength[i] for i in scale_notes)
    out_scale_score = sum(
        chroma_strength[i]
        for i in range(12)
        if i not in scale_notes
    )

    tonic = root_index
    subdominant = (root_index + 5) % 12
    dominant = (root_index + 7) % 12
    third = (root_index + 4) % 12 if mode == "major" else (root_index + 3) % 12

    tonic_chord_score = (
        chroma_strength[tonic] * 2.0
        + chroma_strength[third] * 1.2
        + chroma_strength[dominant] * 1.4
    )

    tonal_center_score = (
        chroma_strength[tonic] * 2.5
        + chroma_strength[dominant] * 1.0
        + chroma_strength[subdominant] * 0.8
    )

    return (
        in_scale_score * 1.2
        - out_scale_score * 1.5
        + tonic_chord_score
        + tonal_center_score
        + key_family_score(chroma_strength, root_index, mode) * 1.3
        + profile_score(chroma_strength, root_index, mode) * 2.0
        - accidental_conflict_penalty(chroma_strength, root_index, mode)
    )


def detect_candidates(chroma_strength):
    candidates = []

    for root_index, root_note in enumerate(NOTES):
        major_notes = [(root_index + interval) % 12 for interval in MAJOR_INTERVALS]
        minor_notes = [(root_index + interval) % 12 for interval in MINOR_INTERVALS]

        major_score = score_scale(chroma_strength, major_notes, root_index, "major")
        minor_score = score_scale(chroma_strength, minor_notes, root_index, "minor")

        candidates.append((major_score, root_note, "major"))
        candidates.append((minor_score, root_note, "minor"))

    candidates.sort(reverse=True, key=lambda item: item[0])
    return candidates


def score_gap(candidates):
    if len(candidates) < 2:
        return 0
    return candidates[0][0] - candidates[1][0]


def add_ranked_scores(score_board, candidates, multiplier):
    gap_bonus = 1.0 + max(0, min(score_gap(candidates), 2.0)) * 0.15

    for rank, (score, note, mode) in enumerate(candidates[:5]):
        key = f"{note} {mode}"
        rank_bonus = 1.0 / (rank + 1)
        score_board[key] = score_board.get(key, 0) + score * multiplier * rank_bonus * gap_bonus


def get_best_key(score_board):
    return max(score_board.items(), key=lambda item: item[1])[0]


def score_ratio(score_board, key):
    if not score_board:
        return 0

    best_score = max(score_board.values())
    if best_score == 0:
        return 0

    return score_board.get(key, 0) / best_score


def top_gap_ratio(ranking):
    if len(ranking) < 2:
        return 1.0

    top_score = ranking[0][1]
    if top_score == 0:
        return 0

    return (ranking[0][1] - ranking[1][1]) / top_score


def is_relative_pair(first_key, second_key):
    return relative_key(first_key) == second_key or relative_key(second_key) == first_key


def key_root_index(key):
    note, _mode = key.split()
    return NOTES.index(note)


def key_score(score_board, key):
    return score_board.get(key, 0)


def key_tonic_strength(note_strengths, key):
    if note_strengths is None:
        return 0
    return note_strengths[key_root_index(key)]


def normalized_board_score(score_board, key):
    if not score_board:
        return 0

    best_score = max(score_board.values())
    if best_score == 0:
        return 0

    return score_board.get(key, 0) / best_score


def project_key_scores_to_family(key_scores):
    family_board = {}

    for key, score in key_scores.items():
        family_key = key_to_family_key(key)
        family_board[family_key] = family_board.get(family_key, 0) + score

    return family_board


def ranked_family_votes(ranking, max_items=5):
    votes = {}

    for rank, item in enumerate(ranking[:max_items]):
        key = item[0]
        family_key = key_to_family_key(key)
        votes[family_key] = votes.get(family_key, 0) + 1.0 / (rank + 1)

    return votes


def family_tonic_support(note_strengths, family_key):
    if note_strengths is None:
        return 0

    major_key = family_key
    minor_key = family_relative_minor_key(family_key)

    major_tonic = key_tonic_strength(note_strengths, major_key)
    minor_tonic = key_tonic_strength(note_strengths, minor_key)

    return max(major_tonic, minor_tonic * 1.12)


def build_family_hypotheses(
    family_scores,
    priority_family_scores,
    final_scores,
    priority_scores,
    ranking,
    priority_ranking,
    average_strength,
    priority_strength,
    bass_root_strength,
):
    projected_final = project_key_scores_to_family(final_scores)
    projected_priority = project_key_scores_to_family(priority_scores)
    overall_votes = ranked_family_votes(ranking)
    priority_votes = ranked_family_votes(priority_ranking)

    all_families = set(family_scores)
    all_families.update(priority_family_scores)
    all_families.update(projected_final)
    all_families.update(projected_priority)
    all_families.update(overall_votes)
    all_families.update(priority_votes)

    hypotheses = []

    for family_key in all_families:
        family_component = normalized_board_score(family_scores, family_key)
        priority_family_component = normalized_board_score(priority_family_scores, family_key)
        key_component = normalized_board_score(projected_final, family_key)
        priority_key_component = normalized_board_score(projected_priority, family_key)
        overall_vote_component = normalized_board_score(overall_votes, family_key)
        priority_vote_component = normalized_board_score(priority_votes, family_key)
        average_tonic_component = family_tonic_support(average_strength, family_key)
        priority_tonic_component = family_tonic_support(priority_strength, family_key)
        bass_root_component = family_tonic_support(bass_root_strength, family_key)

        score = (
            family_component * 0.26
            + priority_family_component * 0.14
            + key_component * 0.16
            + priority_key_component * 0.10
            + overall_vote_component * 0.18
            + priority_vote_component * 0.16
            + average_tonic_component * 0.08
            + priority_tonic_component * 0.10
            + bass_root_component * 0.28
        )

        hypotheses.append({
            "family_key": family_key,
            "score": score,
            "family_component": family_component,
            "priority_family_component": priority_family_component,
            "key_component": key_component,
            "priority_key_component": priority_key_component,
            "overall_vote_component": overall_vote_component,
            "priority_vote_component": priority_vote_component,
            "average_tonic_component": average_tonic_component,
            "priority_tonic_component": priority_tonic_component,
            "bass_root_component": bass_root_component,
        })

    hypotheses.sort(reverse=True, key=lambda item: item["score"])
    return hypotheses


def maybe_resolve_relative_key(
    resolution,
    final_scores,
    priority_scores,
    average_strength,
    priority_strength,
    bass_root_strength,
):
    selected_key = resolution["selected_key"]
    resolution["pre_relative_key"] = selected_key
    relative = relative_key(selected_key)

    selected_score = key_score(final_scores, selected_key)
    relative_score = key_score(final_scores, relative)
    if selected_score == 0 or relative_score / selected_score < RELATIVE_SCORE_CLOSE_RATIO:
        resolution["relative_resolution"] = "Relative key was not close enough to challenge final result."
        return resolution

    selected_tonic = key_tonic_strength(average_strength, selected_key)
    relative_tonic = key_tonic_strength(average_strength, relative)
    selected_priority_tonic = key_tonic_strength(priority_strength, selected_key)
    relative_priority_tonic = key_tonic_strength(priority_strength, relative)
    selected_bass_root = key_tonic_strength(bass_root_strength, selected_key)
    relative_bass_root = key_tonic_strength(bass_root_strength, relative)

    relative_priority_score = key_score(priority_scores, relative)
    selected_priority_score = key_score(priority_scores, selected_key)

    tonic_prefers_relative = relative_tonic >= selected_tonic + RELATIVE_TONIC_MARGIN
    priority_tonic_prefers_relative = (
        relative_priority_tonic
        >= selected_priority_tonic + RELATIVE_PRIORITY_TONIC_MARGIN
    )
    bass_root_prefers_relative = (
        relative_bass_root >= selected_bass_root + BASS_ROOT_RELATIVE_MARGIN
    )
    priority_score_prefers_relative = relative_priority_score > selected_priority_score

    if (
        tonic_prefers_relative
        or priority_tonic_prefers_relative
        or bass_root_prefers_relative
        or (priority_score_prefers_relative and priority_tonic_prefers_relative)
    ):
        resolution["selected_key"] = relative
        resolution["relative_adjusted"] = True
        resolution["relative_resolution"] = (
            "Relative key is close and has stronger tonic evidence; using relative key."
        )
    else:
        resolution["relative_adjusted"] = False
        resolution["relative_resolution"] = (
            "Relative key is close, but tonic evidence does not justify switching."
        )

    resolution["relative_key"] = relative
    resolution["selected_tonic_strength"] = selected_tonic
    resolution["relative_tonic_strength"] = relative_tonic
    resolution["selected_priority_tonic_strength"] = selected_priority_tonic
    resolution["relative_priority_tonic_strength"] = relative_priority_tonic
    resolution["selected_bass_root_strength"] = selected_bass_root
    resolution["relative_bass_root_strength"] = relative_bass_root
    return resolution


def resolve_final_key(
    family_hypotheses,
    family_ranking,
    priority_family_ranking,
    ranking,
    priority_ranking,
    family_scores,
    priority_family_scores,
    final_scores,
    priority_scores,
    average_strength,
    priority_strength,
    bass_root_strength,
):
    if family_hypotheses:
        selected_family = family_hypotheses[0]["family_key"]
    elif family_ranking:
        selected_family = family_ranking[0][0]
    else:
        selected_family = key_to_family_key(ranking[0][0])

    if family_ranking:
        overall_family = family_ranking[0][0]
    else:
        overall_family = selected_family

    if priority_family_ranking:
        priority_family = priority_family_ranking[0][0]
    else:
        priority_family = overall_family

    priority_margin = 0
    priority_gap = top_gap_ratio(priority_family_ranking)
    conflict = False

    if selected_family == overall_family and selected_family == priority_family:
        resolution_text = "All hypothesis sources agree on the key family."
    else:
        if priority_family != overall_family:
            priority_margin = 1 - score_ratio(priority_family_scores, overall_family)

        conflict = selected_family != overall_family or selected_family != priority_family
        resolution_text = (
            "Using multi-hypothesis family ranking from scale fit, full-key candidates, "
            "Keyboard/Bass candidates, and bass-root evidence."
        )

    overall_mode = choose_mode_in_family(
        overall_family,
        final_scores,
        priority_scores,
        average_strength,
        priority_strength,
        bass_root_strength,
    )
    priority_mode = choose_mode_in_family(
        priority_family,
        final_scores,
        priority_scores,
        average_strength,
        priority_strength,
        bass_root_strength,
    )
    selected_mode = choose_mode_in_family(
        selected_family,
        final_scores,
        priority_scores,
        average_strength,
        priority_strength,
        bass_root_strength,
    )

    selected_key = selected_mode["selected_key"]
    alternate_key = (
        selected_mode["minor_key"]
        if selected_key == selected_mode["major_key"]
        else selected_mode["major_key"]
    )

    return {
        "selected_key": selected_key,
        "overall_key": overall_mode["selected_key"],
        "priority_key": priority_mode["selected_key"],
        "overall_family": overall_family,
        "priority_family": priority_family,
        "selected_family": selected_family,
        "conflict": conflict,
        "resolution": resolution_text,
        "priority_margin": priority_margin,
        "priority_gap": priority_gap,
        "pre_relative_key": selected_key,
        "relative_key": alternate_key,
        "relative_resolution": "Mode selected inside the chosen key family using tonic, triad, and bass-root evidence.",
        "selected_tonic_strength": key_tonic_strength(average_strength, selected_key),
        "relative_tonic_strength": key_tonic_strength(average_strength, alternate_key),
        "selected_priority_tonic_strength": key_tonic_strength(priority_strength, selected_key),
        "relative_priority_tonic_strength": key_tonic_strength(priority_strength, alternate_key),
        "selected_bass_root_strength": key_tonic_strength(bass_root_strength, selected_key),
        "relative_bass_root_strength": key_tonic_strength(bass_root_strength, alternate_key),
        "major_mode_score": selected_mode["major_mode_score"],
        "minor_mode_score": selected_mode["minor_mode_score"],
    }


def detect_key_weighted_segments(audio_path):
    final_scores = {}
    priority_scores = {}
    family_scores = {}
    priority_family_scores = {}
    segment_reports = []
    combined_strength = np.zeros(12)
    priority_combined_strength = np.zeros(12)
    bass_root_combined_strength = np.zeros(12)
    priority_weight_total = 0
    bass_root_count = 0
    analyzed_count = 0

    for offset, duration in create_segments(audio_path):
        layer_strengths = get_segment_layer_strengths(audio_path, offset, duration)
        if layer_strengths is None:
            continue

        bass_root_profile = layer_strengths.get("_bass_root_profile")
        segment_scores = {}
        segment_priority_scores = {}
        layer_reports = []

        for layer in ANALYSIS_LAYERS:
            layer_id = layer["id"]
            if layer_id not in layer_strengths:
                continue

            strength = layer_strengths[layer_id]
            candidates = detect_candidates(strength)
            family_candidates = detect_family_candidates(strength)
            best_score, best_note, best_mode = candidates[0]

            add_ranked_scores(segment_scores, candidates, layer["weight"])
            add_ranked_scores(final_scores, candidates, layer["weight"])
            add_family_scores(family_scores, family_candidates, layer["weight"])

            if layer["priority"]:
                add_ranked_scores(segment_priority_scores, candidates, layer["weight"])
                add_ranked_scores(priority_scores, candidates, layer["weight"])
                add_family_scores(
                    priority_family_scores,
                    family_candidates,
                    layer["weight"],
                )
                priority_combined_strength += strength * layer["weight"]
                priority_weight_total += layer["weight"]

            combined_strength += strength * layer["weight"]

            layer_reports.append({
                "label": layer["label"],
                "weight": layer["weight"],
                "best_key": f"{best_note} {best_mode}",
                "score": best_score,
                "gap": score_gap(candidates),
            })

        if bass_root_profile is not None:
            bass_root_combined_strength += bass_root_profile
            bass_root_count += 1
            best_root_index = int(np.argmax(bass_root_profile))

            layer_reports.append({
                "label": "BassRoot",
                "weight": BASS_ROOT_SCORE_WEIGHT,
                "best_key": f"{NOTES[best_root_index]} root",
                "score": bass_root_profile[best_root_index],
                "gap": 0,
            })

        if not segment_scores:
            continue

        analyzed_count += 1
        segment_best_key = get_best_key(segment_scores)
        priority_best_key = (
            get_best_key(segment_priority_scores)
            if segment_priority_scores
            else segment_best_key
        )

        segment_reports.append({
            "offset": offset,
            "duration": duration,
            "best_key": segment_best_key,
            "priority_key": priority_best_key,
            "layer_reports": layer_reports,
        })

    if analyzed_count == 0:
        raise RuntimeError("No usable audio segments were found.")

    average_strength = normalize_strength(combined_strength / analyzed_count)
    if average_strength is None:
        raise RuntimeError("Audio analysis produced no usable note strengths.")

    if priority_weight_total > 0:
        priority_strength = normalize_strength(priority_combined_strength / priority_weight_total)
    else:
        priority_strength = average_strength

    if priority_strength is None:
        priority_strength = average_strength

    if bass_root_count > 0:
        bass_root_strength = normalize_strength(bass_root_combined_strength / bass_root_count)
    else:
        bass_root_strength = priority_strength

    if bass_root_strength is None:
        bass_root_strength = priority_strength

    active_notes = [
        note
        for note, strength in zip(NOTES, average_strength)
        if strength >= 0.45
    ]

    ranking = sorted(final_scores.items(), key=lambda item: item[1], reverse=True)
    priority_ranking = sorted(priority_scores.items(), key=lambda item: item[1], reverse=True)
    family_ranking = sorted(family_scores.items(), key=lambda item: item[1], reverse=True)
    priority_family_ranking = sorted(
        priority_family_scores.items(),
        key=lambda item: item[1],
        reverse=True,
    )
    family_hypotheses = build_family_hypotheses(
        family_scores,
        priority_family_scores,
        final_scores,
        priority_scores,
        ranking,
        priority_ranking,
        average_strength,
        priority_strength,
        bass_root_strength,
    )

    resolution = resolve_final_key(
        family_hypotheses,
        family_ranking,
        priority_family_ranking,
        ranking,
        priority_ranking,
        family_scores,
        priority_family_scores,
        final_scores,
        priority_scores,
        average_strength,
        priority_strength,
        bass_root_strength,
    )

    return {
        "active_notes": active_notes,
        "note_strengths": average_strength,
        "priority_note_strengths": priority_strength,
        "bass_root_strengths": bass_root_strength,
        "segment_reports": segment_reports,
        "ranking": ranking,
        "priority_ranking": priority_ranking,
        "family_hypotheses": family_hypotheses,
        "family_ranking": family_ranking,
        "priority_family_ranking": priority_family_ranking,
        **resolution,
    }


def flatten_ml_features(result):
    features = {}

    for note, value in zip(NOTES, result["note_strengths"]):
        features[f"avg_{note}"] = float(value)

    for note, value in zip(NOTES, result["priority_note_strengths"]):
        features[f"priority_{note}"] = float(value)

    for note, value in zip(NOTES, result["bass_root_strengths"]):
        features[f"bass_root_{note}"] = float(value)

    for index, hypothesis in enumerate(result["family_hypotheses"][:5], start=1):
        features[f"family_rank_{index}_score"] = float(hypothesis["score"])
        features[f"family_rank_{index}_bass"] = float(hypothesis["bass_root_component"])
        features[f"family_rank_{index}_scale"] = float(hypothesis["family_component"])
        features[f"family_rank_{index}_keys"] = float(hypothesis["key_component"])
        features[f"family_rank_{index}_votes"] = float(hypothesis["overall_vote_component"])

    for index, (_key, score) in enumerate(result["ranking"][:5], start=1):
        features[f"key_rank_{index}_score"] = float(score)

    for index, (_key, score) in enumerate(result["priority_ranking"][:5], start=1):
        features[f"priority_key_rank_{index}_score"] = float(score)

    features["major_mode_score"] = float(result["major_mode_score"])
    features["minor_mode_score"] = float(result["minor_mode_score"])
    features["selected_tonic_strength"] = float(result["selected_tonic_strength"])
    features["relative_tonic_strength"] = float(result["relative_tonic_strength"])
    features["selected_priority_tonic_strength"] = float(result["selected_priority_tonic_strength"])
    features["relative_priority_tonic_strength"] = float(result["relative_priority_tonic_strength"])
    features["selected_bass_root_strength"] = float(result["selected_bass_root_strength"])
    features["relative_bass_root_strength"] = float(result["relative_bass_root_strength"])

    return features


def load_ml_model(filename):
    path = MODEL_DIR / filename
    if not path.exists():
        return None
    return joblib.load(path)


def predict_one_model(bundle, features):
    if bundle is None:
        return None

    feature_columns = bundle["feature_columns"]
    row = {column: features.get(column, 0) for column in feature_columns}
    x = pd.DataFrame([row]).fillna(0)
    prediction = bundle["model"].predict(x)[0]

    confidence = None
    if hasattr(bundle["model"], "predict_proba"):
        probabilities = bundle["model"].predict_proba(x)[0]
        confidence = float(max(probabilities))

    return {
        "prediction": prediction,
        "confidence": confidence,
    }


def combine_ml_predictions(family_prediction, mode_prediction, key_prediction):
    family_key = family_prediction["prediction"] if family_prediction else None
    mode = mode_prediction["prediction"] if mode_prediction else None
    direct_key = key_prediction["prediction"] if key_prediction else None

    if family_key and mode:
        family_mode_key = family_key if mode == "major" else family_relative_minor_key(family_key)
        basis = "family_model + mode_model"

        if direct_key == family_mode_key:
            basis = "all ML models agree"

        return family_mode_key, basis

    if direct_key:
        return direct_key, "key_model"

    return None, "no ML model available"


def predict_with_ml(result):
    bundles = {
        "family": load_ml_model("family_model.joblib"),
        "mode": load_ml_model("mode_model.joblib"),
        "key": load_ml_model("key_model.joblib"),
    }

    if not any(bundles.values()):
        return None

    features = flatten_ml_features(result)
    family_prediction = predict_one_model(bundles["family"], features)
    mode_prediction = predict_one_model(bundles["mode"], features)
    key_prediction = predict_one_model(bundles["key"], features)
    final_key, basis = combine_ml_predictions(
        family_prediction,
        mode_prediction,
        key_prediction,
    )

    return {
        "family": family_prediction,
        "mode": mode_prediction,
        "key": key_prediction,
        "final_key": final_key,
        "basis": basis,
    }


def mode_to_label(mode):
    return "Major" if mode == "major" else "Minor"


def display_note_name(note, mode):
    common_spellings = {
        ("A#", "major"): "Bb",
        ("D#", "major"): "Eb",
        ("G#", "major"): "Ab",
        ("C#", "major"): "Db",
        ("A#", "minor"): "Bb",
        ("D#", "minor"): "Eb",
    }
    return common_spellings.get((note, mode), note)


def format_key_name(key):
    note, mode = key.split()
    return f"{display_note_name(note, mode)} {mode_to_label(mode)}"


def relative_key(key):
    note, mode = key.split()
    root_index = NOTES.index(note)

    if mode == "major":
        relative_root = NOTES[(root_index + 9) % 12]
        return f"{relative_root} minor"

    relative_root = NOTES[(root_index + 3) % 12]
    return f"{relative_root} major"


def key_family_label(key):
    note, mode = key.split()

    if mode == "major":
        return f"{format_key_name(key)} / {format_key_name(relative_key(key))}"

    return f"{format_key_name(relative_key(key))} / {format_key_name(key)}"


def format_confidence(prediction):
    if not prediction or prediction.get("confidence") is None:
        return ""
    return f" ({prediction['confidence'] * 100:.1f}% confidence)"


def format_optional_key(key):
    return format_key_name(key) if key else "Unavailable"


def print_ml_result(result):
    ml_prediction = result.get("ml_prediction")

    print()
    print("Machine learning result:")
    if not ml_prediction:
        print("ML models were not found. Using rule-based result only.")
        return

    family_prediction = ml_prediction.get("family")
    mode_prediction = ml_prediction.get("mode")
    key_prediction = ml_prediction.get("key")

    if family_prediction:
        print(
            "ML family: "
            f"{key_family_label(family_prediction['prediction'])}"
            f"{format_confidence(family_prediction)}"
        )
    else:
        print("ML family: Unavailable")

    if mode_prediction:
        print(
            "ML mode: "
            f"{mode_to_label(mode_prediction['prediction'])}"
            f"{format_confidence(mode_prediction)}"
        )
    else:
        print("ML mode: Unavailable")

    if key_prediction:
        print(
            "ML direct key: "
            f"{format_key_name(key_prediction['prediction'])}"
            f"{format_confidence(key_prediction)}"
        )
    else:
        print("ML direct key: Unavailable")

    print(f"ML final basis: {ml_prediction['basis']}")
    print(f"ML final result: {format_optional_key(ml_prediction['final_key'])}")


def print_concise_result(result):
    ml_prediction = result.get("ml_prediction")
    final_key = result["selected_key"]
    final_confidence = None

    if ml_prediction and ml_prediction.get("final_key"):
        final_key = ml_prediction["final_key"]
        if ml_prediction.get("key") and ml_prediction["key"]["prediction"] == final_key:
            final_confidence = ml_prediction["key"].get("confidence")

    print()
    print(f"Final key: {format_key_name(final_key)}")
    if final_confidence is not None:
        print(f"Confidence: {final_confidence * 100:.1f}%")

    print()
    print("Other possible keys (rule score, relative to final key):")
    final_score = None
    for key, score in result["ranking"]:
        if key == final_key:
            final_score = score
            break

    if final_score is None or final_score == 0:
        final_score = result["ranking"][0][1]

    shown = 0
    for key, score in result["ranking"]:
        if key == final_key:
            continue
        confidence = score / final_score * 100
        print(f"- {format_key_name(key)} ({confidence:.1f}%)")
        shown += 1
        if shown >= 3:
            break

    print()
    print("Main notes detected:")
    print(", ".join(result["active_notes"]) if result["active_notes"] else "No clear notes")

    if result["selected_key"] != final_key:
        print()
        print(f"Rule-based result was: {format_key_name(result['selected_key'])}")


def print_analysis_result(result):
    print()
    print("Instrument priority weights:")
    for layer in ANALYSIS_LAYERS:
        priority_text = "primary" if layer["priority"] else "secondary"
        print(f"- {layer['label']}: {layer['weight']:.0%} ({priority_text})")

    print()
    print("Segment analysis:")
    for report in result["segment_reports"]:
        start = report["offset"]
        end = report["offset"] + report["duration"]
        print(
            f"{start:>5.1f}-{end:<5.1f} sec: "
            f"weighted={format_key_name(report['best_key'])}, "
            f"keyboard/bass={format_key_name(report['priority_key'])}"
        )

        for layer_report in report["layer_reports"]:
            best_key = layer_report["best_key"]
            if best_key.endswith(" root"):
                formatted_best = best_key
            else:
                formatted_best = format_key_name(best_key)

            print(
                f"    {layer_report['label']:<8} "
                f"{layer_report['weight']:.0%}: "
                f"{formatted_best} "
                f"score={layer_report['score']:.2f} "
                f"gap={layer_report['gap']:.2f}"
            )

    print()
    print("Strong average notes:")
    print(", ".join(result["active_notes"]) if result["active_notes"] else "No clear notes")

    print()
    print("Average note strength:")
    for note, strength in zip(NOTES, result["note_strengths"]):
        print(f"{note}: {strength:.2f}")

    print()
    print("Average bass root strength:")
    for note, strength in zip(NOTES, result["bass_root_strengths"]):
        print(f"{note}: {strength:.2f}")

    print()
    print("Key family ranking:")
    best_family_score = result["family_ranking"][0][1]
    for index, (family_key, score) in enumerate(result["family_ranking"][:5], start=1):
        confidence = score / best_family_score * 100
        print(f"{index}. {key_family_label(family_key)}, relative confidence: {confidence:.1f}%")

    print()
    print("Keyboard/Bass key family ranking:")
    best_priority_family_score = result["priority_family_ranking"][0][1]
    for index, (family_key, score) in enumerate(result["priority_family_ranking"][:5], start=1):
        confidence = score / best_priority_family_score * 100
        print(f"{index}. {key_family_label(family_key)}, relative confidence: {confidence:.1f}%")

    print()
    print("Multi-hypothesis family ranking:")
    best_hypothesis_score = result["family_hypotheses"][0]["score"]
    for index, hypothesis in enumerate(result["family_hypotheses"][:5], start=1):
        confidence = hypothesis["score"] / best_hypothesis_score * 100
        print(
            f"{index}. {key_family_label(hypothesis['family_key'])}, "
            f"relative confidence: {confidence:.1f}% "
            f"(scale={hypothesis['family_component']:.2f}, "
            f"keys={hypothesis['key_component']:.2f}, "
            f"votes={hypothesis['overall_vote_component']:.2f}, "
            f"bass={hypothesis['bass_root_component']:.2f})"
        )

    print()
    print("Overall weighted ranking:")
    best_score = result["ranking"][0][1]
    for index, (key, score) in enumerate(result["ranking"][:5], start=1):
        confidence = score / best_score * 100
        print(f"{index}. {format_key_name(key)}, relative confidence: {confidence:.1f}%")

    print()
    print("Keyboard/Bass priority ranking:")
    priority_best_score = result["priority_ranking"][0][1]
    for index, (key, score) in enumerate(result["priority_ranking"][:5], start=1):
        confidence = score / priority_best_score * 100
        print(f"{index}. {format_key_name(key)}, relative confidence: {confidence:.1f}%")

    print()
    print("Conflict resolution:")
    print(result["resolution"])
    if result["overall_family"] != result["priority_family"]:
        print(f"Overall family: {key_family_label(result['overall_family'])}")
        print(f"Keyboard/Bass family: {key_family_label(result['priority_family'])}")
        print(f"Priority margin: {result['priority_margin'] * 100:.1f}%")
        print(f"Priority top gap: {result['priority_gap'] * 100:.1f}%")

    print()
    print("Mode resolution:")
    print(result["relative_resolution"])
    if "relative_key" in result:
        pre_relative_key = result["pre_relative_key"]
        print(f"Family alternate: {format_key_name(result['relative_key'])}")
        print(f"Major mode score: {result['major_mode_score']:.2f}")
        print(f"Minor mode score: {result['minor_mode_score']:.2f}")
        print(
            "Tonic strength "
            f"{format_key_name(pre_relative_key)}: "
            f"{result['selected_tonic_strength']:.2f}, "
            f"{format_key_name(result['relative_key'])}: "
            f"{result['relative_tonic_strength']:.2f}"
        )
        print(
            "Keyboard/Bass tonic strength "
            f"{format_key_name(pre_relative_key)}: "
            f"{result['selected_priority_tonic_strength']:.2f}, "
            f"{format_key_name(result['relative_key'])}: "
            f"{result['relative_priority_tonic_strength']:.2f}"
        )
        print(
            "Bass root strength "
            f"{format_key_name(pre_relative_key)}: "
            f"{result['selected_bass_root_strength']:.2f}, "
            f"{format_key_name(result['relative_key'])}: "
            f"{result['relative_bass_root_strength']:.2f}"
        )

    print(f"Rule-based key family: {key_family_label(result['selected_key'])}")
    print(f"Rule-based result: {format_key_name(result['selected_key'])}")
    print_ml_result(result)

    ml_prediction = result.get("ml_prediction")
    if ml_prediction and ml_prediction.get("final_key"):
        print(f"Final result: {format_key_name(ml_prediction['final_key'])}")
    else:
        print(f"Final result: {format_key_name(result['selected_key'])}")


def main():
    verbose = "--verbose" in sys.argv
    youtube_url = input("Paste YouTube link: ").strip()

    if not youtube_url:
        print("No link entered.")
        return

    with tempfile.TemporaryDirectory(prefix="youtube_key_") as temp_dir:
        print("Downloading audio...")
        audio_path = download_audio(youtube_url, temp_dir)

        print("Analyzing key...")
        result = detect_key_weighted_segments(audio_path)
        result["ml_prediction"] = predict_with_ml(result)
        if verbose:
            print_analysis_result(result)
        else:
            print_concise_result(result)

    print()
    print("Temporary audio files deleted permanently.")


if __name__ == "__main__":
    main()
