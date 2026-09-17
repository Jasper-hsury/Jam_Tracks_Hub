# Jam Tracks Hub

<div align="center">
  <p><strong>Pick a backing track. Understand the harmony. Make the song your own.</strong></p>
  <p>Original backing tracks, practical guitar tools, and a local-first song workspace—built by Jasper for focused practice, with no sign-in required.</p>
  <p>
    <a href="https://jamtrackshub.com/#home">Live Site</a> ·
    <a href="https://jamtrackshub.com/song-workspace.html">Song Workspace</a> ·
    <a href="https://www.youtube.com/@Weekly_Backing_Track">YouTube</a> ·
    <a href="#website-analytics">Analytics</a> ·
    <a href="#local-development">Local Development</a>
  </p>
  <p>
    <a href="https://github.com/Jasper-hsury/Jam_Tracks_Hub/actions/workflows/ci.yml">
      <img alt="CI on main" src="https://img.shields.io/github/actions/workflow/status/Jasper-hsury/Jam_Tracks_Hub/ci.yml?branch=main&amp;label=CI" />
    </a>
    <a href="https://jamtrackshub.com">
      <img alt="Website" src="https://img.shields.io/badge/site-jamtrackshub.com-2a837c" />
    </a>
    <img alt="Vue multi-page app" src="https://img.shields.io/badge/frontend-Vue%203%20MPA-42b883" />
  </p>
</div>

<!-- README screenshot placeholders: SCREENSHOT_CURSOR_CLEANUP = DEFERRED_LOCAL_POLISH.
FIRST_PUSH_ALLOWED = NO until all five candidates pass cursor-free review or the user explicitly authorizes the current images.
-->

<p align="center">
  <img src="assets/readme/screenshots-v2-0-6/homepage-safari-light.jpg" alt="English light-theme homepage with backing track and Song Workspace entry points in Safari" width="100%" />
</p>

Start with an original backing track, explore its key and chord shapes, then organize your own chord-and-lyric chart. English and Traditional Chinese interfaces, light/dark themes, and responsive layouts support practice on desktop and mobile.

The previews in this local README draft are layout placeholders. Cursor cleanup is deferred; the five original Safari candidates remain unchanged.

<!-- UMAMI_ANALYTICS_START -->
## Website Analytics

Daily Umami analytics snapshot for Jam Tracks Hub.

Last updated: Sep 17, 2026, 12:02 AM

<p align="center">
  <img src="assets/analytics/umami-dashboard.png" alt="Umami analytics dashboard" width="100%" />
</p>
<!-- UMAMI_ANALYTICS_END -->

**All Time** describes the dashboard's reporting range: the analytics available across its recorded history at capture time, not just the previous day. **Daily** describes how often the snapshot is refreshed. This is a saved image, not a live dashboard; the timestamp above identifies its last update. The automation verifies All Time before capturing and retains the last good snapshot when validation fails.

## Choose Your Practice Flow

