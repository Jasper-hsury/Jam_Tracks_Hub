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

export function createScaleExportModel({ rootPitch, scaleId, fretStart, fretEnd, labelMode, localizedScaleName }) {
  const visibleFrets = Array.from(
    { length: Number(fretEnd) - Number(fretStart) + 1 },
    (_, index) => Number(fretStart) + index
  );
  const scale = scaleDefinition(scaleId);
  const noteNames = noteNamesForRoot(rootPitch);
  const pitchClasses = scalePitchClasses(rootPitch, scaleId);
  const outerPadding = 54;
  const labelWidth = 68;
  const cellWidth = 82;
  const rowHeight = 66;
  const titleHeight = 158;
  const legendHeight = 72;
  const markerHeight = 34;
  const footerHeight = 58;
  const boardWidth = labelWidth + visibleFrets.length * cellWidth;
  const width = Math.max(1040, outerPadding * 2 + boardWidth);
  const boardTop = titleHeight + legendHeight;
  const height = boardTop + 28 + STRINGS.length * rowHeight + markerHeight + footerHeight;
  const root = rootName(rootPitch);

  return {
    boardTop,
    cellWidth,
    fileName: `${root}-${scale.name}-frets-${fretStart}-${fretEnd}`
      .toLowerCase()
      .replace(/#/g, "sharp")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    height,
    intervalColors: INTERVAL_COLORS,
    labelMode,
    labelWidth,
    legendHeight,
    localizedScaleName,
    noteNames,
    outerPadding,
    pitchClasses,
    root,
    rootPitch: Number(rootPitch),
    rowHeight,
    scale,
    strings: STRINGS,
    titleHeight,
    visibleFrets,
    width
  };
}

export function drawScaleImage(documentRef, state) {
  const model = createScaleExportModel(state);
  const canvas = documentRef.createElement("canvas");
  const scaleFactor = 2;
  canvas.width = model.width * scaleFactor;
  canvas.height = model.height * scaleFactor;
  const context = canvas.getContext("2d");
  context.scale(scaleFactor, scaleFactor);

  context.fillStyle = "#f5efe6";
  context.fillRect(0, 0, model.width, model.height);
  context.fillStyle = "#fffdf9";
  roundedRect(context, 24, 24, model.width - 48, model.height - 48, 14);
  context.fill();
  context.strokeStyle = "#d8c8b7";
  context.lineWidth = 1;
  context.stroke();

  context.fillStyle = "#8e613d";
  context.font = "700 34px Georgia, serif";
  context.fillText(`${model.root} ${model.localizedScaleName}`, model.outerPadding, 74);
  context.fillStyle = "#4d433b";
  context.font = "600 16px Arial, sans-serif";
  context.fillText(
    `Guitar scale diagram · frets ${state.fretStart}-${state.fretEnd} · ${model.labelMode === "note" ? "note names" : "scale degrees"}`,
    model.outerPadding,
    105
  );
  context.fillStyle = "#766b62";
  context.font = "14px Arial, sans-serif";
  context.fillText("Standard tuning: E A D G B E", model.outerPadding, 132);

  let legendX = model.outerPadding;
  model.scale.intervals.forEach((interval, index) => {
    const label = `${model.scale.degrees[index]}  ${model.noteNames[(model.rootPitch + interval) % 12]}`;
    context.font = "700 13px Arial, sans-serif";
    const chipWidth = Math.max(68, context.measureText(label).width + 28);
    context.fillStyle = model.intervalColors[index];
    roundedRect(context, legendX, model.titleHeight + 11, chipWidth, 34, 17);
    context.fill();
    if (index === 0) {
      context.strokeStyle = "#6c2c3c";
      context.lineWidth = 2;
      context.stroke();
    }
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, legendX + chipWidth / 2, model.titleHeight + 28);
    legendX += chipWidth + 9;
  });

  const boardX = model.outerPadding;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#766b62";
  context.font = "700 13px Arial, sans-serif";
  context.fillText("String", boardX + model.labelWidth / 2, model.boardTop + 14);
  model.visibleFrets.forEach((fret, index) => {
    context.fillText(String(fret), boardX + model.labelWidth + index * model.cellWidth + model.cellWidth / 2, model.boardTop + 14);
  });

  const stringsTop = model.boardTop + 28;
  model.strings.forEach((string, stringIndex) => {
    const rowY = stringsTop + stringIndex * model.rowHeight;
    context.fillStyle = "#f1e7db";
    context.fillRect(boardX, rowY, model.labelWidth, model.rowHeight);
    context.strokeStyle = "#cfbda9";
    context.lineWidth = 1;
    context.strokeRect(boardX, rowY, model.labelWidth, model.rowHeight);
    context.fillStyle = "#7d5435";
    context.font = "700 16px Arial, sans-serif";
    context.fillText(string.name, boardX + model.labelWidth / 2, rowY + model.rowHeight / 2);

    model.visibleFrets.forEach((fret, fretIndex) => {
      const cellX = boardX + model.labelWidth + fretIndex * model.cellWidth;
      context.fillStyle = fret % 2 === 0 ? "#fbf7f1" : "#f7f0e7";
      context.fillRect(cellX, rowY, model.cellWidth, model.rowHeight);
      context.strokeStyle = fret === 0 ? "#a77a51" : "#c7b5a2";
      context.lineWidth = fret === 0 ? 4 : 1.4;
      context.strokeRect(cellX, rowY, model.cellWidth, model.rowHeight);
      context.strokeStyle = "#9b8c7e";
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
      context.strokeStyle = intervalIndex === 0 ? "#ffffff" : "#f7eee6";
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
      context.font = "700 13px Arial, sans-serif";
      context.fillText(
        model.labelMode === "note" ? model.noteNames[pitch] : model.scale.degrees[intervalIndex],
        centerX,
        centerY + 0.5
      );
    });
  });

  const markersY = stringsTop + model.strings.length * model.rowHeight + 16;
  model.visibleFrets.forEach((fret, index) => {
    if (!EXPORT_FRET_POSITION_MARKERS.includes(fret)) return;
    const centerX = boardX + model.labelWidth + index * model.cellWidth + model.cellWidth / 2;
    context.fillStyle = "#b18a64";
    const dots = fret === 12 ? [-7, 7] : [0];
    dots.forEach(offset => {
      context.beginPath();
      context.arc(centerX + offset, markersY, 4, 0, Math.PI * 2);
      context.fill();
    });
  });

  context.textAlign = "right";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#86786c";
  context.font = "12px Arial, sans-serif";
  context.fillText("@ 2026 Jam Tracks Hub. All rights reserved.", model.width - model.outerPadding, model.height - 34);
  return { canvas, model };
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

export function downloadScalePng({ documentRef = document, windowRef = window, saveImageHint, ...state }) {
  const usePreview = isIosSafariLike(windowRef);
  const previewWindow = usePreview ? windowRef.open("", "_blank") : null;
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
