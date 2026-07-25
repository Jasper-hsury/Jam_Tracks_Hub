# Render Deployment

This repo is organized as a website plus one FastAPI backend:

```text
Jam_Tracks_Hub/
  index.html
  chord-progressions.html
  tracks.html
  styles/
  scripts/
  data/
  api-server/
    Dockerfile
    render.yaml
    app.py
    detect_key.py
    models/
    requirements_api.txt
```

Render will run the Python/FastAPI server, and that same server will also serve the website files.

## What This Means

- The website opens from the Render URL.
- The key finder API also lives on the same Render URL.
- The frontend calls `/api/health` and `/api/analyze` in production.
- You do not need Netlify for this version.

## Local Test

From the project root:

```powershell
powershell -ExecutionPolicy Bypass -File ".\tools\windows\start_render_local.ps1"
```

On macOS:

```bash
tools/mac/start_render_local_mac.sh
```

Then open:

```text
http://127.0.0.1:8000/index.html
```

The API health check is:

```text
http://127.0.0.1:8000/api/health
```

## Render Setup

Push the repo to GitHub, then create a Render Web Service from that repo.

Use Docker. The backend deployment files live in `api-server/`.

The included `render.yaml` also describes the service:

```yaml
services:
  - type: web
    name: jasper-key-finder-api
    env: docker
    plan: free
    healthCheckPath: /api/health
```

## How It Works

`api-server/app.py` defines the API routes first:

```text
/api/health
/api/analyze
```

Then it serves the website from the project root:

```text
/
/index.html
/chord-progressions.html
/tracks.html
```

The `api-server` folder itself is blocked from public static browsing, so files like `app.py` and the model files are not exposed as website downloads.

## Important Note

The key detection uses `yt-dlp`, `ffmpeg`, `librosa`, and trained model files. That is why this project uses Docker on Render instead of a static-only host.
