const test = require("node:test");
const assert = require("node:assert/strict");
const Storage = require("../scripts/song-workspace-storage.js");

test("reports IndexedDB unavailability without crashing", async () => {
    await assert.rejects(Storage.openDatabase(null), error => error.name === "StorageUnavailableError");
    await assert.rejects(Storage.list(null), error => error.name === "StorageUnavailableError");
});

test("stores lightweight preferences in localStorage when available", () => {
    const values = new Map();
    global.localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, value); }
    };
    try {
        assert.equal(Storage.writePreferences({ fontScale: 1.2, viewMode: "roman" }), true);
        assert.deepEqual(Storage.readPreferences(), { fontScale: 1.2, viewMode: "roman" });
        values.set(Storage.PREFERENCES_KEY, "not-json");
        assert.deepEqual(Storage.readPreferences(), {});
    } finally {
        delete global.localStorage;
    }
});

test("persists chord hints and per-song shape selections as presentation preferences", () => {
    const values = new Map();
    global.localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, value); }
    };
    const preferences = {
        chordHints: true,
        songShapeSelections: {
            "song-one": { Am7: "x,0,2,0,1,0" },
            "song-two": { Am7: "5,7,5,5,5,5" }
        }
    };
    try {
        assert.equal(Storage.writePreferences(preferences), true);
        assert.deepEqual(Storage.readPreferences(), preferences);
    } finally {
        delete global.localStorage;
    }
});

test("preference helpers degrade safely when localStorage is unavailable", () => {
    assert.deepEqual(Storage.readPreferences(), {});
    assert.equal(Storage.writePreferences({ viewMode: "original" }), false);
});
