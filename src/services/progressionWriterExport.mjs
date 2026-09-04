import { fileSafeName } from "../music/progressionWriter.mjs";

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function svgText(x, y, value, options = {}) {
  const attrs = [
    `x="${x}"`, `y="${y}"`, `fill="${options.fill || "currentColor"}"`,
    `font-size="${options.size || 16}"`, `font-weight="${options.weight || 700}"`,
    `font-family="${options.family || "Noto Sans TC, Arial, sans-serif"}"`
  ];
  if (options.anchor) attrs.push(`text-anchor="${options.anchor}"`);
  if (options.opacity) attrs.push(`opacity="${options.opacity}"`);
  return `<text ${attrs.join(" ")}>${escapeXml(value)}</text>`;
}

function svgRoundedRect(x, y, width, height, options = {}) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${options.radius || 12}" fill="${options.fill || "none"}" stroke="${options.stroke || "none"}" stroke-width="${options.strokeWidth || 1}"/>`;
}

function paletteForTheme(theme) {
  return theme === "light"
    ? {
      bg: "#f7f4ef", panel: "#fffdf9", card: "#f5eee5", border: "#d8cbbd",
      text: "#2d2722", muted: "#6f665d", gold: "#93643f", teal: "#2d7b76",
      grid: "#9c948b", nut: "#6b4329",
      tone: {
        root: { fill: "#2d7b76", stroke: "#9a6843", text: "#fffdf8", ring: "#2d7b76" },
        third: { fill: "#9d6a3d", stroke: "#f5eee5", text: "#fffaf2", ring: "#9d6a3d" },
        fifth: { fill: "#b88b56", stroke: "#f5eee5", text: "#fffaf2", ring: "#b88b56" },
        seventh: { fill: "#b06b7a", stroke: "#f5eee5", text: "#fffaf2", ring: "#b06b7a" },
        extension: { fill: "#7a8c74", stroke: "#f5eee5", text: "#fffaf2", ring: "#7a8c74" },
        other: { fill: "#9a6843", stroke: "#f5eee5", text: "#fffaf2", ring: "#9a6843" }
      }
    }
    : {
      bg: "#101010", panel: "#181614", card: "#211d19", border: "#46392d",
      text: "#efe5d5", muted: "#b7aa9b", gold: "#e5d3b3", teal: "#7fb7ad",
      grid: "#8c8174", nut: "#e5d3b3",
      tone: {
        root: { fill: "#e5d3b3", stroke: "#7fb7ad", text: "#2b211a", ring: "#e5d3b3" },
        third: { fill: "#9f6b45", stroke: "#211d19", text: "#fffaf2", ring: "#9f6b45" },
        fifth: { fill: "#7f8970", stroke: "#211d19", text: "#fffaf2", ring: "#7f8970" },
        seventh: { fill: "#9a6472", stroke: "#211d19", text: "#fffaf2", ring: "#9a6472" },
        extension: { fill: "#6f7964", stroke: "#211d19", text: "#fffaf2", ring: "#6f7964" },
        other: { fill: "#7fb7ad", stroke: "#211d19", text: "#101010", ring: "#7fb7ad" }
      }
    };
}

