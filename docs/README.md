# Jam Tracks Hub

Jam Tracks Hub is a musician-focused website for backing tracks, fretboard study, chord exploration, and songwriting support. It combines original practice tracks with practical tools for understanding harmony, mapping guitar shapes, finding keys, and exporting custom chord progression diagrams.

<!-- UMAMI_ANALYTICS_START -->
## Website Analytics

Daily Umami analytics snapshot for Jam Tracks Hub.

_Analytics screenshot will appear here after `UMAMI_SHARE_URL` is configured and the workflow runs._

Last updated: pending setup
<!-- UMAMI_ANALYTICS_END -->

## What The Site Includes

- `index.html`: homepage with the site introduction, quick navigation panels, and contact section.
- `tracks.html`: backing track library with multi-key filtering, newest/oldest sorting, and direct slide downloads.
- `chord-dictionary.html`: searchable guitar chord dictionary with multiple voicings and shape filters.
- `scale.html`: scale explorer for guitar fretboard diagrams and downloadable scale images.
- `key-finder.html`: YouTube/audio key finder powered by the local or deployed API.
- `chord-progressions.html`: chord progression explorer with major/minor key selection and common progression groups.
- `progression-writer.html`: custom progression writer with chord inputs, voicing selection, save/download image output, and separated progression/shape export.
- `fretboard-trainer.html`: guitar fretboard practice tool.
- `privacy-policy.html`: privacy policy.

## Project Structure

```text
Jasper-music-main/
  *.html
  styles/
  scripts/
  data/
  assets/
  slides/
  downloads/
  api-server/
  docs/
  tools/
  .github/workflows/
```

Key files:

- `styles/base.css`: layout foundations, navigation, global utilities.
- `styles/components.css`: reusable UI components.
- `styles/pages.css`: page-specific sections and tool layouts.
- `styles/themes.css`: light/dark theme variables and theme overrides.
- `styles/chord-dictionary.css`: chord diagram and chord dictionary-specific styling.
- `scripts/site.js`: shared navigation, theme switch, and site-level behavior.
- `scripts/theme-init.js`: early theme loading before page paint.
- `scripts/tracks.js`: track filtering, sorting, and download behavior.
- `scripts/chords.js`: chord progression explorer logic.
- `scripts/progression-writer.js`: custom progression writer and export logic.
- `data/tracks.json`: backing track data source.

## Local Start

Static pages can be opened directly, but Key Finder needs the FastAPI backend.

On macOS:

```bash
tools/mac/start_render_local_mac.sh
```

On Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File ".\tools\windows\start_render_local.ps1"
```

Then open:

```text
http://127.0.0.1:8000/index.html
```

API health check:

```text
http://127.0.0.1:8000/api/health
```

## Checks

Run the JavaScript and build checks before committing:

```bash
npm run check
npm run build:cloudflare
```

`npm run build:cloudflare` prepares a static `dist/` folder and skips oversized slide PDFs that are too large for Cloudflare Workers.

## Key Finder API

The frontend calls:

```text
/api/health
/api/analyze
```

The API implementation lives in:

```text
api-server/app.py
api-server/detect_key.py
api-server/requirements_api.txt
```

## Tracks Data

Track cards are generated from:

```text
data/tracks.json
```

Example track object:

```json
{
  "id": "W16",
  "title": "New Backing Track in A",
  "key": "A major",
  "style": "Ballad",
  "bpm": "85",
  "youtubeUrl": "https://youtu.be/...",
  "slidesUrl": "slides/w16.html",
  "downloadUrl": "slides/W16_New_Backing_Track_in_A.pdf"
}
```

## GitHub Workflow

Use branches for changes, commit one meaningful update at a time, push the branch, open a pull request, let CI pass, then merge into `main`.

More details:

```text
docs/GITHUB_WORKFLOW.md
```
