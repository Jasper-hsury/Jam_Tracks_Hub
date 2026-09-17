# README screenshot capture specification

Locked on 2026-09-17 for README refresh preparation phases 1–3.

## Repository and scope

- Repository: `Jasper-hsury/Jam_Tracks_Hub`.
- Remote: `git@github.com:Jasper-hsury/Jam_Tracks_Hub.git`.
- Base: `origin/main` at `54fd0c867fd064bbfa2f0f074e09da170c89e729`.
- Local branch: `docs/readme-refresh-v2-0-6`, created in an isolated worktree.
- This phase adds this specification and new screenshot candidates only.
- README text, existing images, application code, workflows and production remain unchanged.
- Fetch and compare main before each local commit. Stop committing if main drifts;
  do not integrate the drift in this phase. No push, PR, merge or deployment.

## Capture master

- Use the real Safari browser with its address bar, tab bar and standard toolbar.
- Capture the entire visible browser window only, never a scrolling full-page image.
- Keep the natural desktop composition of the approved bright Safari example.
- The current capture provider emits **1366 × 768 JPEG**. Save those original bytes.
- This is the screenshot raster size, not a separately measured CSS viewport or
  physical monitor resolution. Browser chrome occupies part of this raster.
- The earlier 2560 × 1440 trial was resampled. Do not reuse its resampling step.
- Do not resize, upscale to 4K, simulate a different monitor, stitch, add artificial
  browser chrome, crop to the hero, or alter image content after capture.
- Keep one Safari window at the same size throughout the set. Full-screen window
  presentation is allowed to exclude the Dock; it is not a full-page screenshot.
- Keep the tab bar visible with one task tab. Do not expose unrelated user tabs.
- Use the production site's light theme and English. Keep actual-size browser zoom.
- Preserve the site's own spacing, colors, typography and responsive layout.
- Wait for loading, transitions and font rendering to settle. Move focus away from
  buttons and cards before capture; dismiss menus and transient browser prompts.
- Never show the Dock, other app windows, private information, notifications,
  assistant/chat overlays, developer tools or console overlays.
- Only normal read-only navigation and modest scrolling are allowed. Never submit
  forms, run Key Finder analysis, upload files or modify songs/browser-local data.

## Candidate pages and filenames

Save new files under `assets/readme/screenshots-v2-0-6/`; do not overwrite existing
README assets. Use `.jpg` because the capture provider returns JPEG, not PNG.

| Page | Production URL | Filename | Composition |
| --- | --- | --- | --- |
| Homepage | https://jamtrackshub.com/#home | `homepage-safari-light.jpg` | Hero, both CTAs, navigation and first workflow section entrance |
| Tracks | https://jamtrackshub.com/tracks.html | `tracks-safari-light.jpg` | Library identity, filters and track cards |
| Song Workspace | https://jamtrackshub.com/song-workspace.html | `song-workspace-safari-light.jpg` | Local-first workspace interface, without private song content |
| Key Finder | https://jamtrackshub.com/key-finder.html | `key-finder-safari-light.jpg` | Upload/analyze controls in idle state; no analysis job |
| Progression Writer | https://jamtrackshub.com/progression-writer.html | `progression-writer-safari-light.jpg` | Writing interface in its existing state; no save or edit |

If Progression Writer is visually unrepresentative, prefer Chord Dictionary, then
Scale Explorer. At most two extra candidates may be added (five to seven total).
Modest scrolling may reveal the principal controls, without changing window size.

## Review and reuse

Review every image visually, confirm its dimensions/format and production address,
and check consistent chrome, light theme, English, privacy and visible-only framing.
Record per-image capture details, file hashes and limitations in a capture manifest.
Natural clipping at the viewport bottom is acceptable; clipping essential controls
or the hero is not. At README display width the main headings must remain useful;
small control labels may require opening the original image for detailed reading.

Run `git diff --check`; inspect the exact staged paths before each local commit.
Verify the original branch HEAD, tracked status and the six approved untracked
artifact hashes are unchanged. Stop before editing or integrating images into README.
