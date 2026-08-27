const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const workspaceHtml = read("song-workspace.html");
const workspaceJs = read("scripts/song-workspace.js");
const storageJs = read("scripts/song-workspace-storage.js");
const privacyHtml = read("privacy-policy.html");
const en = JSON.parse(read("locales/en/common.json"));
const zh = JSON.parse(read("locales/zh-TW/common.json"));

function region(source, start, end) {
    const startIndex = source.indexOf(start);
    const endIndex = source.indexOf(end, startIndex + start.length);
    assert.notEqual(startIndex, -1, `Missing region start: ${start}`);
    assert.notEqual(endIndex, -1, `Missing region end: ${end}`);
    return source.slice(startIndex, endIndex);
}

test("places local-first and rights disclosures at the main creation and import points", () => {
    const main = region(workspaceHtml, 'data-disclosure="local-first"', "</aside>");
    const dialog = region(workspaceHtml, 'data-create-disclosure', "</div>");
    const chordPro = region(workspaceHtml, 'data-import-option="chordpro"', "</article>");
    const jthJson = region(workspaceHtml, 'data-import-option="jth-json"', "</article>");

    assert.match(main, /pages\.songWorkspace\.localPrivacy/);
    assert.match(main, /pages\.songWorkspace\.rightsImport/);
    assert.match(main, /privacy-policy\.html#user-content/);
    assert.match(dialog, /id="createLocalDisclosure"/);
    assert.match(dialog, /id="createRightsDisclosure"/);
    assert.match(workspaceHtml, /aria-describedby="createLocalDisclosure createRightsDisclosure"/);
    assert.match(chordPro, /pages\.songWorkspace\.chordProLocalDisclosure/);
    assert.match(jthJson, /pages\.songWorkspace\.jthJsonLocalDisclosure/);
});

test("uses mode-specific low-friction modal disclosures without changing submit controls", () => {
    assert.match(workspaceJs, /function creationDisclosure\(mode\)/);
    assert.match(workspaceJs, /mode === "chordpro"[\s\S]*?chordProLocalDisclosure/);
    assert.match(workspaceJs, /mode === "chords"[\s\S]*?songDataLocalDisclosure/);
    assert.match(workspaceJs, /pastedContentLocalDisclosure/);
    assert.match(workspaceJs, /createLocalDisclosure\.textContent = creationDisclosure\(mode\)/);
    assert.match(workspaceHtml, /id="confirmCreateButton"[^>]*type="submit"/);
    assert.match(workspaceHtml, /type="button"[^>]*data-dialog-close/);
});

test("discloses full-content exports once without removing any format", () => {
    const menu = region(workspaceHtml, 'id="downloadMenu"', "</div>");
    ["json", "chordpro", "txt", "print"].forEach(format => {
        assert.match(menu, new RegExp(`data-download="${format}"`));
    });
    assert.match(menu, /id="exportDisclosure"/);
    assert.match(menu, /pages\.songWorkspace\.exportDisclosure/);
    assert.match(workspaceHtml, /aria-describedby="exportDisclosure"/);
});

test("English and zh-TW copy covers storage, upload, rights, clearing, and exports", () => {
    const enCopy = en.pages.songWorkspace;
    const zhCopy = zh.pages.songWorkspace;

    assert.match(enCopy.localPrivacy, /browser/i);
    assert.match(enCopy.localPrivacy, /not uploaded/i);
    assert.match(enCopy.rightsImport, /right|legal permission/i);
    assert.match(enCopy.localWarning, /clearing browser\/site data/i);
    assert.match(enCopy.exportDisclosure, /lyrics|content/i);
    assert.match(enCopy.exportDisclosure, /rights|legal permission/i);

    assert.match(zhCopy.localPrivacy, /瀏覽器/);
    assert.match(zhCopy.localPrivacy, /不會上傳/);
    assert.match(zhCopy.rightsImport, /有權|法律允許/);
    assert.match(zhCopy.localWarning, /清除瀏覽器或網站資料/);
    assert.match(zhCopy.exportDisclosure, /歌詞|內容/);
    assert.match(zhCopy.exportDisclosure, /相關權利|法律允許/);
});

test("extends the existing privacy page with bounded user-content policy wording", () => {
    assert.match(privacyHtml, /id="song-workspace-local-storage"/);
    assert.match(privacyHtml, /id="user-content"/);
    ["18", "19", "20", "21", "22", "23", "24", "25"].forEach(key => {
        assert.match(privacyHtml, new RegExp(`privacy\\.body\\.${key}`));
        assert.equal(typeof en.privacy.body[key], "string");
        assert.equal(typeof zh.privacy.body[key], "string");
    });
    assert.match(en.privacy.body["24"], /responsible.*rights|legal permission/i);
    assert.match(zh.privacy.body["24"], /必要權利|法律允許/);
    assert.match(en.privacy.body["25"], /local processing alone does not make a use lawful/i);
    assert.match(zh.privacy.body["25"], /本機處理.*當然合法/);
});

test("does not advertise absent cloud, public-sharing, or competitor features", () => {
    const visibleWorkspaceCopy = [workspaceHtml, JSON.stringify(en.pages.songWorkspace), JSON.stringify(zh.pages.songWorkspace)].join("\n");
    assert.doesNotMatch(visibleWorkspaceCopy, /Share Arrangement|server backup|public share|91PU|91譜/i);
    assert.doesNotMatch(visibleWorkspaceCopy, /(?:includes|provides|supports|enable[sd]?)\s+cloud sync/i);
});

test("song content remains on browser storage paths without transport primitives", () => {
    const source = [workspaceJs, storageJs].join("\n");
    assert.match(storageJs, /indexedDB/);
    assert.match(storageJs, /localStorage\.setItem/);
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|FormData|\.post\s*\(/);
});
