import { fileSafeName } from "../music/progressionWriter.mjs";
import {
  diagramBaseFret,
  DIAGRAM_FRET_ROWS,
  fretsText,
  STRING_NAMES,
  toneForString
} from "../music/chordLab.mjs";
import {
  BRAND_FONT,
  DISPLAY_FONT,
  downloadBlob,
  HIGHLIGHT,
  paletteForTheme,
  renderProgressionPng,
  STAGE_MUTED,
  STAGE_TEXT,
  svgGlow,
  svgRoundedRect,
  svgText,
  svgToPngBlob
} from "./progressionWriterExport.mjs";

const DEFAULT_TEXT = Object.freeze({
  tool: "Chord Lab",
  standardTuning: "Standard tuning: E A D G B E",
  shapes: "Recommended shapes",
  rootless: "Rootless",
  rights: "© 2026 Jam Tracks Hub. All rights reserved."
});

const CARD_HEIGHT = 392;

function svgDiagram(chord, voicing, x, y, palette) {
  const baseFret = diagramBaseFret(voicing.frets);
  const neckWidth = 172;
  const neckHeight = 176;
  const stringGap = neckWidth / 5;
  const fretGap = neckHeight / DIAGRAM_FRET_ROWS;
  const topY = y + 34;
  const leftX = x + 18;
  const parts = [];

  voicing.frets.forEach((fret, stringIndex) => {
    const stringX = leftX + stringIndex * stringGap;
    if (fret < 0) {
      parts.push(svgText(stringX, y + 15, "X", { fill: palette.text, size: 13, weight: 700, anchor: "middle" }));
      return;
    }
    if (fret === 0) {
      const tone = toneForString(chord, stringIndex, 0);
      parts.push(svgText(stringX, y + 7, "O", { fill: palette.muted, size: 11, weight: 700, anchor: "middle" }));
      if (tone) {
        const tonePalette = palette.tone[tone.family] || palette.tone.other;
        parts.push(`<rect x="${stringX - 13}" y="${y + 12}" width="26" height="17" rx="8.5" fill="${tonePalette.fill}"/>`);
        parts.push(`<rect x="${stringX - 13}" y="${y + 12}" width="26" height="17" rx="8.5" fill="url(#dotShade)"/>`);
        parts.push(svgText(stringX, y + 25, tone.label, { fill: tonePalette.text, size: 10, weight: 700, anchor: "middle" }));
      }
    }
  });
  for (let stringIndex = 0; stringIndex < 6; stringIndex += 1) {
    const stringX = leftX + stringIndex * stringGap;
    parts.push(`<line x1="${stringX}" y1="${topY}" x2="${stringX}" y2="${topY + neckHeight}" stroke="${palette.grid}" stroke-width="1"/>`);
  }
  for (let fretLine = 0; fretLine <= DIAGRAM_FRET_ROWS; fretLine += 1) {
    const fretY = topY + fretLine * fretGap;
    const isNut = fretLine === 0 && baseFret === 1;
    parts.push(`<line x1="${leftX}" y1="${fretY}" x2="${leftX + neckWidth}" y2="${fretY}" stroke="${isNut ? palette.nut : palette.grid}" stroke-width="${isNut ? 4 : 1}"/>`);
  }
  if (baseFret > 1) parts.push(svgText(leftX - 16, topY + 14, baseFret, { fill: palette.text, size: 13, weight: 700, anchor: "end" }));
  voicing.frets.forEach((fret, stringIndex) => {
    if (fret <= 0) return;
    const row = fret - baseFret;
    if (row < 0 || row >= DIAGRAM_FRET_ROWS) return;
    const tone = toneForString(chord, stringIndex, fret);
    const stringX = leftX + stringIndex * stringGap;
    const markerY = topY + (row + 0.5) * fretGap;
    const tonePalette = palette.tone[tone?.family || "other"] || palette.tone.other;
    parts.push(`<circle cx="${stringX}" cy="${markerY}" r="13" fill="${tonePalette.fill}"/>`);
    parts.push(`<circle cx="${stringX}" cy="${markerY}" r="13" fill="url(#dotShade)"/>`);
    parts.push(svgText(stringX, markerY + 4, tone?.label || "", { fill: tonePalette.text, size: 10, weight: 700, anchor: "middle" }));
  });
  STRING_NAMES.forEach((name, stringIndex) => {
    parts.push(svgText(leftX + stringIndex * stringGap, topY + neckHeight + 24, name, {
      fill: palette.muted, size: 13, weight: 700, anchor: "middle"
    }));
  });
  return parts.join("");
}

