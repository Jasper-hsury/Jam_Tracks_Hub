import { fileSafeName } from "../music/progressionWriter.mjs";

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Fonts match the v4 site. The PNG is drawn on a canvas so the page's web
// fonts apply; the SVG fallback names the same families.
const DISPLAY_FONT = "'DM Serif Display', 'Noto Serif TC', Georgia, serif";
const TEXT_FONT = "'Work Sans', 'Noto Sans TC', Arial, sans-serif";
const BRAND_FONT = "Anton, Impact, 'Arial Narrow', sans-serif";
const STAGE_TEXT = "#f1e9d8";
const STAGE_MUTED = "#c9d3de";
const HIGHLIGHT = "#f2b705";

// English is the fallback; the page passes its own language (imageText).
const DEFAULT_IMAGE_TEXT = Object.freeze({
  tool: "Progression Writer",
  standardTuning: "Standard tuning: E A D G B E",
  progression: "Chord Progression",
  shapes: "Chord Shapes",
  bpm: "BPM {{bpm}}",
  bpmNotSet: "BPM not set",
  fullCards: "Full shape cards",
  separate: "Progression & shapes",
  rights: "© 2026 Jam Tracks Hub. All rights reserved."
});

export function progressionImageText(imageText = {}) {
  return { ...DEFAULT_IMAGE_TEXT, ...imageText };
}

function svgText(x, y, value, options = {}) {
  const attrs = [
    `x="${x}"`, `y="${y}"`, `fill="${options.fill || "currentColor"}"`,
    `font-size="${options.size || 16}"`, `font-weight="${options.weight || 700}"`,
    `font-family="${options.family || TEXT_FONT}"`
  ];
  if (options.anchor) attrs.push(`text-anchor="${options.anchor}"`);
  if (options.opacity) attrs.push(`opacity="${options.opacity}"`);
  return `<text ${attrs.join(" ")}>${escapeXml(value)}</text>`;
}

function svgRoundedRect(x, y, width, height, options = {}) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${options.radius || 12}" fill="${options.fill || "none"}" stroke="${options.stroke || "none"}" stroke-width="${options.strokeWidth || 1}"/>`;
}

