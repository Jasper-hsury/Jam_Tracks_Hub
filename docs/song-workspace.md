# Song Workspace

Song Workspace is a browser-local area for building reusable chord and lyric charts. It is available at `song-workspace.html` and does not require an account.

## Local Data And Privacy

- Songs are stored in this browser with IndexedDB.
- Song titles, lyrics, chords, and workspace preferences are not uploaded to Jam Tracks Hub.
- The workspace does not send song content to the subscribe, feedback, analytics, or key-analysis APIs.
- Clearing site data, using private browsing, or changing devices can remove or hide local songs.
- Use **Backup All** before clearing browser data or moving to another device.
- If local storage is unavailable, the editor remains usable for the current session and shows an explicit warning. Download the current song or a backup before leaving.

The local-first claim is limited to Song Workspace song content. The page still loads ordinary site assets and localization files; it does not claim that Jam Tracks Hub collects no operational or website data elsewhere on the site. General Umami analytics remains enabled on other Jam Tracks Hub pages, but the tracker is deliberately not loaded on Song Workspace.

## No Song Content Egress

Song Workspace has a content-free observability boundary:

- Its production app, core, and storage modules contain no `fetch`, XHR, `sendBeacon`, WebSocket, EventSource, FormData upload, remote persistence, telemetry, console forwarding, global error forwarding, or custom analytics event path.
- The page has no third-party executable script. In particular, Umami is not loaded on Song Workspace, so automatic pageviews, path-change tracking, future session-replay configuration, and analytics-side DOM access cannot observe the workspace editor. Site-wide Umami remains present on other pages.
- The remaining Google Fonts stylesheet is presentation-only. The page uses `Referrer-Policy: no-referrer` through its HTML metadata, and neither its URL nor the stylesheet request contains song content.
- `document.title` is always the fixed localized product title. User-entered title, artist, lyrics, section names, chord anchors, ChordPro, and JSON never become the page title.
- Editor navigation accepts only internally generated opaque song IDs. JTH JSON import and Backup Restore assign fresh internal IDs before storage/navigation, while unsafe or legacy IDs fall back to the fixed `song-workspace.html` URL.
- JSON, pasted-chart, and ChordPro parser failures use generic bounded messages. Production Song Workspace code does not log raw input or Song Documents to the console.

Shared i18n code performs GET requests for fixed locale JSON files, and shared site code contains a homepage subscription handler that is inactive because Song Workspace has no subscription form. Neither path receives a Song Document or any user song field. Synthetic canary regression tests and browser inspection cover URL, title, error, console, and transport boundaries without committing third-party lyrics.

## User-Facing Disclosure And Content Rights

The create area gives one short, non-blocking explanation that song content is stored in the current browser and is not uploaded to Jam Tracks Hub. It also asks users to import only material they have the right or legal permission to use. The wording intentionally refers to the browser rather than promising device-wide or permanent storage.

The shared Create/Import dialog adapts its local-processing sentence to the selected mode:

- **Chords + Lyrics / Lyrics Only**: pasted song content is processed and stored locally in the browser.
- **Chords Only**: the song data is stored in the browser without unnecessary lyric-specific wording.
- **ChordPro**: ChordPro text is parsed in the browser and is not uploaded to Jam Tracks Hub.

The Jam Tracks Hub JSON card explains that imported projects remain in the browser. The local library separately warns that clearing browser or site data may remove songs. The existing `privacy-policy.html` legal-information page now distinguishes Song Workspace local content from Key Finder processing and records a bounded user-provided-content responsibility: local processing does not itself determine whether a use is legally permitted.

Every standard site footer also exposes the localized, keyboard-accessible **Legal & Usage Policy / 法律與使用規範** link. The bookmarkable `legal.html` page covers bounded terms of use, Song Workspace local storage, copyright and user-provided content, exports, other network-backed site features, and practical tool limitations. It complements rather than replaces the existing privacy page, does not claim that local processing makes a use lawful, and does not use blanket liability language. Human legal review is recommended before a commercial-scale release.

## Creating And Importing Songs

The **Create Song** area keeps the three common starting points prominent:

- **Chords + Lyrics**: paste alternating chord and lyric lines, section headings, chord-only lines, and common leading metadata.
- **Lyrics Only**: paste lyrics, then add and position chords in the visual line editor.
- **Chords Only**: create instrumental chord charts without requiring lyric text.

The lower-weight **Other Import Options** area is for existing data rather than a fourth creation method:

- **ChordPro**: import common metadata, inline chord anchors, and straightforward section directives.
- **Jam Tracks Hub JSON**: restore one complete, validated Song Document V2 project previously exported from the workspace. Single-song import uses the canonical deserializer, assigns a fresh opaque song ID, writes the result to IndexedDB, refreshes the in-memory collection, and opens the imported song. Invalid, empty, or wrong-schema files receive a generic localized error without echoing file content.

Create and ChordPro dialogs keep validation attached only to the real **Create** or **Import ChordPro** submission. X, Cancel, and Escape always close immediately—even when required fields are empty or only partly filled—and do not disable submit-time validation.

ChordPro is a plain-text interchange format such as `[G]lyrics [D]lyrics`; it is not the complete Jam Tracks Hub project format. The optional “What is ChordPro?” disclosure explains the inline markers without blocking the primary creation flow.

Library-level portability remains separate:

- **Restore Backup**: add the validated songs from a Song Workspace backup without silently deleting existing songs.
- **Backup All**: export the complete local library backup envelope.

Single-song `.jth.json` import and library backup restore are intentionally separate paths. The former accepts one `jamtrackshub-song` document; the latter accepts only the versioned `jamtrackshub-song-backup` envelope.

Recognized leading text metadata includes `Title`, `Artist`, `Key`, `Tempo` or `BPM`, and `Time Signature`. ChordPro import recognizes the corresponding common directives. The parsers are intentionally conservative and bounded; ambiguous content remains editable instead of being guessed as a chord.

## Editing And Music Tools

Each song keeps one canonical Song Document. Transposed, capo, simplified, Roman numeral, and Nashville Number views are computed from that source and do not overwrite the original chart.