function svgCopyright(x, y, anchor, palette) {
  return svgText(x, y, "© 2026 Jam Tracks Hub. All rights reserved.", {
    fill: palette.muted, size: 14, weight: 800, anchor, opacity: "0.86"
  });
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
      parts.push(svgText(stringX, y + 20, "X", { fill: palette.text, size: 13, weight: 850, anchor: "middle" }));
      return;
    }
    if (fret === 0) {
      const tone = shapeEngine.chordToneForPitch(shapeEngine.TUNING_MIDI[stringIndex], parsed);
      parts.push(svgText(stringX, y + 12, "O", { fill: palette.muted, size: 11, weight: 850, anchor: "middle" }));
      if (tone) {
        const tonePalette = palette.tone[tone.family] || palette.tone.other;
        parts.push(`<rect x="${stringX - 13}" y="${y + 17}" width="26" height="17" rx="8.5" fill="${tonePalette.fill}" stroke="${tonePalette.stroke}" stroke-width="1"/>`);
        parts.push(svgText(stringX, y + 30, tone.label, { fill: tonePalette.text, size: 10, weight: 850, anchor: "middle" }));
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
  if (baseFret > 1) parts.push(svgText(leftX - 14, topY + 14, baseFret, { fill: palette.text, size: 13, weight: 850, anchor: "end" }));

  voicing.frets.forEach((fret, stringIndex) => {
    if (fret <= 0) return;
    const row = fret - baseFret;
    if (row < 0 || row >= shapeEngine.DIAGRAM_FRET_ROWS) return;
    const tone = shapeEngine.chordToneForPitch(shapeEngine.TUNING_MIDI[stringIndex] + fret, parsed);
    const stringX = leftX + stringIndex * stringGap;
    const markerY = topY + (row + 0.5) * fretGap;
    const tonePalette = palette.tone[tone?.family || "other"] || palette.tone.other;
    parts.push(`<circle cx="${stringX}" cy="${markerY}" r="15" fill="${tonePalette.ring}" opacity="0.42"/>`);
    parts.push(`<circle cx="${stringX}" cy="${markerY}" r="12" fill="${tonePalette.fill}" stroke="${tonePalette.stroke}" stroke-width="2"/>`);
    parts.push(svgText(stringX, markerY + 4, tone?.label || "", { fill: tonePalette.text, size: 10, weight: 900, anchor: "middle" }));
  });

  shapeEngine.STRING_NAMES.forEach((name, stringIndex) => {
    parts.push(svgText(leftX + stringIndex * stringGap, topY + neckHeight + 24, name, {
      fill: palette.muted, size: 13, weight: 850, anchor: "middle"
    }));
  });
  return parts.join("");
}

function svgScaledDiagram(chordItem, x, y, palette, scale, shapeEngine) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">${svgDiagram(chordItem, 0, 0, palette, shapeEngine)}</g>`;
}

function svgChordCard(chordItem, x, y, width, height, palette, shapeEngine) {
  return `${svgRoundedRect(x, y, width, height, { fill: palette.card, stroke: palette.border, radius: 14 })}${svgText(x + 24, y + 70, chordItem.parsed.symbol, { fill: palette.text, size: 32, weight: 900 })}${svgScaledDiagram(chordItem, x + width - 238, y + 26, palette, 0.88, shapeEngine)}`;
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
  return `${svgRoundedRect(x, y, width, 56, { fill: palette.card, stroke: palette.border, radius: 14 })}${svgText(x + 18, y + 35, String(index + 1).padStart(2, "0"), { fill: palette.muted, size: 13, weight: 850 })}${svgText(x + 58, y + 37, chordItem.parsed.symbol, { fill: palette.text, size: 22, weight: 900 })}`;
}

function compactShapeMetrics(width) {
  if (width < 230) return { cardHeight: 174, rowHeight: 190, scale: 0.54, diagramOffsetX: width - 130, diagramOffsetY: 35, titleSize: 17 };
  if (width < 320) return { cardHeight: 204, rowHeight: 220, scale: 0.68, diagramOffsetX: width - 166, diagramOffsetY: 28, titleSize: 19 };
  return { cardHeight: 222, rowHeight: 238, scale: 0.76, diagramOffsetX: width - 184, diagramOffsetY: 25, titleSize: 21 };
}

function svgCompactShapeCard(chordItem, x, y, width, palette, shapeEngine) {
  const metrics = compactShapeMetrics(width);
  return `${svgRoundedRect(x, y, width, metrics.cardHeight, { fill: palette.card, stroke: palette.border, radius: 14 })}${svgText(x + 16, y + 32, chordItem.parsed.symbol, { fill: palette.text, size: metrics.titleSize, weight: 900 })}${svgScaledDiagram(chordItem, x + metrics.diagramOffsetX, y + metrics.diagramOffsetY, palette, metrics.scale, shapeEngine)}`;
}

