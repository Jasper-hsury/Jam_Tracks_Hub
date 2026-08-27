const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const workspaceJs = fs.readFileSync(path.join(root, "scripts/song-workspace.js"), "utf8");
const workspaceCss = fs.readFileSync(path.join(root, "styles/song-workspace.css"), "utf8");

function functionSource(name) {
    const marker = workspaceJs.includes(`    async function ${name}(`)
        ? `    async function ${name}(`
        : `    function ${name}(`;
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
    assert.equal((finalize.match(/restoreDialogBackground\(elements\.shapePicker/g) || []).length, 1);
});

test("selection updates one diagram while the page remains locked before close", () => {
    const select = functionSource("selectShape");
    const update = functionSource("updateShapeCard");

    assert.ok(select.indexOf("Storage.writePreferences") < select.indexOf("updateShapeCard(symbol)"));
    assert.ok(select.indexOf("updateShapeCard(symbol)") < select.indexOf("closeShapePicker()"));
    assert.match(update, /currentDiagram\.replaceWith\(/);
    assert.doesNotMatch(update, /shapeCards\.replaceChildren/);
});

test("shared dialog focus is restored before unlock with preventScroll and a bounded fallback", () => {
    const focus = functionSource("focusWithoutScroll");
    const restore = functionSource("restoreDialogBackground");
    const finalize = functionSource("finalizeShapePickerClose");

    assert.match(focus, /focus\(\{ preventScroll: true \}\)/);
    assert.match(focus, /catch \(error\)[\s\S]*?target\.focus\(\)/);
    assert.ok(restore.indexOf("focusWithoutScroll") < restore.indexOf("body.style[property]"));
    assert.match(finalize, /restoreDialogBackground\(elements\.shapePicker, shapePickerFocusTarget\(\)\)/);
    assert.doesNotMatch(workspaceJs, /scrollIntoView/);
});

test("shared scroll restoration is instant, singular, and free of deferred retries", () => {
    const restore = functionSource("restoreDialogBackground");

    assert.ok(restore.indexOf('classList.add("workspace-dialog-restoring")') < restore.indexOf("body.style[property]"));
    assert.equal((restore.match(/window\.scrollTo\(/g) || []).length, 1);
    assert.doesNotMatch(restore, /requestAnimationFrame|setTimeout/);
    assert.match(workspaceCss, /html\.workspace-dialog-restoring\s*\{[^}]*scroll-behavior:\s*auto !important/s);
});

test("shared dialog lock captures the scroll position once per modal session", () => {
    const lock = functionSource("lockDialogBackground");

    assert.match(lock, /if \(state\.dialogLock\) return/);
    assert.equal((lock.match(/window\.scrollX/g) || []).length, 1);
    assert.equal((lock.match(/window\.scrollY/g) || []).length, 1);
});

test("Create and ChordPro use the same background lock and restore contract", () => {
    const openCreate = functionSource("openCreateDialog");
    const create = functionSource("createSongFromDialog");
    const events = functionSource("attachEvents");

    assert.ok(openCreate.indexOf("lockDialogBackground(elements.createDialog") < openCreate.indexOf("elements.createDialog.showModal()"));
    assert.match(create, /createDialog\.close\("created"\)[\s\S]*?restoreDialogBackground\(elements\.createDialog, null\)/);
    assert.match(events, /\[elements\.createDialog, elements\.sectionDialog, elements\.lineDialog\][\s\S]*?addEventListener\("close"[\s\S]*?restoreDialogBackground/);
    assert.match(workspaceCss, /html\.workspace-dialog-open,[\s\S]*?body\.workspace-dialog-open\s*\{[^}]*overflow:\s*hidden/s);
});
