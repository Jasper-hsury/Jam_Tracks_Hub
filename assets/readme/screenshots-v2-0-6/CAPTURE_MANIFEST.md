# README screenshot candidate manifest

Captured and visually reviewed on 2026-09-17 from the live production site in
Safari. Governing specification: `docs/README_SCREENSHOT_SPEC.md`.

## Common capture properties

- Five original JPEG files, each 1366 × 768 pixels, verified with `sips`.
- The dimensions describe the browser-window capture raster, not a measured CSS
  viewport or physical monitor size. Browser zoom remained at actual size.
- Same full-screen Safari window, one visible task tab, address bar and toolbar.
- Visible window only; no full-page capture, resizing, cropping or image editing.
- English and light theme, with production typography, colors and layout intact.
- Each saved file was visually checked: no Dock, OS menu bar, other app windows,
  private song content, notifications, assistant floats, devtools or error overlays.
- A normal pointer and faint pointer highlight remain in the blank right margin.
- No form submissions, uploads, analysis jobs, song edits or production changes.
  Key Finder's automatic API health check completed without starting an analysis.

## Pages and review

The `.html` navigation links resolve to the extensionless production URLs below.
All captures are at the top of their page, with desktop navigation visible.

| File | Observed production URL | Content and limitations | Spec review |
| --- | --- | --- | --- |
| `homepage-safari-light.jpg` | https://jamtrackshub.com/#home | Hero, two CTAs, statistics and the first workflow cards; lower sections naturally continue below the viewport. | PASS |
| `tracks-safari-light.jpg` | https://jamtrackshub.com/tracks | Library title, filters, track count, two complete cards and the next card entering the viewport. Refreshed and recaptured after rejecting a frame containing a floating icon. | PASS |
| `song-workspace-safari-light.jpg` | https://jamtrackshub.com/song-workspace | Local-first introduction, three creation choices and browser-storage notice. Does not demonstrate the editor/reader; existing private songs below the viewport were neither opened nor photographed. | PASS |
| `key-finder-safari-light.jpg` | https://jamtrackshub.com/key-finder | Upload and URL analysis controls, API connected, idle readiness message. No input supplied or analysis started. | PASS |
| `progression-writer-safari-light.jpg` | https://jamtrackshub.com/progression-writer | Format, song information, four empty chord fields with production placeholders, save/download controls. No progression entered or saved. | PASS |

These are README candidates rather than integrated README images. Headings and
overall structure remain useful at README width; small navigation, help text and
control labels become harder to read when downscaled. Link to the original image
for detailed inspection. The Song Workspace candidate emphasizes local-first
onboarding, not an editor demonstration containing user data.

## SHA-256

```text
4e6cf8060596baab10f0f7dc2205fe5b9838ce9ade7d5bf8a731838e9be9c69c  homepage-safari-light.jpg
63415746b642be8fc27a1ce800e5be7867a26c6822930dae71288c4a7813a3ce  key-finder-safari-light.jpg
7660945bfa7372eb543d1b4a61024d70000996b77733e9b26d256fea8b1cb425  progression-writer-safari-light.jpg
89463f53624f8c82dd85ca34e5af9ed572c029cd292729aa76372384f54c3638  song-workspace-safari-light.jpg
b288fe8eedd2f0f4bfa7c6c8c0f76cb18fa5f4c58d6cb07b167759de0b0507df  tracks-safari-light.jpg
```

## Repository boundary

New candidate directory only; no previous README images were overwritten.
README text, product files and workflows are unchanged. Local commits only;
README integration, push, PR, merge and deployment require a later phase.

## Product asset completion — phase 1 of 3

Captured and reviewed on 2026-09-17. This additional batch follows the user's
expanded product-gallery scope; the preceding sections document the original
five-image batch. The original five are now explicitly approved, including their
cursor/halo. Cursor cleanup is no longer blocking and their bytes remain unchanged.

### Source-confirmed page identities

Source was inspected at `fe8ed72591fe2ebd6088b24c1ca3c02ac40a5618`, with
`origin/main` at `54fd0c867fd064bbfa2f0f074e09da170c89e729`. Canonical tags
declare the `.html` addresses; Safari resolved those to the extensionless URLs
recorded below. These are live production captures, not local builds.