function renderSeparatedSection(section, x, y, width, palette, startIndex, maxColumns = 3) {
  const gap = 14;
  const columns = Math.max(1, Math.min(maxColumns, section.chords.length || 1));
  const chipWidth = (width - gap * (columns - 1)) / columns;
  const parts = [svgText(x, y, section.title, { fill: palette.gold, size: 26, weight: 900 })];
  section.chords.forEach((chordItem, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    parts.push(svgProgressionChip(chordItem, startIndex + index, x + column * (chipWidth + gap), y + 24 + row * 70, chipWidth, palette));
  });
  return { svg: parts.join(""), height: 30 + Math.ceil(section.chords.length / columns) * 70 };
}

function separatedProgressionHeight(data, maxColumns) {
  return data.sections.reduce((total, section) => {
    const columns = Math.max(1, Math.min(maxColumns, section.chords.length || 1));
    return total + 30 + Math.ceil(section.chords.length / columns) * 70 + 20;
  }, 0);
}

function generateSeparatedProgressionSvg(data, palette, width, margin, bodyStartY, shapeEngine) {
  const contentWidth = width - margin * 2;
  const uniqueShapes = uniqueChordShapeItems(data);
  const defaultLeftWidth = 710;
  const defaultGap = 32;
  const defaultRightWidth = contentWidth - defaultLeftWidth - defaultGap;
  const defaultShapeMetrics = compactShapeMetrics(defaultRightWidth);
  const defaultLeftBottom = bodyStartY + 38 + separatedProgressionHeight(data, 4);
  const defaultRightBottom = bodyStartY + 38 + uniqueShapes.length * defaultShapeMetrics.rowHeight;
  const balance = uniqueShapes.length > 6 && defaultRightBottom - defaultLeftBottom > 360;
  const leftWidth = defaultLeftWidth;
  const columnGap = balance ? 28 : defaultGap;
  const rightWidth = contentWidth - leftWidth - columnGap;
  const rightX = margin + leftWidth + columnGap;
  const shapeColumns = balance ? 2 : 1;
  const shapeGap = balance ? 18 : 0;
  const shapeCardWidth = (rightWidth - shapeGap * (shapeColumns - 1)) / shapeColumns;
  const shapeMetrics = compactShapeMetrics(shapeCardWidth);
  const body = [];
  let y = bodyStartY;
  let chordIndex = 0;
  let leftBottom = bodyStartY;
  let rightBottom = bodyStartY;

  body.push(svgText(margin, y, "Chord Progression", { fill: palette.gold, size: 28, weight: 900 }));
  body.push(svgText(rightX, y, "Chord Shapes", { fill: palette.gold, size: 28, weight: 900 }));
  y += 38;
  data.sections.forEach(section => {
    const rendered = renderSeparatedSection(section, margin, y, leftWidth, palette, chordIndex, 4);
    body.push(rendered.svg);
    chordIndex += section.chords.length;
    y += rendered.height + 20;
    leftBottom = Math.max(leftBottom, y - 20);
  });
  uniqueShapes.forEach((chordItem, index) => {
    const column = index % shapeColumns;
    const row = Math.floor(index / shapeColumns);
    const shapeX = rightX + column * (shapeCardWidth + shapeGap);
    const shapeY = bodyStartY + 38 + row * shapeMetrics.rowHeight;
    body.push(svgCompactShapeCard(chordItem, shapeX, shapeY, shapeCardWidth, palette, shapeEngine));
    rightBottom = Math.max(rightBottom, shapeY + shapeMetrics.cardHeight);
  });
  return { body: body.join(""), height: Math.max(leftBottom, rightBottom), leftBottom, rightBottom };
}

function separatedCopyrightPosition(separated, width, margin, height) {
  const footerY = height - 42;
  const leftClearance = footerY - separated.leftBottom;
  const rightClearance = footerY - separated.rightBottom;
  const useLeft = rightClearance < 44 && leftClearance >= rightClearance;
  return { x: useLeft ? margin : width - margin, anchor: useLeft ? "start" : "end", y: footerY, bestClearance: Math.max(leftClearance, rightClearance) };
}

