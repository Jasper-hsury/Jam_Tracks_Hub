const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const workspaceJs = fs.readFileSync(path.join(root, "scripts/song-workspace.js"), "utf8");
const workspaceCss = fs.readFileSync(path.join(root, "styles/song-workspace.css"), "utf8");

function functionSource(name) {
    const marker = `    function ${name}(`;
    const start = workspaceJs.indexOf(marker);
    assert.notEqual(start, -1, `Missing ${name}`);
    const end = workspaceJs.indexOf("\n    function ", start + marker.length);
    return workspaceJs.slice(start, end < 0 ? workspaceJs.length : end);
}

test("shape picker close paths share one authoritative close pipeline", () => {
    const eventBindings = functionSource("attachEvents");
    const close = functionSource("closeShapePicker");
    const finalize = functionSource("finalizeShapePickerClose");

    assert.match(eventBindings, /closeShapePickerButton"\)\.addEventListener\("click", closeShapePicker\)/);
    assert.match(eventBindings, /shapePicker\.addEventListener\("cancel",[\s\S]*?closeShapePicker\(\)/);
    assert.match(eventBindings, /shapePicker\.addEventListener\("close", finalizeShapePickerClose\)/);
    assert.match(eventBindings, /event\.key === "Escape" && elements\.shapePicker\.open[\s\S]*?closeShapePicker\(\)/);
    assert.match(close, /shapePickerClosing = true;[\s\S]*?shapePicker\.close\(\)/);
    assert.equal((finalize.match(/restoreShapePickerScroll\(\)/g) || []).length, 1);
});

test("selection updates one diagram while the page remains locked before close", () => {
    const select = functionSource("selectShape");
    const update = functionSource("updateShapeCard");

    assert.ok(select.indexOf("Storage.writePreferences") < select.indexOf("updateShapeCard(symbol)"));
    assert.ok(select.indexOf("updateShapeCard(symbol)") < select.indexOf("closeShapePicker()"));
    assert.match(update, /currentDiagram\.replaceWith\(/);
    assert.doesNotMatch(update, /shapeCards\.replaceChildren/);
});

test("focus is restored before unlock with preventScroll and a bounded fallback", () => {
    const focus = functionSource("focusShapePickerTrigger");
    const finalize = functionSource("finalizeShapePickerClose");

    assert.match(focus, /focus\(\{ preventScroll: true \}\)/);
    assert.match(focus, /catch \(error\)[\s\S]*?target\.focus\(\)/);
    assert.ok(finalize.indexOf("focusShapePickerTrigger()") < finalize.indexOf("restoreShapePickerScroll()"));
    assert.doesNotMatch(workspaceJs, /scrollIntoView/);
});

test("scroll restoration is instant, singular, and free of deferred retries", () => {
    const restore = functionSource("restoreShapePickerScroll");

    assert.ok(restore.indexOf('classList.add("workspace-shape-picker-restoring")') < restore.indexOf("body.style[property]"));
    assert.equal((restore.match(/window\.scrollTo\(/g) || []).length, 1);
    assert.doesNotMatch(restore, /requestAnimationFrame|setTimeout/);
    assert.match(workspaceCss, /html\.workspace-shape-picker-restoring\s*\{[^}]*scroll-behavior:\s*auto !important/s);
});

test("shape picker scroll position is captured once per modal session", () => {
    const lock = functionSource("lockShapePickerScroll");

    assert.match(lock, /if \(state\.shapePickerScroll\) return/);
    assert.equal((lock.match(/window\.scrollX/g) || []).length, 1);
    assert.equal((lock.match(/window\.scrollY/g) || []).length, 1);
});