| Page | Source confirmation | Declared canonical production URL | Observed capture URL |
| --- | --- | --- | --- |
| Chord Dictionary | `chord-dictionary.html:10` | https://jamtrackshub.com/chord-dictionary.html | https://jamtrackshub.com/chord-dictionary |
| Scale Explorer | `scale.html:10` | https://jamtrackshub.com/scale.html | https://jamtrackshub.com/scale |
| Chord Progressions | `chord-progressions.html:10` | https://jamtrackshub.com/chord-progressions.html | https://jamtrackshub.com/chord-progressions |
| Fretboard Trainer | `fretboard-trainer.html:10` | https://jamtrackshub.com/fretboard-trainer.html | https://jamtrackshub.com/fretboard-trainer |
| Feedback | `feedback.html:8` | https://jamtrackshub.com/feedback.html | https://jamtrackshub.com/feedback |
| Service Waking | `service-waking.html:9` | https://jamtrackshub.com/service-waking.html | https://jamtrackshub.com/service-waking |
| Legal | `legal.html:8` | https://jamtrackshub.com/legal.html | https://jamtrackshub.com/legal |
| Privacy | `privacy-policy.html:8` | https://jamtrackshub.com/privacy-policy.html | https://jamtrackshub.com/privacy-policy |
| 404 | `404.html:9`; `wrangler.jsonc:9` uses `404-page`; `src/views/NotFoundView.vue` | https://jamtrackshub.com/404.html | https://jamtrackshub.com/readme-preview-not-found-7ac921 |

### New capture properties and visual review

All paths below are relative to this manifest's directory. Each file is the
unaltered JPEG bytes supplied by the supported Computer Use Safari capture flow.
Actual dimensions and format were read with `sips`, and each saved frame was
viewed in full. No browser geometry/zoom change, resize, crop, full-page capture,
composited chrome, retouching, source/DOM modification or native Screenshot-app
investigation was used. Raster dimensions include Safari chrome and are not a
claim about the CSS viewport dimensions.

`BROWSER_CHROME = REAL_SAFARI` means the real tab/title, address bar and toolbar.
`PRIVATE_DATA_VISIBLE = NO` includes private accounts, songs, lyrics, emails and
credentials. All nine also have `CREDENTIAL_VISIBLE = NO`, no notifications,
assistant overlays, unrelated windows, developer tools or debug overlays.

| PAGE | FILENAME | PIXEL_DIMENSIONS | FORMAT | LANGUAGE | THEME | BROWSER_CHROME | DOCK_VISIBLE | CURSOR_VISIBLE | CURSOR_HALO_VISIBLE | PRIVATE_DATA_VISIBLE | CAPTURE_STATUS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Chord Dictionary | `chord-dictionary-safari-light.jpg` | 1366 × 768 | JPEG | English | Light | REAL_SAFARI | NO | NO | NO | NO | PASS |
| Scale Explorer | `scale-explorer-safari-light.jpg` | 1366 × 768 | JPEG | English | Light | REAL_SAFARI | NO | YES | YES | NO | PASS |
| Chord Progressions | `chord-progressions-safari-light.jpg` | 1366 × 768 | JPEG | English | Light | REAL_SAFARI | NO | YES | YES | NO | PASS |
| Fretboard Trainer | `fretboard-trainer-safari-light.jpg` | 1366 × 768 | JPEG | English | Light | REAL_SAFARI | NO | YES | YES | NO | PASS |
| Feedback | `feedback-safari-light.jpg` | 1366 × 768 | JPEG | English | Light | REAL_SAFARI | NO | YES | YES | NO | PASS |
| Service Waking | `service-waking-safari-light.jpg` | 1366 × 768 | JPEG | English | Light | REAL_SAFARI | NO | YES | YES | NO | PASS |
| Legal | `legal-safari-light.jpg` | 1366 × 768 | JPEG | English | Light | REAL_SAFARI | NO | YES | YES | NO | PASS |
| Privacy | `privacy-safari-light.jpg` | 1366 × 768 | JPEG | English | Light | REAL_SAFARI | NO | YES | YES | NO | PASS |
| 404 | `404-safari-light.jpg` | 1366 × 768 | JPEG | English | Light | REAL_SAFARI | NO | YES | YES | NO | PASS |

### Composition and authentic-state limits

- Chord Dictionary: default C major, root/type controls, formula `1 · 3 · 5`,
  notes `C · E · G`, shape filters and beginning of actual guitar-shape cards.
  Lower diagrams continue below the viewport; no audio was played.