- **Unlimited Transpose** changes the concert key and all supported chord roots, including slash-bass notes.
- **Chord Spelling** separates canonical pitch identity from display labels. **Music Theory** applies a bounded common-key spelling policy, including conventional `C#m` rather than `Dbm` for C-sharp minor. **Preserve Input** retains explicit source spelling when the song remains in its entered key and respects an explicitly selected sharp- or flat-based target key. Slash roots and bass notes follow the same policy, while `C#` and `Db` remain the same pitch class and use the same local voicing engine.
- **Smart Capo** compares capo positions and offers playable shape-key alternatives.
- **Easy Chords** offers balanced and beginner simplifications while leaving unsupported or ambiguous harmony unchanged.
- **Number Charts** show Roman numeral or Nashville Number views, including common non-diatonic roots.
- **Visual chord editing** stores each chord's direct zero-based `anchorPosition`. A Chinese character is one meaningful position; an English unit separated by whitespace is one meaningful position. Whitespace and standalone punctuation are not positions. Apostrophes and hyphens without whitespace stay inside one English unit. Lyric lines do not add a separate Start position, and an English word cannot receive a sub-word anchor unless the user intentionally inserts whitespace.
- **Edit Line chord positioning** no longer exposes a separate Move action. Choose **Edit** on an existing chord, select its new meaningful position, and use **Update Chord** before saving the line.
- **Delete Line** removes only the line currently open in Edit Line, including its text and chord positions. Sibling line/section IDs remain unchanged, and deleting the final line keeps the now-empty section available for a new insertion. Autosave persists the result.
- **Add Instrumental Section** is the chord-only path for intros, interludes, solos, outros, and other passages without lyrics. The `+ Add` menu opens a small dialog for an optional section name and 1–64 bars (default 4). Each bar is the existing Song Document V2 `instrumental` line model: empty lyric text plus an ordered chord collection, never a fake lyric or lyric-anchor token. Instrumental sections render as a content-width-driven horizontal grid: four bars per row in narrow/medium containers and eight in wide containers. Ordered chord content is above a recalculated localized Bar label, and an empty bar uses a subtle em dash instead of lyric-oriented “Empty line” copy. The same grid renders in Performance Mode; Print/PDF uses eight compact columns. Contextual **Add Bar**, **Edit Bar**, **Save Bar**, and **Delete Bar** wording; section rename/delete; stable IDs; autosave/reload; all chord views; transpose/capo/shapes; Performance Mode; and existing exports continue through the same paths.
- **Instrumental card presentation** follows the established Write Your Own Progression export-chip language: a small muted localized Bar/index label leads a larger bold chord area inside a softly surfaced rounded card. The workspace reuses shared site color/radius concepts while retaining its own editable DOM and the existing 4/8-column chart rule. Multiple ordered chords, long chord symbols, and the empty `—` state wrap within the card instead of changing the persistent bar model. Performance uses the same visual family; Print/PDF uses a compact variant.
- **Chord symbol input hint** includes `Cmaj9` alongside root, slash, and seventh examples. The common parser, transpose/spelling, Roman/Nashville renderer, and shared chord-shape engine accept this example; it is not placeholder-only syntax.
- **Single-row chord annotations** keep every lyric line on one chord row. Labels stay left-aligned to their logical lyric anchors, while bounded presentation-only condensation handles ordinary tight spacing without stretching or modifying lyrics.
- **Chord Shapes** use the same shared voicing engine and interval-color tokens as Chord Dictionary and Write Your Own Progression. The picker now also reuses the Progression Writer dialog header, result summary, Position and Root string filters, responsive card grid, shape metadata, **Use Shape** action, and text **Close** control. Filters operate on actual generated voicing position/root data; no fake filter UI or second shape database is introduced.
- **Shape Picker scroll contract** keeps the document body fixed while the native dialog is open. Close, Escape, and voicing selection share one close path; selection replaces only the affected diagram, focus returns to the originating button while the body is still locked, and the captured page position is restored once with instant scroll behavior before unlock completes. The dialog retains its own bounded vertical scrolling.
- **Performance Mode** presents a focused chart with target key, capo, shape key, BPM, font controls, and adjustable auto-scroll. Auto-scroll derives its 1.0× base from `BPM / 60 × 24px per beat`, calibrated so 120 BPM retains the previous 48px/s default and a typical four-beat chart line advances at roughly the current visual line rhythm. The base is bounded to 18–96px/s, missing or invalid BPM falls back to 48px/s, and the user's independent 0.5×–2.0× multiplier remains unchanged when BPM changes. Scrolling accumulates fractional distance from elapsed time, so 60Hz and 120Hz displays progress at the same rate, and stops at the content end. Time signature is song metadata but does not currently enter the speed formula. Content/section height, Zoom, Line Spacing, and the available viewport change the chart's total scrollable distance and perceived duration, not the BPM-derived pixels-per-second velocity. A localized in-context disclosure states this relationship and points users to **Scroll Speed** for manual feel adjustments.

## Inline Score Metadata And Section Actions

Song title, artist, BPM, and time signature now belong to the Song Chart header instead of a separate form card above the score. The normal state reads like a score heading: title first, then one compact artist/BPM/time-signature line. A title hover/focus hint on pointer devices and a title tap on touch devices open a bounded inline title editor. Artist, BPM, and time signature share one **Edit details** action. Save commits to the same canonical Song Document and existing autosave path; Cancel restores the current saved value, and typing in either draft does not mutate the song or re-render the chart on every keystroke. Title remains required, BPM remains 20–320 when present, and time signature retains bounded numeric-fraction validation.

Section headings use the same contextual pattern. A lyric, instrumental, or empty section normally shows only its title. Hover/focus reveals a small **Edit** hint on pointer devices; click or mobile tap opens the existing Rename and Delete actions. Escape or an outside click dismisses the actions, while Delete retains its explicit confirmation and existing stable-ID/autosave behavior. Line and bar edit controls remain contextual to their own content.

## Chart Reading Controls

