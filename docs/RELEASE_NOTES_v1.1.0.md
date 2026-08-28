# Jam Tracks Hub v1.1.0

A backward-compatible Song Workspace feature and responsive UX release.

## Song Workspace

- Added one mobile Global Add modal for Line, Section, and Instrumental Chords.
- Added a compact, type-aware insertion-position chooser inside the locked modal flow.
- Preserved background lock, focus restoration, scroll position, stable IDs, autosave, and existing editors during modal handoff.
- Removed repeated inline Add controls from the mobile workspace while retaining the established tablet and desktop insertion flow.
- Improved mobile lyric wrapping and responsive chart density.
- Refined tablet mode navigation, including bounded Nashville sizing.
- Added icon-before-text presentation for Back, Download, Read Mode, and Performance Mode across mobile, tablet, and desktop.
- Aligned Original Key, Target Key, Capo, Shape Key, Chord Spelling, Zoom, and Line Spacing controls across responsive layouts.
- Prevented narrow mobile action cards from overflowing and aligned the mobile Song Chart Add action with the chart header.

## Regression Fixes

- Restored the established Tracks Hub homepage entrance animation.
- Preserved single-row chord annotations, meaningful lyric anchors, Shape Picker scroll stability, Read Mode, and BPM-linked Performance Mode behavior.

## Privacy

Song Workspace content continues to be processed and stored locally in the browser. The Global Add workflow does not add a song-content network transport.

## Unchanged

- Key Finder backend architecture
- Render runtime and deployment configuration
- Cloudflare provider topology
- Production secret requirements

