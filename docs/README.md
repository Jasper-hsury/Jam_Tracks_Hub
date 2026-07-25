# Jam Tracks Hub

Personal music site for backing tracks, chord exploration, chord playback, and YouTube key detection.

## Recommended Local Start

For the Render-style version, run this from PowerShell:

```powershell
cd "C:\Users\Jaspe\OneDrive\桌面\Jam_Tracks_Hub"
powershell -ExecutionPolicy Bypass -File ".\start_render_local.ps1"
```

Then open:

```text
http://127.0.0.1:8000/index.html
```

This starts one FastAPI server that serves both the website and the key finder API.

## Pages

- `index.html`: homepage, intro, featured audio, latest tracks.
- `tracks.html`: backing tracks with key filtering and newest/oldest sorting.
- `chord-progressions.html`: YouTube Key Finder, chord progression explorer, chord playback, guitar rhythm, and metronome.

## Key Finder API

The frontend calls:

```text
/api/health
/api/analyze
```

When running locally from `start_render_local.ps1`, those routes are available at:

```text
http://127.0.0.1:8000/api/health
http://127.0.0.1:8000/api/analyze
```

## API Status

On `chord-progressions.html`, the API status pill shows:

- `API connected`: backend is reachable.
- `API offline`: backend is not reachable.

## Deploying To Render

This folder includes:

```text
Dockerfile
render.yaml
api-server/requirements_api.txt
```

Deploy the whole folder/repo to Render as a Docker web service. Render will run the Python API and serve the website from the same public URL.

More details are in:

```text
API_DEPLOYMENT.md
```

## Tracks Data

Track cards are generated from:

```text
data/tracks.json
```

To permanently add a track, add an object:

```json
{
  "id": "W9",
  "title": "New Backing Track in A",
  "key": "A major",
  "style": "Ballad",
  "bpm": "85",
  "youtubeUrl": "https://youtu.be/...",
  "slidesUrl": "slides/w9.html",
  "downloadUrl": "slides/W9_New_Backing_Track_in_A.pdf"
}
```