export function generateProgressionSvg(data, {
  separateDownload = false,
  theme = "default",
  shapeEngine = globalThis.JamChordShapes
} = {}) {
  const palette = paletteForTheme(theme);
  const width = separateDownload ? 1400 : 1200;
  const margin = 42;
  const gap = 24;
  const cardWidth = (width - margin * 2 - gap) / 2;
  const cardHeight = 252;
  const bodyStartY = 150;
  const bpmText = data.bpm ? `BPM ${data.bpm}` : "BPM not set";
  const subtitleText = [bpmText, data.key, separateDownload ? "Progression / Shapes" : "Chord Progression"].filter(Boolean).join(" | ");

  if (separateDownload) {
    const separated = generateSeparatedProgressionSvg(data, palette, width, margin, bodyStartY, shapeEngine);
    let height = Math.max(560, separated.height + 72);
    let copyrightPosition = separatedCopyrightPosition(separated, width, margin, height);
    if (copyrightPosition.bestClearance < 44) {
      height += 44 - copyrightPosition.bestClearance + 14;
      copyrightPosition = separatedCopyrightPosition(separated, width, margin, height);
    }
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${palette.bg}"/>
    ${svgRoundedRect(24, 24, width - 48, height - 48, { fill: palette.panel, stroke: palette.border, radius: 18 })}
    ${svgText(margin, 76, data.songName, { fill: palette.gold, size: 42, weight: 900, family: "Noto Serif TC, Georgia, serif" })}
    ${svgText(margin, 112, subtitleText, { fill: palette.teal, size: 18, weight: 850 })}
    ${svgText(width - margin, 112, "Jam Tracks Hub", { fill: palette.muted, size: 16, weight: 850, anchor: "end" })}
    ${separated.body}
    ${svgCopyright(copyrightPosition.x, copyrightPosition.y, copyrightPosition.anchor, palette)}
</svg>`;
  }

  let y = bodyStartY;
  const body = [];
  data.sections.forEach(section => {
    body.push(svgText(margin, y, section.title, { fill: palette.gold, size: 28, weight: 900 }));
    y += 26;
    section.chords.forEach((chordItem, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      body.push(svgChordCard(chordItem, margin + column * (cardWidth + gap), y + row * (cardHeight + gap), cardWidth, cardHeight, palette, shapeEngine));
    });
    y += Math.ceil(section.chords.length / 2) * (cardHeight + gap) + 34;
  });
  const height = Math.max(560, y + 58);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${palette.bg}"/>
    ${svgRoundedRect(24, 24, width - 48, height - 48, { fill: palette.panel, stroke: palette.border, radius: 18 })}
    ${svgText(margin, 76, data.songName, { fill: palette.gold, size: 42, weight: 900, family: "Noto Serif TC, Georgia, serif" })}
    ${svgText(margin, 112, subtitleText, { fill: palette.teal, size: 18, weight: 850 })}
    ${svgText(width - margin, 112, "Jam Tracks Hub", { fill: palette.muted, size: 16, weight: 850, anchor: "end" })}
    ${body.join("")}
    ${svgCopyright(width - margin, height - 42, "end", palette)}
</svg>`;
}

export function progressionExportFilename(data) {
  const parts = [fileSafeName(data.songName)];
  if (data.key) parts.push(fileSafeName(data.key));
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

export async function exportProgressionImage(data, {
  separateDownload = false,
  theme = "default",
  shapeEngine = globalThis.JamChordShapes,
  ...options
} = {}) {
  const svg = generateProgressionSvg(data, { separateDownload, theme, shapeEngine });
  const filename = progressionExportFilename(data);
  try {
    const pngBlob = await svgToPngBlob(svg, options);
    downloadBlob(pngBlob, `${filename}.png`, options);
    return { format: "png", blob: pngBlob, filename: `${filename}.png`, svg };
  } catch (error) {
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(svgBlob, `${filename}.svg`, options);
    return { format: "svg", blob: svgBlob, filename: `${filename}.svg`, svg };
  }
}
