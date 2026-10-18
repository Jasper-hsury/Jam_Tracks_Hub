import {
  EXPORT_FRET_POSITION_MARKERS,
  noteNamesForRoot,
  rootName,
  scaleDefinition,
  scalePitchClasses,
  STRINGS
} from "../music/scaleExplorer.mjs";

const INTERVAL_COLORS = Object.freeze([
  "#b83d55", "#b66c1f", "#267ca6", "#247f5b", "#5d50b2", "#96507c", "#58722f"
]);

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

// Image palettes follow the site's day and night themes (v4 Jazz Stage).
const IMAGE_THEMES = Object.freeze({
  light: Object.freeze({
    page: "#ece7de",
    glow: "rgba(242, 183, 5, 0.22)",
    tray: "#f8f5ef",
    trayEdge: "rgba(15, 43, 76, 0.08)",
    labelCell: "#efe9df",
    cell: "#f8f5ef",
    cellAlt: "#f2ede5",
    grid: "#d6cec0",
    string: "#9ca6b2",
    nut: "#0f2b4c",
    marker: "#b8ad9a",
    ink: "#0f2b4c",
    muted: "#4e5d70",
    noteRing: "#ffffff",
    stage: "#0f2b4c",
    stageEdge: "rgba(15, 43, 76, 0)"
  }),
  dark: Object.freeze({
    page: "#081627",
    glow: "rgba(242, 183, 5, 0.18)",
    tray: "#0f223a",
    trayEdge: "rgba(255, 255, 255, 0.1)",
    labelCell: "#132a47",
    cell: "#0f223a",
    cellAlt: "#122843",
    grid: "#2a4566",
    string: "#5f7896",
    nut: "#f1e9d8",
    marker: "#4c6a8f",
    ink: "#f1e9d8",
    muted: "#9fb3c8",
    noteRing: "#f1e9d8",
    stage: "#0f2b4c",
    stageEdge: "rgba(255, 255, 255, 0.1)"
  })
});
const STAGE_TEXT = "#f1e9d8";
const STAGE_MUTED = "#c9d3de";
const HIGHLIGHT = "#f2b705";
const DISPLAY_FONT = "'DM Serif Display', 'Noto Serif TC', Georgia, serif";
const TEXT_FONT = "'Work Sans', 'Noto Sans TC', Arial, sans-serif";
const BRAND_FONT = "Anton, Impact, 'Arial Narrow', sans-serif";

export function imageThemeFor(imageTheme) {
  return imageTheme === "dark" ? "dark" : "light";
}