function svgGlow(id, cx, cy, r, color) {
  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="rgba(242, 183, 5, 0)"/></radialGradient>`;
}

// Image palettes follow the site's day and night themes (v4 Jazz Stage).
// Chord tones use the same v4 chord-tone palette as the tool pages (v4.css).
function paletteForTheme(theme) {
  return theme === "light"
    ? {
      name: "light",
      page: "#ece7de", glow: "rgba(242, 183, 5, 0.22)", tray: "#f8f5ef", trayEdge: "rgba(15, 43, 76, 0.08)",
      card: "#f2ede5", cardEdge: "#e0d8cb", text: "#0f2b4c", muted: "#4e5d70",
      grid: "#8a93a0", nut: "#0f2b4c", stage: "#0f2b4c", stageEdge: "rgba(15, 43, 76, 0)",
      tone: {
        root: { fill: "#1d6b6b", stroke: "#f2ede5", text: "#fffaf2", ring: "#1d6b6b" },
        third: { fill: "#8a5528", stroke: "#f2ede5", text: "#fffaf2", ring: "#8a5528" },
        fifth: { fill: "#7a6118", stroke: "#f2ede5", text: "#fffaf2", ring: "#7a6118" },
        seventh: { fill: "#9a4a5e", stroke: "#f2ede5", text: "#fffaf2", ring: "#9a4a5e" },
        extension: { fill: "#4f6a48", stroke: "#f2ede5", text: "#fffaf2", ring: "#4f6a48" },
        other: { fill: "#4e5d70", stroke: "#f2ede5", text: "#fffaf2", ring: "#4e5d70" }
      }
    }
    : {
      name: "dark",
      page: "#081627", glow: "rgba(242, 183, 5, 0.18)", tray: "#0f223a", trayEdge: "rgba(255, 255, 255, 0.1)",
      card: "#132a47", cardEdge: "#24405f", text: "#f1e9d8", muted: "#9fb3c8",
      grid: "#5f7896", nut: "#f1e9d8", stage: "#0f2b4c", stageEdge: "rgba(255, 255, 255, 0.1)",
      tone: {
        root: { fill: "#f1e9d8", stroke: "#132a47", text: "#0f2b4c", ring: "#f1e9d8" },
        third: { fill: "#eab183", stroke: "#132a47", text: "#0f2b4c", ring: "#eab183" },
        fifth: { fill: "#e6cb6e", stroke: "#132a47", text: "#0f2b4c", ring: "#e6cb6e" },
        seventh: { fill: "#eba7b6", stroke: "#132a47", text: "#0f2b4c", ring: "#eba7b6" },
        extension: { fill: "#b9cfa9", stroke: "#132a47", text: "#0f2b4c", ring: "#b9cfa9" },
        other: { fill: "#9fb3c8", stroke: "#132a47", text: "#0f2b4c", ring: "#9fb3c8" }
      }
    };
}

function svgDiagram(chordItem, x, y, palette, shapeEngine) {
  const { parsed, voicing } = chordItem;
  const baseFret = shapeEngine.diagramBaseFret(voicing.frets);
  const neckWidth = 172;
  const neckHeight = 176;
  const stringGap = neckWidth / 5;
  const fretGap = neckHeight / shapeEngine.DIAGRAM_FRET_ROWS;
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
      const tone = shapeEngine.chordToneForPitch(shapeEngine.TUNING_MIDI[stringIndex], parsed);
      parts.push(svgText(stringX, y + 7, "O", { fill: palette.muted, size: 11, weight: 700, anchor: "middle" }));
      if (tone) {
        const tonePalette = palette.tone[tone.family] || palette.tone.other;
        // Open-string labels keep a 5px gap above the nut.
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
  for (let fretLine = 0; fretLine <= shapeEngine.DIAGRAM_FRET_ROWS; fretLine += 1) {
    const fretY = topY + fretLine * fretGap;
    const isNut = fretLine === 0 && baseFret === 1;
    parts.push(`<line x1="${leftX}" y1="${fretY}" x2="${leftX + neckWidth}" y2="${fretY}" stroke="${isNut ? palette.nut : palette.grid}" stroke-width="${isNut ? 4 : 1}"/>`);
  }
  if (baseFret > 1) parts.push(svgText(leftX - 14, topY + 14, baseFret, { fill: palette.text, size: 13, weight: 700, anchor: "end" }));

  voicing.frets.forEach((fret, stringIndex) => {
    if (fret <= 0) return;
    const row = fret - baseFret;
    if (row < 0 || row >= shapeEngine.DIAGRAM_FRET_ROWS) return;
    const tone = shapeEngine.chordToneForPitch(shapeEngine.TUNING_MIDI[stringIndex] + fret, parsed);
    const stringX = leftX + stringIndex * stringGap;
    const markerY = topY + (row + 0.5) * fretGap;
    const tonePalette = palette.tone[tone?.family || "other"] || palette.tone.other;
    // A plain circle with a very slight shade, like the dots on the site.
    parts.push(`<circle cx="${stringX}" cy="${markerY}" r="13" fill="${tonePalette.fill}"/>`);
    parts.push(`<circle cx="${stringX}" cy="${markerY}" r="13" fill="url(#dotShade)"/>`);
    parts.push(svgText(stringX, markerY + 4, tone?.label || "", { fill: tonePalette.text, size: 10, weight: 700, anchor: "middle" }));
  });

  shapeEngine.STRING_NAMES.forEach((name, stringIndex) => {
    parts.push(svgText(leftX + stringIndex * stringGap, topY + neckHeight + 24, name, {
      fill: palette.muted, size: 13, weight: 700, anchor: "middle"
    }));
  });
  return parts.join("");
}

function svgScaledDiagram(chordItem, x, y, palette, scale, shapeEngine) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">${svgDiagram(chordItem, 0, 0, palette, shapeEngine)}</g>`;
}