- Scale Explorer: default A Minor Pentatonic, scale/root controls, five visible
  note/interval badges and neck-display controls. The full fretboard is below the
  viewport; the captured musical content is the scale-note visualization.
- Chord Progressions: C major selected through the normal tonic button, triads,
  Pop staples and the first `C G Am F` progression/shape cards. Returned to the
  top using the site's Back to Top button to retain page title and navigation.
  This is not Progression Writer; lower diagrams continue below the viewport.
- Fretboard Trainer: actual default question (string 2, fret 0), note choices,
  `0 / 0` score and standard-tuning reference. Current production presents a
  string/fret quiz, not a graphical fretboard. No answer, reset or next-question
  action was taken; no fictitious fretboard was added.
- Feedback: empty normal form with production placeholders; nothing typed or sent.
- Service Waking: authentic visible `Waking the Analyzer` / service-starting
  state during the page's automatic health-check/retry lifecycle. No retry button
  was pressed, no outage induced and no analysis job created. This is a transient
  product state, not a guarantee of current backend availability.
- Legal and Privacy: page title and representative opening sections at the top.
- 404: the harmless nonexistent URL naturally rendered the canonical Vue error
  content (`404`, `This page missed the downbeat.`, Return Home, Open Key Finder),
  consistent with the source's `404-page` asset routing. No route was changed.

Small controls/text will require opening the original file for close reading at
GitHub README widths. Natural continuation below the visible viewport is retained.

### New-file integrity

| Filename | Bytes | SHA-256 |
| --- | ---: | --- |
| `chord-dictionary-safari-light.jpg` | 148917 | `587cb7dd0babd59e45b803dd454ee01efad977360fd11bf09cd5868a21b34408` |
| `scale-explorer-safari-light.jpg` | 125747 | `f64814f0a76083c21c7c51d21509e6d01db4627937e2e8075cba94b33b905a3f` |
| `chord-progressions-safari-light.jpg` | 123644 | `d38cdf78102eaa0ba165534fc3d23525188724dbabeb92e1374b1ca142b9cc7c` |
| `fretboard-trainer-safari-light.jpg` | 115994 | `634079de67c6583cdc5716b197b4616a95942fe5fbf44d8c1d42da8b546693d8` |
| `feedback-safari-light.jpg` | 97130 | `91e28ec711ffd271639a996da57ef2f11e9b07069f745aeecd18166961fab47f` |
| `service-waking-safari-light.jpg` | 72577 | `944e81fb3da6f161160f733a29975dde5ef5671ea8c79c009526cdea3c864168` |
| `legal-safari-light.jpg` | 155945 | `49d74b34101340495f1a15d52acd22946ba5d8baab353b9622719e03207e2020` |
| `privacy-safari-light.jpg` | 159614 | `9b24adb9eda3e02ea78d6287ada2557aa61d17d76ffa8dea2e6793f274de1f12` |
| `404-safari-light.jpg` | 74593 | `c9e893b81ad364ca1763de42eafaf0369aed0870af874ac54299acf23e496d3f` |

### Coverage and protected files

| Group | Page | Status |
| --- | --- | --- |
| Primary | Homepage | EXISTING / APPROVED |
| Primary | Tracks | EXISTING / APPROVED |
| Primary | Chord Dictionary | NEW / PASS |
| Primary | Key Finder | EXISTING / APPROVED |
| Primary | Song Workspace | EXISTING / APPROVED |
| Primary | Progression Writer | EXISTING / APPROVED |
| Secondary | Scale Explorer | PASS |
| Secondary | Chord Progressions | PASS |
| Secondary | Fretboard Trainer | PASS — authentic quiz UI; no graphical fretboard |
| Secondary | Feedback | PASS |
| Secondary | Service Waking | PASS — authentic transient state |
| Secondary | Legal | PASS |
| Secondary | Privacy | PASS |
| Secondary | 404 | PASS |

All five original SHA-256 values in the earlier section were checked before and
after this phase and match exactly. `EXISTING_APPROVED_IMAGE_BYTES_CHANGED = NO`.
README SHA-256 before and after:
`3e0714dd1ad0ade24dc9748789be090720e248d56ded46253dc5b8abae5784d4`.
`README_CHANGED = NO`; runtime, analytics assets/automation and original user
branch/artifacts are outside this phase's changes. Only the nine new JPEGs, this
existing manifest and the minimal acceptance-policy update to the existing spec
are included. No push, PR, merge, deployment or Phase 2 work is authorized here.
