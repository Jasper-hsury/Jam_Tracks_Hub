# Render Deployment

This folder is now set up as one Render web service:

```text
Jasper's_Music_v1_with_find_key/
  index.html
  chords.html
  tracks.html
  style.css
  key-finder.js
  site-config.js
  Dockerfile
  render.yaml
  api-server/
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

From this folder:

```powershell
powershell -ExecutionPolicy Bypass -File ".\start_render_local.ps1"
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

Push this whole folder to GitHub, then create a Render Web Service from that repo.

Use Docker. Render can build from the root `Dockerfile`.

The included `render.yaml` also describes the service:

```yaml
services:
  - type: web
    name: jasper-music
    runtime: docker
    plan: free
    dockerfilePath: ./Dockerfile
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
/chords.html
/tracks.html
```

The `api-server` folder itself is blocked from public static browsing, so files like `app.py` and the model files are not exposed as website downloads.

## Important Note

The key detection uses `yt-dlp`, `ffmpeg`, `librosa`, and trained model files. That is why this project uses Docker on Render instead of a static-only host.
