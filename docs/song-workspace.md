# Song Workspace

Song Workspace is a browser-local area for building reusable chord and lyric charts. It is available at `song-workspace.html` and does not require an account.

## Local Data And Privacy

- Songs are stored in this browser with IndexedDB.
- Song titles, lyrics, chords, and workspace preferences are not uploaded to Jam Tracks Hub.
- The workspace does not send song content to the subscribe, feedback, analytics, or key-analysis APIs.
- Clearing site data, using private browsing, or changing devices can remove or hide local songs.
- Use **Backup All** before clearing browser data or moving to another device.
- If local storage is unavailable, the editor remains usable for the current session and shows an explicit warning. Download the current song or a backup before leaving.

## Creating And Importing Songs

The **Create Song** area keeps the three common starting points prominent:

- **Chords + Lyrics**: paste alternating chord and lyric lines, section headings, chord-only lines, and common leading metadata.
- **Lyrics Only**: paste lyrics, then add and position chords in the visual line editor.
- **Chords Only**: create instrumental chord charts without requiring lyric text.

The lower-weight **Other Import Options** area is for existing data rather than a fourth creation method:

- **ChordPro**: import common metadata, inline chord anchors, and straightforward section directives.
- **Jam Tracks Hub JSON**: restore one complete, validated Song Document V1 project previously exported from the workspace.

ChordPro is a plain-text interchange format such as `[G]lyrics [D]lyrics`; it is not the complete Jam Tracks Hub project format. The optional “What is ChordPro?” disclosure explains the inline markers without blocking the primary creation flow.

Library-level portability remains separate:

- **Restore Backup**: add the validated songs from a Song Workspace backup without silently deleting existing songs.
- **Backup All**: export the complete local library backup envelope.

Recognized leading text metadata includes `Title`, `Artist`, `Key`, `Tempo` or `BPM`, and `Time Signature`. ChordPro import recognizes the corresponding common directives. The parsers are intentionally conservative and bounded; ambiguous content remains editable instead of being guessed as a chord.

## Editing And Music Tools

Each song keeps one canonical Song Document. Transposed, capo, simplified, Roman numeral, and Nashville Number views are computed from that source and do not overwrite the original chart.

- **Unlimited Transpose** changes the concert key and all supported chord roots, including slash-bass notes.
- **Smart Capo** compares capo positions and offers playable shape-key alternatives.
- **Easy Chords** offers balanced and beginner simplifications while leaving unsupported or ambiguous harmony unchanged.
- **Number Charts** show Roman numeral or Nashville Number views, including common non-diatonic roots.
- **Visual chord editing** stores chord positions as logical Unicode character anchors, so Chinese and English lyric positions remain stable across responsive layouts.
- **Single-row chord annotations** keep every lyric line on one chord row. Labels stay left-aligned to their logical lyric anchors, while bounded presentation-only condensation handles ordinary tight spacing without stretching or modifying lyrics.
- **Chord Shapes** link unique computed chords to the existing Chord Dictionary instead of duplicating its guitar-shape database.
- **Shape Picker scroll contract** keeps the document body fixed while the native dialog is open. X, Escape, and voicing selection share one close path; selection replaces only the affected diagram, focus returns to the originating button while the body is still locked, and the captured page position is restored once with instant scroll behavior before unlock completes. The dialog retains its own bounded vertical scrolling.
- **Performance Mode** presents a focused chart with target key, capo, shape key, BPM, font controls, and adjustable auto-scroll.

Autosave runs after a short editing pause. Song metadata, sections, lyric lines, and chord anchors are saved together in IndexedDB.

## Downloads And Backups

The current song can be downloaded as:

- Jam Tracks Hub Song Document V1 JSON
- ChordPro
- Plain text
- A browser print view for PDF output

**Backup All** exports all locally saved songs. Import and restore files are size-limited, version-checked, and normalized before they are stored. Downloaded files never contain browser credentials, cookies, preferences, or unrelated site storage.

## Keyboard And Accessibility

All primary controls use native buttons, inputs, selects, or dialogs. Download menus expose menu semantics, status messages use live regions, and focus remains keyboard-accessible. In Performance Mode:

- `Space` starts or pauses auto-scroll.
- `+` and `-` adjust chart text size.
- `Esc` closes the performance dialog.

Reduced-motion preferences disable nonessential transitions and smooth scrolling.

## Known V1 Limits

- Chord and ChordPro parsing covers common syntax, not every informal chart convention or ChordPro extension.
- Local songs do not sync between browsers or devices.
- Smart Capo uses a bounded chord-difficulty heuristic rather than instrument-specific fingering history.
- Chord shapes open in the existing Chord Dictionary; they are not embedded as a second shape library in the workspace.
- PDF output uses the browser print dialog.
