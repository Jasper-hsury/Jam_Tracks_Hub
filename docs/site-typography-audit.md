# Site Typography Role Audit

The homepage is the canonical typography source for Jam Tracks Hub. The site
uses role-to-role consistency rather than applying one style to every piece of
text.

## Canonical roles

| Role | Homepage reference | Contract |
| --- | --- | --- |
| Site brand | `.logo` | Noto Serif TC, bold, navigation-responsive size |
| Major page title | `.home-hero h1` | Noto Serif TC, 68px desktop, homepage-responsive scale, 700, 1.0 desktop line height |
| Section heading | `.home-section-heading h2` | Noto Serif TC, 34px desktop / 28px compact, 700, 1.2 |
| Subsection / small heading | `.about-connect-copy strong` | Noto Sans TC, `clamp(19px, 1.55vw, 24px)`, 700, 1.28 |
| Card title | `.home-release-card h3` | Noto Sans TC, 18px, 700, 1.35 |
| Body copy | `.about-copy > p` | Noto Sans TC, 16px, 500, 1.72 |
| Secondary text | `.release-note` | Noto Sans TC, 13px, 400, 1.6 |
| Metadata / caption | homepage track metadata | Noto Sans TC, 16px, 400, normal line height |
| Navigation | `.nav-links a` | Noto Sans TC, 16px, 700 |
| Button / action | `.primary-button` | Noto Sans TC, 16px, 700 |
| Form label | N/A | The homepage has no visible form-label equivalent; existing accessible label hierarchy is preserved. |
| Form input | `.home-subscribe-form input` | Noto Sans TC, 14px, 400 |

## Normalized pages and roles

- Major page titles: Tracks, Chord Dictionary, Scale Explorer, Key Finder,
  Chord Progressions, Progression Writer, Fretboard Trainer, Song Workspace,
  Feedback, Legal, Privacy, 404, and Service Waking.
- Section headings: primary tool panels for Key Finder, Chord Progressions,
  Progression Writer, Feedback, and Song Workspace.
- Subsection headings: tool-card headings, progression subsections, Song
  Workspace modal headings, and policy section headings.
- Card titles: track cards and Song Workspace import/song cards.
- Body and secondary text: Legal and Privacy policy copy and effective dates.
- Form inputs: feedback fields and shared native form font inheritance.

## Justified exceptions

- `MONOSPACE_EXCEPTION`: code samples and generated code output.
- `ICON_EXCEPTION`: icon glyphs and SVG labels.
- `MUSIC_EXCEPTION`: chord symbols, chord annotations, Song Workspace song
  content, chord diagrams, and fretboard labels.
- `TECHNICAL_EXCEPTION`: compact filter controls, analysis status labels,
  numeric steppers, and dense application controls whose sizing is part of the
  component geometry.

These exceptions preserve chord-anchor geometry, single-row annotations,
diagrams, and compact application controls. No new fonts or remote font
dependencies were introduced.
