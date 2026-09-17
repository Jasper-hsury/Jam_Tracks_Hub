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
