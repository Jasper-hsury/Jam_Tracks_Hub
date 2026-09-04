const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const workspaceCss = fs.readFileSync(path.join(root, "styles/song-workspace.css"), "utf8");
const workspaceJs = fs.readFileSync(path.join(root, "src/composables/useSongWorkspace.js"), "utf8");
const workspaceCore = fs.readFileSync(path.join(root, "scripts/song-workspace-core.js"), "utf8");
const dictionaryCss = fs.readFileSync(path.join(root, "styles/chord-dictionary.css"), "utf8");

test("Song Workspace shares chord-diagram color tokens with Chord Dictionary", () => {
    assert.match(dictionaryCss, /:is\(\.chord-dictionary-page, \.song-workspace-page, \.workspace-shape-dialog\)/);
    assert.match(dictionaryCss, /html\[data-theme="light"\] :is\(\.chord-dictionary-page, \.song-workspace-page, \.workspace-shape-dialog\)/);
    assert.match(dictionaryCss, /--diagram-root-fill:\s*#2d7b76/);
    assert.doesNotMatch(workspaceCss, /--diagram-(?:tone|root|third|fifth|seventh|extension)-/);
});

test("lyrics use natural flow while chord annotations occupy a separate layer", () => {
    assert.match(workspaceCss, /\.workspace-token-track\s*\{[^}]*position:\s*relative/s);
    assert.match(workspaceCss, /\.workspace-chord-annotation\s*\{[^}]*position:\s*absolute/s);
    assert.match(workspaceCss, /\.workspace-lyric-flow\s*\{[^}]*width:\s*max-content/s);
    assert.match(workspaceCss, /@media \(max-width: 720px\)[\s\S]*?\.workspace-lyric-flow\s*\{[^}]*width:\s*100%[^}]*overflow-wrap:\s*anywhere/s);
    assert.doesNotMatch(workspaceCss, /grid-auto-columns:\s*max-content/);
});

test("the annotation renderer has one row and no multi-row packing metadata", () => {
    assert.match(workspaceCss, /\.workspace-chord-annotation\s*\{[^}]*top:\s*0/s);
    assert.match(workspaceCss, /\.workspace-chord-annotation\s*\{[^}]*transform-origin:\s*left center/s);
    assert.match(workspaceJs, /Core\.fitSingleRowChordAnnotations\(measured, 8, 0\.6\)/);
    assert.doesNotMatch(workspaceJs, /rowCount|item\.row|workspace-chord-stack-height|packChordAnnotations/);
    assert.doesNotMatch(workspaceCore, /rowEnds|packChordAnnotations/);
});

test("mobile chart rows can shrink without pushing Add controls offscreen", () => {
    assert.match(workspaceCss, /\.workspace-section\s*\{[^}]*min-width:\s*0/s);
    assert.match(workspaceCss, /\.workspace-lines\s*\{[^}]*min-width:\s*0/s);
    assert.match(workspaceCss, /\.workspace-line\s*\{[^}]*min-width:\s*0/s);
    assert.match(workspaceCss, /\.workspace-line-content\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0/s);
});

test("the Add menu prefers the trigger's right side and has viewport fallbacks", () => {
    assert.match(workspaceCss, /\.workspace-add-menu\s*\{[^}]*left:\s*calc\(100% \+ 10px\)/s);
    assert.match(workspaceCss, /\.workspace-add-menu\.is-left/);
    assert.match(workspaceCss, /\.workspace-add-menu\.is-below/);
    assert.match(workspaceCss, /\.workspace-add-menu\.is-above/);
});