function svgShapeCard(chord, item, x, y, width, palette, text) {
  const scale = 0.95;
  const diagramWidth = 208 * scale;
  const parts = [
    svgRoundedRect(x, y, width, CARD_HEIGHT, { fill: palette.card, stroke: palette.cardEdge, radius: 22 }),
    svgText(x + 20, y + 34, item.rankText, { fill: palette.muted, size: 14, weight: 700 }),
    svgText(x + width - 20, y + 34, item.positionText, { fill: palette.text, size: 14, weight: 700, anchor: "end" }),
    `<g transform="translate(${x + (width - diagramWidth) / 2} ${y + 52}) scale(${scale})">${svgDiagram(chord, item.voicing, 0, 0, palette)}</g>`,
    svgText(x + width / 2, y + 314, fretsText(item.voicing.frets), { fill: palette.text, size: 18, weight: 700, anchor: "middle" }),
    svgText(x + width / 2, y + 342, item.voicing.labels.join(" · "), { fill: palette.muted, size: 14, weight: 600, anchor: "middle" })
  ];
  if (item.voicing.rootless) {
    parts.push(svgRoundedRect(x + width / 2 - 52, y + 356, 104, 24, { fill: palette.tone.fifth.fill, radius: 12 }));
    parts.push(svgText(x + width / 2, y + 373, text.rootless, { fill: palette.tone.fifth.text, size: 12, weight: 700, anchor: "middle" }));
  }
  return parts.join("");
}

export function generateChordLabSvg({ chord, items, tonesText }, { theme = "default", imageText = {} } = {}) {
  const text = { ...DEFAULT_TEXT, ...imageText };
  const palette = paletteForTheme(theme);
  const width = 1400;
  const margin = 32;
  const inset = 36;
  const bandHeight = 186;
  const trayTop = margin + bandHeight + 18;
  const contentX = margin + inset;
  const contentWidth = width - contentX * 2;
  const columns = 5;
  const gap = 18;
  const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
  const titleY = trayTop + inset + 26;
  const cardsY = titleY + 24;
  const rows = Math.max(1, Math.ceil(items.length / columns));
  const trayHeight = cardsY + rows * (CARD_HEIGHT + gap) - gap + inset - trayTop;
  const footerY = trayTop + trayHeight + 46;
  const height = footerY + 30;
  const bandWidth = width - margin * 2;
  const cards = items.map((item, index) => svgShapeCard(
    chord,
    item,
    contentX + (index % columns) * (cardWidth + gap),
    cardsY + Math.floor(index / columns) * (CARD_HEIGHT + gap),
    cardWidth,
    palette,
    text
  )).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>${svgGlow("pageGlow", width - 120, -60, 620, palette.glow)}${svgGlow("stageGlow", width - margin - 140, margin - 80, 420, "rgba(242, 183, 5, 0.3)")}<linearGradient id="dotShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255, 255, 255, 0.12)"/><stop offset="1" stop-color="rgba(0, 0, 0, 0.08)"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="${palette.page}"/>
    <rect width="100%" height="100%" fill="url(#pageGlow)"/>
    ${svgRoundedRect(margin, margin, bandWidth, bandHeight, { fill: palette.stage, radius: 30 })}
    ${svgRoundedRect(margin, margin, bandWidth, bandHeight, { fill: "url(#stageGlow)", stroke: palette.stageEdge, radius: 30 })}
    ${svgText(contentX, margin + 52, `Jam Tracks Hub · ${text.tool}`, { fill: HIGHLIGHT, size: 15, weight: 600 })}
    ${svgText(width - contentX, margin + 52, text.standardTuning, { fill: STAGE_MUTED, size: 14, weight: 500, anchor: "end" })}
    ${svgText(contentX, margin + 114, chord.symbol, { fill: STAGE_TEXT, size: 56, weight: 400, family: DISPLAY_FONT })}
    ${svgText(contentX, margin + 150, tonesText, { fill: STAGE_MUTED, size: 16, weight: 500 })}
    ${svgRoundedRect(margin, trayTop, bandWidth, trayHeight, { fill: palette.tray, stroke: palette.trayEdge, radius: 30 })}
    ${svgText(contentX, titleY, text.shapes, { fill: palette.text, size: 28, weight: 400, family: DISPLAY_FONT })}
    ${cards}
    ${svgText(margin + 4, footerY, "JAM TRACKS HUB", { fill: palette.text, size: 22, weight: 400, family: BRAND_FONT })}
    ${svgText(width - margin - 4, footerY, `jamtrackshub.com · ${text.rights}`, { fill: palette.muted, size: 13, weight: 500, anchor: "end" })}
</svg>`;
}

// File names stay ASCII: "#" becomes "sharp" and a slash bass becomes "over".
export function chordLabFilename(symbol) {
  const readable = String(symbol || "chord")
    .replace(/#/g, "sharp")
    .replace(/\//g, "-over-");
  return `${fileSafeName(readable)}-chord-lab`;
}

export async function exportChordLabImage(data, { theme = "default", imageText = {}, ...options } = {}) {
  const svg = generateChordLabSvg(data, { theme, imageText });
  const filename = chordLabFilename(data.chord.symbol);
  try {
    let pngBlob;
    try {
      pngBlob = await renderProgressionPng(svg, options);
    } catch (canvasError) {
      pngBlob = await svgToPngBlob(svg, options);
    }
    downloadBlob(pngBlob, `${filename}.png`, options);
    return { format: "png", blob: pngBlob, filename: `${filename}.png`, svg };
  } catch (error) {
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(svgBlob, `${filename}.svg`, options);
    return { format: "svg", blob: svgBlob, filename: `${filename}.svg`, svg };
  }
}