export function createScaleExportModel({ rootPitch, scaleId, fretStart, fretEnd, labelMode, localizedScaleName, imageTheme }) {
  const visibleFrets = Array.from(
    { length: Number(fretEnd) - Number(fretStart) + 1 },
    (_, index) => Number(fretStart) + index
  );
  const scale = scaleDefinition(scaleId);
  const noteNames = noteNamesForRoot(rootPitch);
  const pitchClasses = scalePitchClasses(rootPitch, scaleId);
  const margin = 32;
  const inset = 36;
  const outerPadding = margin + inset;
  const labelWidth = 68;
  const cellWidth = 82;
  const rowHeight = 66;
  const bandHeight = 226;
  const trayGap = 18;
  const headerRowHeight = 28;
  const markerHeight = 34;
  const footerHeight = 76;
  const boardWidth = labelWidth + visibleFrets.length * cellWidth;
  const width = Math.max(1040, outerPadding * 2 + boardWidth);
  const trayTop = margin + bandHeight + trayGap;
  const boardTop = trayTop + inset;
  const trayHeight = inset + headerRowHeight + STRINGS.length * rowHeight + markerHeight + inset - 12;
  const height = trayTop + trayHeight + footerHeight;
  const root = rootName(rootPitch);
  const themeName = imageThemeFor(imageTheme);

  return {
    bandHeight,
    boardTop,
    cellWidth,
    fileName: `${root}-${scale.name}-frets-${fretStart}-${fretEnd}${themeName === "dark" ? "-dark" : ""}`
      .toLowerCase()
      .replace(/#/g, "sharp")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    headerRowHeight,
    height,
    inset,
    intervalColors: INTERVAL_COLORS,
    labelMode,
    labelWidth,
    localizedScaleName,
    margin,
    markerHeight,
    noteNames,
    outerPadding,
    palette: IMAGE_THEMES[themeName],
    pitchClasses,
    root,
    rootPitch: Number(rootPitch),
    rowHeight,
    scale,
    strings: STRINGS,
    themeName,
    trayHeight,
    trayTop,
    visibleFrets,
    width
  };
}

function fillRadialGlow(context, x, y, radius, color) {
  if (typeof context.createRadialGradient !== "function") return;
  const glow = context.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(1, "rgba(242, 183, 5, 0)");
  context.fillStyle = glow;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

export function drawScaleImage(documentRef, state) {
  const model = createScaleExportModel(state);
  const palette = model.palette;
  const canvas = documentRef.createElement("canvas");
  const scaleFactor = 2;
  canvas.width = model.width * scaleFactor;
  canvas.height = model.height * scaleFactor;
  const context = canvas.getContext("2d");
  context.scale(scaleFactor, scaleFactor);

  // Page and a warm stage light in the top right corner.
  context.fillStyle = palette.page;
  context.fillRect(0, 0, model.width, model.height);
  fillRadialGlow(context, model.width - 120, -60, 620, palette.glow);

  // The navy stage: scale name, description and interval chips.
  const bandX = model.margin;
  const bandY = model.margin;
  const bandWidth = model.width - model.margin * 2;
  context.save();
  roundedRect(context, bandX, bandY, bandWidth, model.bandHeight, 30);
  context.fillStyle = palette.stage;
  context.fill();
  if (typeof context.clip === "function") {
    context.clip();
    fillRadialGlow(context, bandX + bandWidth - 140, bandY - 80, 420, "rgba(242, 183, 5, 0.3)");
  }
  context.restore();
  roundedRect(context, bandX, bandY, bandWidth, model.bandHeight, 30);
  context.strokeStyle = palette.stageEdge;
  context.lineWidth = 1;
  context.stroke();

  const textX = model.outerPadding;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = HIGHLIGHT;
  context.font = `600 15px ${TEXT_FONT}`;
  context.fillText("Jam Tracks Hub · Scale Explorer", textX, bandY + 52);
  context.textAlign = "right";
  context.fillStyle = STAGE_MUTED;
  context.font = `500 14px ${TEXT_FONT}`;
  context.fillText("Standard tuning: E A D G B E", bandX + bandWidth - model.inset, bandY + 52);

  context.textAlign = "left";
  context.fillStyle = STAGE_TEXT;
  context.font = `400 48px ${DISPLAY_FONT}`;
  context.fillText(`${model.root} ${model.localizedScaleName}`, textX, bandY + 110);
  context.fillStyle = STAGE_MUTED;
  context.font = `500 16px ${TEXT_FONT}`;
  context.fillText(
    `Guitar scale diagram · frets ${state.fretStart}-${state.fretEnd} · ${model.labelMode === "note" ? "note names" : "scale degrees"}`,
    textX,
    bandY + 142
  );

  let legendX = textX;
  const chipTop = bandY + 164;
  model.scale.intervals.forEach((interval, index) => {
    const label = `${model.scale.degrees[index]}  ${model.noteNames[(model.rootPitch + interval) % 12]}`;
    context.font = `700 14px ${TEXT_FONT}`;
    const chipWidth = Math.max(72, context.measureText(label).width + 32);
    context.fillStyle = model.intervalColors[index];
    roundedRect(context, legendX, chipTop, chipWidth, 36, 18);
    context.fill();
    if (index === 0) {
      context.strokeStyle = STAGE_TEXT;
      context.lineWidth = 2;
      context.stroke();
    }
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, legendX + chipWidth / 2, chipTop + 18.5);
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    legendX += chipWidth + 10;
  });

  // The fretboard sits on a soft rounded tray.
  roundedRect(context, model.margin, model.trayTop, bandWidth, model.trayHeight, 30);
  context.fillStyle = palette.tray;
  context.fill();
  context.strokeStyle = palette.trayEdge;
  context.lineWidth = 1;
  context.stroke();

  const boardX = model.outerPadding;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = palette.muted;
  context.font = `700 13px ${TEXT_FONT}`;
  context.fillText("String", boardX + model.labelWidth / 2, model.boardTop + 12);
  model.visibleFrets.forEach((fret, index) => {
    context.fillText(String(fret), boardX + model.labelWidth + index * model.cellWidth + model.cellWidth / 2, model.boardTop + 12);
  });

  const stringsTop = model.boardTop + model.headerRowHeight;
  model.strings.forEach((string, stringIndex) => {
    const rowY = stringsTop + stringIndex * model.rowHeight;
    context.fillStyle = palette.labelCell;
    context.fillRect(boardX, rowY, model.labelWidth, model.rowHeight);
    context.strokeStyle = palette.grid;
    context.lineWidth = 1;
    context.strokeRect(boardX, rowY, model.labelWidth, model.rowHeight);
    context.fillStyle = palette.ink;
    context.font = `700 16px ${TEXT_FONT}`;
    context.fillText(string.name, boardX + model.labelWidth / 2, rowY + model.rowHeight / 2);

    model.visibleFrets.forEach((fret, fretIndex) => {
      const cellX = boardX + model.labelWidth + fretIndex * model.cellWidth;
      context.fillStyle = fret % 2 === 0 ? palette.cell : palette.cellAlt;
      context.fillRect(cellX, rowY, model.cellWidth, model.rowHeight);
      context.strokeStyle = palette.grid;
      context.lineWidth = 1.2;
      context.strokeRect(cellX, rowY, model.cellWidth, model.rowHeight);
      if (fret === 0) {
        // The nut: one heavy bar where the open strings meet the first fret.
        context.fillStyle = palette.nut;
        context.fillRect(cellX + model.cellWidth - 3, rowY, 6, model.rowHeight);
      }
      context.strokeStyle = palette.string;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(cellX, rowY + model.rowHeight / 2);
      context.lineTo(cellX + model.cellWidth, rowY + model.rowHeight / 2);
      context.stroke();

      const pitch = (string.pitch + fret) % 12;
      const intervalIndex = model.pitchClasses.indexOf(pitch);
      if (intervalIndex === -1) return;

      const centerX = cellX + model.cellWidth / 2;
      const centerY = rowY + model.rowHeight / 2;
      const radius = intervalIndex === 0 ? 21 : 18;
      context.fillStyle = model.intervalColors[intervalIndex];
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = palette.noteRing;
      context.lineWidth = intervalIndex === 0 ? 4 : 2;
      context.stroke();
      if (intervalIndex === 0) {
        context.strokeStyle = model.intervalColors[0];
        context.lineWidth = 2;
        context.beginPath();
        context.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
        context.stroke();
      }
      context.fillStyle = "#ffffff";
      context.font = `700 13px ${TEXT_FONT}`;
      context.fillText(
        model.labelMode === "note" ? model.noteNames[pitch] : model.scale.degrees[intervalIndex],
        centerX,
        centerY + 0.5
      );
    });
  });

  const markersY = stringsTop + model.strings.length * model.rowHeight + 17;
  model.visibleFrets.forEach((fret, index) => {
    if (!EXPORT_FRET_POSITION_MARKERS.includes(fret)) return;
    const centerX = boardX + model.labelWidth + index * model.cellWidth + model.cellWidth / 2;
    context.fillStyle = palette.marker;
    const dots = fret === 12 ? [-7, 7] : [0];
    dots.forEach(offset => {
      context.beginPath();
      context.arc(centerX + offset, markersY, 4, 0, Math.PI * 2);
      context.fill();
    });
  });

  // Footer: the wordmark on the left, the site and rights on the right.
  const footerY = model.trayTop + model.trayHeight + 46;
  context.textBaseline = "alphabetic";
  context.textAlign = "left";
  context.fillStyle = palette.ink;
  context.font = `400 22px ${BRAND_FONT}`;
  context.fillText("JAM TRACKS HUB", model.margin + 4, footerY);
  context.textAlign = "right";
  context.fillStyle = palette.muted;
  context.font = `500 13px ${TEXT_FONT}`;
  context.fillText("jamtrackshub.com · © 2026 Jam Tracks Hub. All rights reserved.", model.width - model.margin - 4, footerY);
  return { canvas, model };
}

async function loadImageFonts(documentRef) {
  const fonts = documentRef.fonts;
  if (!fonts || typeof fonts.load !== "function") return;
  try {
    await Promise.all([
      fonts.load(`400 48px ${DISPLAY_FONT}`),
      fonts.load("600 48px 'Noto Serif TC'", "音階"),
      fonts.load(`500 16px ${TEXT_FONT}`),
      fonts.load(`700 14px ${TEXT_FONT}`),
      fonts.load(`400 22px ${BRAND_FONT}`)
    ]);
  } catch (error) {
    // Draw with the fallback fonts when a web font cannot load.
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isIosSafariLike(windowRef) {
  const userAgent = windowRef.navigator.userAgent || "";
  const platform = windowRef.navigator.platform || "";
  return /iPad|iPhone|iPod/.test(userAgent)
    || (platform === "MacIntel" && windowRef.navigator.maxTouchPoints > 1);
}

function downloadImageUrl(documentRef, url, fileName) {
  const link = documentRef.createElement("a");
  link.href = url;
  link.download = `${fileName}.png`;
  documentRef.body.appendChild(link);
  link.click();
  link.remove();
}

function showIosImagePreview(previewWindow, url, fileName, saveImageHint) {
  if (!previewWindow || previewWindow.closed) return false;
  previewWindow.document.open();
  previewWindow.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(fileName)}.png</title><style>body{margin:0;padding:18px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#241d17;background:#f7f4ef}p{margin:0 0 14px;font-weight:700}img{display:block;width:100%;height:auto;border-radius:10px;box-shadow:0 12px 32px rgba(91,70,52,.18)}</style></head><body><p>${escapeHtml(saveImageHint)}</p><img src="${url}" alt="${escapeHtml(fileName)}"></body></html>`);
  previewWindow.document.close();
  return true;
}

export async function downloadScalePng({ documentRef = document, windowRef = window, saveImageHint, ...state }) {
  const usePreview = isIosSafariLike(windowRef);
  const previewWindow = usePreview ? windowRef.open("", "_blank") : null;
  await loadImageFonts(documentRef);
  const { canvas, model } = drawScaleImage(documentRef, state);

  return new Promise(resolve => {
    canvas.toBlob(blob => {
      if (!blob) {
        const dataUrl = canvas.toDataURL("image/png");
        if (!usePreview || !showIosImagePreview(previewWindow, dataUrl, model.fileName, saveImageHint)) {
          if (usePreview) windowRef.location.href = dataUrl;
          else downloadImageUrl(documentRef, dataUrl, model.fileName);
        }
        resolve(model);
        return;
      }

      const url = windowRef.URL.createObjectURL(blob);
      if (!usePreview || !showIosImagePreview(previewWindow, url, model.fileName, saveImageHint)) {
        if (usePreview) windowRef.location.href = url;
        else downloadImageUrl(documentRef, url, model.fileName);
      }
      windowRef.setTimeout(() => windowRef.URL.revokeObjectURL(url), usePreview ? 120000 : 1000);
      resolve(model);
    }, "image/png");
  });
}