function svgChordCard(chordItem, x, y, width, height, palette, shapeEngine) {
  return `${svgRoundedRect(x, y, width, height, { fill: palette.card, stroke: palette.cardEdge, radius: 22 })}${svgText(x + 26, y + 70, chordItem.parsed.symbol, { fill: palette.text, size: 36, weight: 400, family: DISPLAY_FONT })}${svgScaledDiagram(chordItem, x + width - 238, y + 26, palette, 0.88, shapeEngine)}`;
}

export function uniqueChordShapeItems(data) {
  const seen = new Set();
  const unique = [];
  data.sections.forEach(section => section.chords.forEach(chordItem => {
    const fretsText = chordItem.voicing.frets.map(fret => fret < 0 ? "x" : fret).join(" ");
    const key = `${chordItem.parsed.symbol}|${fretsText}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(chordItem);
    }
  }));
  return unique;
}

function svgProgressionChip(chordItem, index, x, y, width, palette) {
  return `${svgRoundedRect(x, y, width, 56, { fill: palette.card, stroke: palette.cardEdge, radius: 18 })}${svgText(x + 18, y + 34, String(index + 1).padStart(2, "0"), { fill: palette.muted, size: 13, weight: 700 })}${svgText(x + 56, y + 37, chordItem.parsed.symbol, { fill: palette.text, size: 24, weight: 400, family: DISPLAY_FONT })}`;
}

function compactShapeMetrics(width) {
  if (width < 230) return { cardHeight: 174, rowHeight: 190, scale: 0.54, diagramOffsetX: width - 130, diagramOffsetY: 35, titleSize: 19 };
  if (width < 320) return { cardHeight: 204, rowHeight: 220, scale: 0.68, diagramOffsetX: width - 166, diagramOffsetY: 28, titleSize: 22 };
  return { cardHeight: 222, rowHeight: 238, scale: 0.76, diagramOffsetX: width - 184, diagramOffsetY: 25, titleSize: 24 };
}

function svgCompactShapeCard(chordItem, x, y, width, palette, shapeEngine) {
  const metrics = compactShapeMetrics(width);
  return `${svgRoundedRect(x, y, width, metrics.cardHeight, { fill: palette.card, stroke: palette.cardEdge, radius: 22 })}${svgText(x + 18, y + 36, chordItem.parsed.symbol, { fill: palette.text, size: metrics.titleSize, weight: 400, family: DISPLAY_FONT })}${svgScaledDiagram(chordItem, x + metrics.diagramOffsetX, y + metrics.diagramOffsetY, palette, metrics.scale, shapeEngine)}`;
}

function sectionTitle(text, x, y, palette, size = 26) {
  return svgText(x, y, text, { fill: palette.text, size, weight: 400, family: DISPLAY_FONT });
}

function renderSeparatedSection(section, x, y, width, palette, startIndex, maxColumns, showTitle) {
  const gap = 14;
  const columns = Math.max(1, Math.min(maxColumns, section.chords.length || 1));
  const chipWidth = (width - gap * (columns - 1)) / columns;
  const parts = showTitle ? [svgText(x, y, section.title, { fill: palette.muted, size: 15, weight: 600 })] : [];
  const top = showTitle ? y + 16 : y - 8;
  section.chords.forEach((chordItem, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    parts.push(svgProgressionChip(chordItem, startIndex + index, x + column * (chipWidth + gap), top + row * 70, chipWidth, palette));
  });
  return { svg: parts.join(""), height: (top - y) + Math.ceil(section.chords.length / columns) * 70 };
}

function separatedProgressionHeight(data, maxColumns) {
  return data.sections.reduce((total, section) => {
    const columns = Math.max(1, Math.min(maxColumns, section.chords.length || 1));
    return total + 24 + Math.ceil(section.chords.length / columns) * 70 + 20;
  }, 0);
}

function generateSeparatedProgressionSvg(data, palette, text, contentX, contentWidth, bodyStartY, shapeEngine) {
  const uniqueShapes = uniqueChordShapeItems(data);
  const showSectionTitles = data.sections.length > 1;
  const leftWidth = 640;
  const defaultGap = 32;
  const defaultRightWidth = contentWidth - leftWidth - defaultGap;
  const defaultShapeMetrics = compactShapeMetrics(defaultRightWidth);
  const defaultLeftBottom = bodyStartY + 38 + separatedProgressionHeight(data, 4);
  const defaultRightBottom = bodyStartY + 38 + uniqueShapes.length * defaultShapeMetrics.rowHeight;
  // Two shape columns once one column would leave the progression side mostly empty.
  const balance = uniqueShapes.length > 3 && defaultRightBottom - defaultLeftBottom > 360;
  const columnGap = balance ? 28 : defaultGap;
  const rightWidth = contentWidth - leftWidth - columnGap;
  const rightX = contentX + leftWidth + columnGap;
  const shapeColumns = balance ? 2 : 1;
  const shapeGap = balance ? 18 : 0;
  const shapeCardWidth = (rightWidth - shapeGap * (shapeColumns - 1)) / shapeColumns;
  const shapeMetrics = compactShapeMetrics(shapeCardWidth);
  const body = [];
  let y = bodyStartY;
  let chordIndex = 0;
  let leftBottom = bodyStartY;
  let rightBottom = bodyStartY;

  body.push(sectionTitle(text.progression, contentX, y, palette, 28));
  body.push(sectionTitle(text.shapes, rightX, y, palette, 28));
  y += 44;
  data.sections.forEach(section => {
    const rendered = renderSeparatedSection(section, contentX, y, leftWidth, palette, chordIndex, 4, showSectionTitles);
    body.push(rendered.svg);
    chordIndex += section.chords.length;
    y += rendered.height + 20;
    leftBottom = Math.max(leftBottom, y - 20);
  });
  uniqueShapes.forEach((chordItem, index) => {
    const column = index % shapeColumns;
    const row = Math.floor(index / shapeColumns);
    const shapeX = rightX + column * (shapeCardWidth + shapeGap);
    const shapeY = bodyStartY + 22 + row * shapeMetrics.rowHeight;
    body.push(svgCompactShapeCard(chordItem, shapeX, shapeY, shapeCardWidth, palette, shapeEngine));
    rightBottom = Math.max(rightBottom, shapeY + shapeMetrics.cardHeight);
  });
  return { body: body.join(""), height: Math.max(leftBottom, rightBottom) };
}

function generateCardsSvg(data, palette, contentX, contentWidth, bodyStartY, shapeEngine) {
  const gap = 24;
  const cardWidth = (contentWidth - gap) / 2;
  const cardHeight = 252;
  const body = [];
  let y = bodyStartY;
  data.sections.forEach(section => {
    body.push(sectionTitle(section.title, contentX, y, palette, 28));
    y += 24;
    section.chords.forEach((chordItem, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      body.push(svgChordCard(chordItem, contentX + column * (cardWidth + gap), y + row * (cardHeight + gap), cardWidth, cardHeight, palette, shapeEngine));
    });
    y += Math.ceil(section.chords.length / 2) * (cardHeight + gap) + 34;
  });
  return { body: body.join(""), height: y - 34 - gap };
}

export function generateProgressionSvg(data, {
  separateDownload = false,
  theme = "default",
  shapeEngine = globalThis.JamChordShapes,
  imageText = {}
} = {}) {
  const palette = paletteForTheme(theme);
  const text = progressionImageText(imageText);
  const width = separateDownload ? 1400 : 1200;
  const margin = 32;
  const inset = 36;
  const bandHeight = 186;
  const trayTop = margin + bandHeight + 18;
  const contentX = margin + inset;
  const contentWidth = width - contentX * 2;
  const bodyStartY = trayTop + inset + 26;
  const bpmText = data.bpm ? text.bpm.replace("{{bpm}}", data.bpm) : text.bpmNotSet;
  const subtitleText = [bpmText, data.key, separateDownload ? text.separate : text.fullCards].filter(Boolean).join(" · ");
  const rendered = separateDownload
    ? generateSeparatedProgressionSvg(data, palette, text, contentX, contentWidth, bodyStartY, shapeEngine)
    : generateCardsSvg(data, palette, contentX, contentWidth, bodyStartY, shapeEngine);
  const trayHeight = Math.max(rendered.height + inset - trayTop, 220);
  const footerY = trayTop + trayHeight + 46;
  const height = footerY + 30;
  const bandWidth = width - margin * 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>${svgGlow("pageGlow", width - 120, -60, 620, palette.glow)}${svgGlow("stageGlow", width - margin - 140, margin - 80, 420, "rgba(242, 183, 5, 0.3)")}<linearGradient id="dotShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255, 255, 255, 0.12)"/><stop offset="1" stop-color="rgba(0, 0, 0, 0.08)"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="${palette.page}"/>
    <rect width="100%" height="100%" fill="url(#pageGlow)"/>
    ${svgRoundedRect(margin, margin, bandWidth, bandHeight, { fill: palette.stage, radius: 30 })}
    ${svgRoundedRect(margin, margin, bandWidth, bandHeight, { fill: "url(#stageGlow)", stroke: palette.stageEdge, radius: 30 })}
    ${svgText(contentX, margin + 52, `Jam Tracks Hub · ${text.tool}`, { fill: HIGHLIGHT, size: 15, weight: 600 })}
    ${svgText(width - contentX, margin + 52, text.standardTuning, { fill: STAGE_MUTED, size: 14, weight: 500, anchor: "end" })}
    ${svgText(contentX, margin + 112, data.songName, { fill: STAGE_TEXT, size: 48, weight: 400, family: DISPLAY_FONT })}
    ${svgText(contentX, margin + 148, subtitleText, { fill: STAGE_MUTED, size: 16, weight: 500 })}
    ${svgRoundedRect(margin, trayTop, bandWidth, trayHeight, { fill: palette.tray, stroke: palette.trayEdge, radius: 30 })}
    ${rendered.body}
    ${svgText(margin + 4, footerY, "JAM TRACKS HUB", { fill: palette.text, size: 22, weight: 400, family: BRAND_FONT })}
    ${svgText(width - margin - 4, footerY, `jamtrackshub.com · ${text.rights}`, { fill: palette.muted, size: 13, weight: 500, anchor: "end" })}
</svg>`;
}

export function progressionExportFilename(data) {
  const parts = [fileSafeName(data.songName)];
  // File names stay in English even when the image shows a localized key.
  const fileKey = data.fileKey || data.key;
  if (fileKey) parts.push(fileSafeName(fileKey));
  if (data.bpm) parts.push(`${fileSafeName(data.bpm)}bpm`);
  parts.push("progression");
  return parts.join("-");
}

export function downloadBlob(blob, filename, {
  documentRef = document,
  urlApi = URL,
  setTimeoutFn = window.setTimeout.bind(window)
} = {}) {
  const url = urlApi.createObjectURL(blob);
  const link = documentRef.createElement("a");
  link.href = url;
  link.download = filename;
  documentRef.body.appendChild(link);
  link.click();
  link.remove();
  setTimeoutFn(() => urlApi.revokeObjectURL(url), 600);
}

export function svgToPngBlob(svg, {
  documentRef = document,
  ImageCtor = Image,
  urlApi = URL
} = {}) {
  return new Promise((resolve, reject) => {
    const sizeMatch = svg.match(/<svg[^>]+width="(\d+)"[^>]+height="(\d+)"/);
    const width = sizeMatch ? Number(sizeMatch[1]) : 1200;
    const height = sizeMatch ? Number(sizeMatch[2]) : 800;
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = urlApi.createObjectURL(svgBlob);
    const image = new ImageCtor();
    image.onload = () => {
      const canvas = documentRef.createElement("canvas");
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext("2d");
      context.setTransform(scale, 0, 0, scale, 0, 0);
      context.drawImage(image, 0, 0, width, height);
      urlApi.revokeObjectURL(url);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not render progression image.")), "image/png");
    };
    image.onerror = () => {
      urlApi.revokeObjectURL(url);
      reject(new Error("Could not render progression image."));
    };
    image.src = url;
  });
}

export function exportProgressionJson(record, options = {}) {
  const filenameBase = record.songName || record.key || "custom-progression";
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json;charset=utf-8" });
  const filename = `${fileSafeName(filenameBase)}-progression.json`;
  downloadBlob(blob, filename, options);
  return { blob, filename };
}

function numberAttr(element, name, fallback = 0) {
  const value = Number(element.getAttribute(name));
  return Number.isFinite(value) ? value : fallback;
}

function roundedRectPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

// Draws the SVG this module generates (rect, text, line, circle, g and radial
// gradients) onto a canvas, so the text uses the page's loaded web fonts.
export function drawProgressionSvg(svg, { documentRef = document, DOMParserCtor = globalThis.DOMParser } = {}) {
  const root = new DOMParserCtor().parseFromString(svg, "image/svg+xml").documentElement;
  if (!root || root.nodeName !== "svg") throw new Error("Could not read progression image.");
  const width = numberAttr(root, "width", 1200);
  const height = numberAttr(root, "height", 800);
  const canvas = documentRef.createElement("canvas");
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  const gradients = new Map();
  Array.from(root.querySelectorAll("radialGradient, linearGradient")).forEach(gradient => {
    gradients.set(gradient.getAttribute("id"), gradient);
  });
  // Radial gradients use page coordinates; linear ones (the dot shade) span the shape's box.
  const paint = (value, box) => {
    const match = /^url\(#([^)]+)\)$/.exec(value || "");
    if (!match) return value;
    const gradient = gradients.get(match[1]);
    if (!gradient) return "transparent";
    let fill;
    if (gradient.nodeName === "linearGradient") {
      fill = context.createLinearGradient(
        box.x + numberAttr(gradient, "x1") * box.width,
        box.y + numberAttr(gradient, "y1") * box.height,
        box.x + numberAttr(gradient, "x2") * box.width,
        box.y + numberAttr(gradient, "y2", 1) * box.height
      );
    } else {
      const cx = numberAttr(gradient, "cx");
      const cy = numberAttr(gradient, "cy");
      const r = numberAttr(gradient, "r");
      fill = context.createRadialGradient(cx, cy, 0, cx, cy, r);
    }
    Array.from(gradient.getElementsByTagName("stop")).forEach(stop => {
      fill.addColorStop(numberAttr(stop, "offset"), stop.getAttribute("stop-color"));
    });
    return fill;
  };
  const fillAndStroke = (element, box) => {
    const fill = element.getAttribute("fill");
    const stroke = element.getAttribute("stroke");
    if (fill && fill !== "none") {
      context.fillStyle = paint(fill, box);
      context.fill();
    }
    if (stroke && stroke !== "none") {
      context.strokeStyle = stroke;
      context.lineWidth = numberAttr(element, "stroke-width", 1);
      context.stroke();
    }
  };
  const drawNode = element => {
    const name = element.nodeName;
    if (name === "defs") return;
    context.save();
    if (element.hasAttribute("opacity")) context.globalAlpha *= numberAttr(element, "opacity", 1);
    if (name === "g") {
      const transform = element.getAttribute("transform") || "";
      const translate = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(transform);
      const scaleMatch = /scale\(([-\d.]+)\)/.exec(transform);
      if (translate) context.translate(Number(translate[1]), Number(translate[2]));
      if (scaleMatch) context.scale(Number(scaleMatch[1]), Number(scaleMatch[1]));
      Array.from(element.children).forEach(drawNode);
    } else if (name === "rect") {
      const rectWidth = element.getAttribute("width") === "100%" ? width : numberAttr(element, "width");
      const rectHeight = element.getAttribute("height") === "100%" ? height : numberAttr(element, "height");
      const box = { x: numberAttr(element, "x"), y: numberAttr(element, "y"), width: rectWidth, height: rectHeight };
      roundedRectPath(context, box.x, box.y, rectWidth, rectHeight, numberAttr(element, "rx"));
      fillAndStroke(element, box);
    } else if (name === "circle") {
      const r = numberAttr(element, "r");
      const box = { x: numberAttr(element, "cx") - r, y: numberAttr(element, "cy") - r, width: r * 2, height: r * 2 };
      context.beginPath();
      context.arc(numberAttr(element, "cx"), numberAttr(element, "cy"), r, 0, Math.PI * 2);
      fillAndStroke(element, box);
    } else if (name === "line") {
      context.beginPath();
      context.moveTo(numberAttr(element, "x1"), numberAttr(element, "y1"));
      context.lineTo(numberAttr(element, "x2"), numberAttr(element, "y2"));
      fillAndStroke(element);
    } else if (name === "text") {
      const anchor = element.getAttribute("text-anchor");
      context.textAlign = anchor === "middle" ? "center" : anchor === "end" ? "right" : "left";
      context.textBaseline = "alphabetic";
      context.font = `${element.getAttribute("font-weight") || 400} ${numberAttr(element, "font-size", 16)}px ${element.getAttribute("font-family") || TEXT_FONT}`;
      context.fillStyle = element.getAttribute("fill") || "#000";
      context.fillText(element.textContent, numberAttr(element, "x"), numberAttr(element, "y"));
    }
    context.restore();
  };
  Array.from(root.children).forEach(drawNode);
  return canvas;
}

async function loadProgressionFonts(svg, documentRef) {
  const fonts = documentRef.fonts;
  if (!fonts || typeof fonts.load !== "function") return;
  // Chinese web fonts arrive in unicode-range slices, so ask for the exact text.
  const text = Array.from(svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g), match => match[1]).join(" ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#039;/g, "'").replace(/&amp;/g, "&");
  try {
    await Promise.all([
      fonts.load(`400 48px ${DISPLAY_FONT}`, text),
      fonts.load(`500 16px ${TEXT_FONT}`, text),
      fonts.load(`700 13px ${TEXT_FONT}`, text),
      fonts.load(`400 22px ${BRAND_FONT}`)
    ]);
  } catch (error) {
    // Draw with the fallback fonts when a web font cannot load.
  }
}

export async function renderProgressionPng(svg, { documentRef = document, DOMParserCtor = globalThis.DOMParser } = {}) {
  await loadProgressionFonts(svg, documentRef);
  const canvas = drawProgressionSvg(svg, { documentRef, DOMParserCtor });
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not render progression image.")), "image/png");
  });
}

export async function exportProgressionImage(data, {
  separateDownload = false,
  theme = "default",
  shapeEngine = globalThis.JamChordShapes,
  imageText = {},
  ...options
} = {}) {
  const svg = generateProgressionSvg(data, { separateDownload, theme, shapeEngine, imageText });
  const filename = progressionExportFilename(data);
  try {
    let pngBlob;
    try {
      pngBlob = await renderProgressionPng(svg, options);
    } catch (canvasError) {
      // Older browsers: let the image decoder draw the SVG instead.
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