| Goal | Start here | What you can do |
| --- | --- | --- |
| Practice | [Backing Tracks](https://jamtrackshub.com/tracks.html) · [Fretboard Trainer](https://jamtrackshub.com/fretboard-trainer.html) | Filter tracks by relative-key groups, sort newest/oldest, follow available YouTube links, download practice slides, and learn note positions. |
| Understand | [Key Finder](https://jamtrackshub.com/key-finder.html) · [Scale Explorer](https://jamtrackshub.com/scale.html) · [Chord Dictionary](https://jamtrackshub.com/chord-dictionary.html) | Estimate a tonal center, map scales on a fretboard, and compare guitar chord voicings. |
| Create | [Chord Progressions](https://jamtrackshub.com/chord-progressions.html) · [Progression Writer](https://jamtrackshub.com/progression-writer.html) | Explore common progressions, write your own, save/load and duplicate them locally, and export JSON or chord diagrams. |
| Play your songs | [Song Workspace](https://jamtrackshub.com/song-workspace.html) | Arrange chord-and-lyric charts, transpose, choose capo positions, and use Read or Performance Mode. |

## Song Workspace

A local-first songbook for turning your own material into a playable chart. Start with **Chords + Lyrics**, **Lyrics Only**, or **Chords Only**, or import ChordPro or a previously exported Jam Tracks Hub JSON song.

- **Edit the chart:** organize sections and lines, position chords against lyrics, and choose chord shapes.
- **Find a comfortable key:** transpose to a Target Key, set Capo, and compare Smart Capo suggestions. Shape Key describes what you play; Target Key describes what sounds.
- **Choose a view:** Original, Easy: Balanced, Easy: Beginner, Roman, or Nashville chord display.
- **Practice and perform:** Read Mode reduces editing controls; Performance Mode adds adjustable auto-scroll and chart zoom.
- **Keep portable copies:** export individual songs as JTH JSON or ChordPro, and use Backup All / Restore Backup for the local library. JTH JSON preserves the complete song project; ChordPro is a text interchange format, not an identical backup.

Songs are stored in this browser using IndexedDB; display preferences use local storage. There is no account or cloud sync, and song content is not uploaded to Jam Tracks Hub. Clearing browser data or using another browser/device does not preserve the same library—export backups yourself. Other site features, including analytics and Key Finder, may use network services. Only import or share material you have the rights to use.

See the [Legal & Usage Policy](https://jamtrackshub.com/legal.html) and [Privacy Policy](https://jamtrackshub.com/privacy-policy.html) for the boundaries of local content and network-backed tools.

<p align="center">
  <img src="assets/readme/screenshots-v2-0-6/song-workspace-safari-light.jpg" alt="Song Workspace creation choices and local browser storage notice in Safari" width="100%" />
</p>

This candidate shows the creation entry points, not private songs or an editor session.

## Interface Gallery

### Backing Tracks

Browse the library by key, compare releases, and open the available listening and download resources.

<p align="center">
  <img src="assets/readme/screenshots-v2-0-6/tracks-safari-light.jpg" alt="Backing track library with key filters, release sorting, and track cards in Safari" width="100%" />
</p>

### Key Finder

Upload audio for a key estimate, or try a YouTube URL when the analysis service can access the video. Results are estimates, not a substitute for listening. YouTube access can fail; audio upload or the optional local helper provides an alternative.

<p align="center">
  <img src="assets/readme/screenshots-v2-0-6/key-finder-safari-light.jpg" alt="Idle Key Finder upload and YouTube analysis controls in Safari" width="100%" />
</p>

### Progression Writer

Build a progression with or without verse/chorus sections, compare chord shapes, and export diagrams for practice. This is separate from Song Workspace's chord-and-lyric songbook.

<p align="center">
  <img src="assets/readme/screenshots-v2-0-6/progression-writer-safari-light.jpg" alt="Progression Writer with song settings and four chord input fields in Safari" width="100%" />
</p>

## Releases and Development

- [v2.0.6 — Reliable All-Time Analytics Snapshots](https://github.com/Jasper-hsury/Jam_Tracks_Hub/releases/tag/v2.0.6): the published maintenance release for All Time selection, screenshot validation, and analytics automation reliability.
- [Development Log](https://github.com/Jasper-hsury/Jam_Tracks_Hub_Development_Log): public development history, release notes, and product evolution in the separate log repository.
- [GitHub Workflow](docs/GITHUB_WORKFLOW.md): contribution and review process.

The published release tag is `v2.0.6`; this checkout's `package.json` still declares `2.0.5`. These are distinct records, and this README refresh does not change either.

## Local Development

Use Node **22.23.2** from [.nvmrc](.nvmrc). From the repository root:

```bash
npm ci
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://127.0.0.1:5173/`). Keep the frontend on Vite for Vue module compilation; `8000` is the local Key Finder API port, not the Vite development server.

### Optional Key Finder backend

The frontend and browser-local tools can be developed without running analysis. To test Key Finder analysis locally, start its FastAPI backend in a separate terminal with Python 3.10 or newer.

On macOS:

```bash
bash tools/mac/start_render_local_mac.sh
```

On Windows PowerShell, using the same Python interpreter for installation and startup:

```powershell
python -m pip install -r api-server/requirements_api.txt
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --app-dir api-server
```

The macOS helper creates a virtual environment and installs the API requirements before startup. The API health endpoint is `http://127.0.0.1:8000/api/health`; continue browsing the frontend at the Vite URL. Analysis requires network/service access where applicable; normal UI inspection does not require uploading a file or starting a job.

## Checks

Run the full local test suite, JavaScript syntax checks, and production-output verification:

```bash
npm test
npm run check
npm run build:cloudflare
npm run verify:cloudflare
git diff --check
```

`build:cloudflare` builds the Vue entries, prepares retained static assets in `dist/`, and runs output verification. It does not deploy. `verify:cloudflare` can also be run separately. There are no dedicated lint or type-check scripts; `check` is JavaScript syntax validation.

## Architecture and Data

The frontend is a Vue 3 multi-page application built with Vite: 14 visible HTML entries, including utility/policy pages, plus a build-only foundation entry. Root HTML files retain stable URLs, metadata, analytics loading, and early theme/locale setup. See the [Vue migration record](docs/VUE_MIGRATION.md) for the retained classic-script bridges.

| Path | Responsibility |
| --- | --- |
| `src/entries/`, `src/views/`, `src/components/site/` | Page entry points, Vue interfaces, and shared navigation/footer. |
| `src/composables/`, `src/music/`, `src/services/` | Reactive page behavior, music-domain logic, storage/export and API adapters. |
| `scripts/song-workspace-core.js`, `scripts/song-workspace-storage.js`, `scripts/song-workspace-import.js` | Retained Song Workspace domain, browser storage, and import modules. |
| `locales/`, `styles/` | English/Traditional Chinese text and shared/page styling. |
| `data/tracks.json` | Canonical track identities, music metadata, covers, YouTube and download links. |
| `slides/`, `downloads/`, `assets/` | Practice resources, artwork, and README/analytics images. |
| `api-server/` | FastAPI key-analysis service and Python dependencies. |
| `worker.js`, `functions/api/` | Site Worker and API handlers, including feedback/subscription services. |
| `tests/`, `tools/`, `docs/` | Regression coverage, maintenance/build helpers, and project documentation. |

Track `key`, `style`, `mood`, and `bpm` are distinct data fields. Some BPM values are empty; do not invent values or infer metadata from song titles. Consult the actual [track data](data/tracks.json) rather than a fabricated sample record.

### Key Finder API

The current frontend uses asynchronous analysis jobs and polls their status:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Service readiness |
| POST | `/api/analyze-file/jobs` | Create an audio-upload analysis job |
| GET | `/api/analyze-file/jobs/{jobId}` | Poll the audio job |
| POST | `/api/analyze/jobs` | Create a YouTube-link analysis job |
| GET | `/api/analyze/jobs/{jobId}` | Poll the YouTube job |

See [the frontend API adapter](src/services/keyFinderApi.mjs) and [FastAPI implementation](api-server/app.py). Local development defaults to `http://127.0.0.1:8000`; production analysis uses `https://api.jamtrackshub.com`.

## Automation

| Workflow | Purpose |
| --- | --- |
| [CI](.github/workflows/ci.yml) | Runs tests, JavaScript syntax checks, and Cloudflare build/output verification. |
| [Umami analytics report](.github/workflows/umami-analytics.yml) | Creates analytics issue reports when Umami API access is configured. |
| [Umami README snapshot](.github/workflows/umami-readme-screenshot.yml) | Captures a validated All Time dashboard snapshot for the daily README update. |

The current analytics image remains at `assets/analytics/umami-dashboard.png`; dated copies use `assets/analytics/history/YYYY-MM-DD.png`. The snapshot updater owns only the marked analytics block in this README. Explanatory text outside those markers is maintained separately.

For operational details, see [Umami analytics](docs/UMAMI_ANALYTICS_ACTION.md) and [subscription setup](docs/SUBSCRIBE_SETUP.md). Do not put share credentials, tokens, or subscriber data in documentation.

## License

Jam Tracks Hub uses a split licensing model. Original source code and software components are available under the [MIT License](LICENSE), except where otherwise noted. Repository-level MIT license detection applies only to that covered software and does not extend to the excluded content below.

| Material | License / Rights |
| --- | --- |
| Source code and software components | [MIT License](LICENSE), except where otherwise noted |
| Audio files and backing tracks | All rights reserved unless separately licensed |
| Downloadable ZIP/PDF music resources | All rights reserved unless separately licensed |
| Images and artwork | All rights reserved unless separately licensed |
| Jam Tracks Hub logos, wordmarks, and other brand assets | All rights reserved; no trademark or brand-use rights granted |
| Third-party materials | Their respective licenses and copyright terms |

See [Content and Brand Rights](LICENSE-CONTENT.md) for the complete scope and exclusions.