The editor exposes two compact navigation rows. Row 1 contains Original Key, Target Key, Capo, Shape Key, Chord Spelling, Zoom, and Line Spacing. Row 2 contains only Original, Balanced, Beginner, Roman, and Nashville, with Chord Change Hints and Smart Capo remaining a trailing action group in the same row. At 1280 and 1024 CSS pixels both navigation rows stay single-line; the 768 layout may group the two reading steppers into an internal second subrow without turning the controls into a form card, while the five modes remain one row. At 720 px and below, one explicit, keyboard-operable **Song settings** disclosure replaces the visible settings row; its stable summary strip is the only collapse target, and Zoom plus Line Spacing remain side by side inside the expanded panel. The mode choices use their existing deterministic mobile grid.

Key explanations are contextual instead of consuming a permanent third settings row. Hovering a key/capo setting with a fine pointer, focusing its native control, or activating its small help button opens one bounded localized popover; Escape, focus departure, or an outside click dismisses it. Mobile uses the same help button as an explicit tap target. **Original Key** is the song's source key, **Target Key** is the concert key listeners should hear, **Shape Key / 演奏指型調性** is the chord-shape key the player holds, and **Capo** raises that shape key to the target. For example, Target A with Capo 2 uses G shapes and sounds in A.

The localized **Song Chart Zoom** control uses a symmetric minus/value/plus stepper, so the complete numeric value and `%` suffix stay geometrically centered between equal-size buttons. Minus/plus move in 10-percentage-point steps, while the native numeric field accepts any whole percentage from 50 through 150. JavaScript normalizes every committed value: numeric values are rounded and clamped, while empty or non-numeric input restores the last valid value. Missing or invalid stored values fall back to 100.

Zoom is a browser-local interface preference stored with the existing lightweight workspace preferences. It is not part of the Song Document and never enters URLs, analytics, remote logs, JTH JSON, ChordPro, TXT, or other song transports. Main Chart and Performance Mode read the same preference; Performance's text-size buttons update it rather than maintaining a second scale. Print/PDF explicitly resets to its compact 100% print baseline.

The adjacent localized **Line Spacing** control uses the same symmetric stepper. Its default is 10 px, minus/plus move by 1 px, and direct whole-number input is rounded and clamped from 0 through 20 px. Empty or non-numeric input restores the last valid value; missing or invalid stored values fall back to 10 px. The setting changes only the block spacing around non-instrumental lyric/chord rows. It does not change lyric line-height, chord anchors, annotation fitting, instrumental cards, or persistent song data. Editor and Performance Mode share the same browser-local preference across reloads and song changes. Print/PDF remains independent and uses a fixed compact 5 px spacing baseline.

At 100%, the new desktop reading baseline is 19 px for lyrics, 16.5 px for chord annotations, 17 px for instrumental chords, and 22 px for section headings. The narrow-screen baseline is 17 px, 15.5 px, 16 px, and 20 px respectively. Lyrics use a 1.75 line height. Zoom is implemented with reflowing font and spacing values—not `transform: scale()`—and every text category has a bounded minimum/maximum so 50% remains usable while 150% can reflow without clipping. Meaningful-position anchors and the single-row chord-annotation policy remain canonical and independent of the reading preference.

## Read Mode

**Read Mode** is a presentation-only workspace state distinct from Performance Mode. It reuses the current computed chord view and the existing chart renderer with editing disabled; it does not duplicate or mutate the Song Document. It is not stored in preferences, IndexedDB, URLs, analytics, JTH JSON, ChordPro, TXT, Print/PDF, or any network path.

Entering Read Mode hides the page hero and editor chrome, including settings/modes, Rename/Delete, Add Line/Bar/Section, and inline title/metadata controls. The compact toolbar keeps only Exit Read Mode, the concert/capo/shape summary, the shared Zoom and Line Spacing steppers, and a Chord Shapes toggle. The score header retains title, artist, BPM, and time signature. Exiting restores the ordinary editable workspace and its prior scroll context. Read Mode and Performance Mode cannot be active simultaneously; the application exits Read Mode before opening Performance and can return to the reading state after Performance closes.

At 100% Zoom, Read Mode uses its own compact reflow baseline—approximately 15.5 px lyrics, 14 px chord annotations, 18 px section headings, and 14.5 px instrumental chords—without `transform: scale()`. The same stored 50–150 Zoom and 0–20 Line Spacing preferences are reused, but the compact row spacing applies a smaller presentation factor. Canonical chord anchors, the single-row annotation invariant, and exports remain unchanged.

Instrumental sections remain four bars per row on narrow screens and eight in wide score containers, but use shorter compact cards in Read Mode. Chord Shapes is collapsed by default so the score receives the full content width. **Show Chord Shapes** opens a fixed, independently scrollable drawer with a visible Close control and outside backdrop; opening or closing the drawer does not reflow the score or move the document scroll position.

Autosave runs after a short editing pause. Song metadata, sections, lyric lines, and chord anchors are saved together in IndexedDB. Its existing neutral, Saving, saved, and unavailable states now occupy the fourth Hero promise badge with a polite live region. The former editor-topbar status was removed, so an unopened workspace shows neutral **Saved locally** rather than claiming a nonexistent active song has already been saved.

The shared Chords + Lyrics, Lyrics Only, Chords Only, and ChordPro Create/Import dialog remains vertically scrollable when its content exceeds the viewport, but hides its native scrollbar with Firefox and WebKit-compatible CSS. Keyboard focus can still scroll to the footer actions; content is not clipped.

Create/Import, Edit Line, Add Section, Add Instrumental Section, and Shape Picker reuse one shared background-lock utility. Opening a dialog captures the exact document scroll position, fixes the background with measured scrollbar compensation, and leaves the dialog's own scrolling enabled. X, Cancel, Escape, successful Create/Import, Save, Delete Line/Delete Bar, and shape selection restore focus where applicable and restore the captured page position once with instant scroll behavior.

## Downloads And Backups

The current song can be downloaded as:

- Jam Tracks Hub Song Document V2 JSON
- ChordPro
- Plain text
- A browser print view for PDF output

**Backup All** exports all locally saved songs. Import and restore files are size-limited, version-checked, and normalized before they are stored. Downloaded files never contain browser credentials, cookies, preferences, or unrelated site storage.

Song Document V2 is the first canonical meaningful-position format. Pre-release V1 character-offset songs are not accepted as V2 and do not enter a permanent compatibility layer. Older development-only IndexedDB records remain untouched and are safely skipped during loading, without showing a pre-release compatibility warning or deleting those records.

The Download menu provides one accessible, non-blocking reminder that JSON, ChordPro, TXT, and Print/PDF output may contain lyrics or other user-entered content and should be used or shared only where the user has the necessary rights or legal permission. Export features are unchanged and do not add confirmation dialogs.

## Keyboard And Accessibility

All primary controls use native buttons, inputs, selects, or dialogs. Download menus expose menu semantics, status messages use live regions, and focus remains keyboard-accessible. In Performance Mode:

- `Space` starts or pauses auto-scroll.
- `+` and `-` adjust chart text size.
- `Esc` closes the performance dialog.

Reduced-motion preferences disable nonessential transitions and smooth scrolling.

## Button And Interaction Language

Song Workspace controls reuse the site's established primary, secondary, danger, subtle, icon, segmented, toggle, and menu-action semantics. They share the Jam Tracks Hub theme tokens for color, depth shadow, border, radius, active feedback, disabled presentation, and focus ring while retaining component-specific hierarchy: `+ Add` remains subtle, mode selectors remain segmented, destructive actions remain clearly marked, and modal/performance controls keep touch-friendly targets. Light/dark and reduced-motion behavior follow the same system used by Write Your Own Progression and the other music tools.

## Known V1 Limits

- Chord and ChordPro parsing covers common syntax, not every informal chart convention or ChordPro extension.
- Local songs do not sync between browsers or devices.
- Smart Capo uses a bounded chord-difficulty heuristic rather than instrument-specific fingering history.
- Chord shapes are generated from the shared local voicing engine; Song Workspace does not maintain a separate shape database.
- PDF output uses the browser print dialog.
