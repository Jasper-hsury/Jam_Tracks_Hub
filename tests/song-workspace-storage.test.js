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
        assert.equal(Storage.writePreferences({ chartZoom: 120, viewMode: "roman" }), true);
        assert.deepEqual(Storage.readPreferences(), { chartZoom: 120, viewMode: "roman" });
        values.set(Storage.PREFERENCES_KEY, "not-json");
        assert.deepEqual(Storage.readPreferences(), {});
    } finally {
        delete global.localStorage;
    }
});

test("normalizes chart zoom input to an integer from 50 through 150", () => {
    assert.deepEqual(Storage.CHART_ZOOM, { min: 50, max: 150, step: 10, default: 100 });
    assert.equal(Storage.normalizeStoredChartZoom(undefined), 100);
    assert.equal(Storage.normalizeStoredChartZoom(120), 120);
    assert.equal(Storage.normalizeStoredChartZoom(49), 100);
    assert.equal(Storage.normalizeStoredChartZoom(151), 100);
    assert.equal(Storage.normalizeStoredChartZoom("abc"), 100);

    assert.equal(Storage.commitChartZoom(75, 100), 75);
    assert.equal(Storage.commitChartZoom(75.6, 100), 76);
    assert.equal(Storage.commitChartZoom(1, 100), 50);
    assert.equal(Storage.commitChartZoom(49, 100), 50);
    assert.equal(Storage.commitChartZoom(151, 100), 150);
    assert.equal(Storage.commitChartZoom(1000, 100), 150);
    assert.equal(Storage.commitChartZoom("", 120), 120);
    assert.equal(Storage.commitChartZoom("abc", 120), 120);
    assert.equal(Storage.commitChartZoom("100%", 120), 120);
    assert.equal(Storage.commitChartZoom(Number.NaN, 120), 120);
    assert.equal(Storage.commitChartZoom(Number.POSITIVE_INFINITY, 120), 120);
});

test("steps chart zoom by ten and clamps at both boundaries", () => {
    assert.equal(Storage.stepChartZoom(100, Storage.CHART_ZOOM.step), 110);
    assert.equal(Storage.stepChartZoom(100, -Storage.CHART_ZOOM.step), 90);
    assert.equal(Storage.stepChartZoom(150, Storage.CHART_ZOOM.step), 150);
    assert.equal(Storage.stepChartZoom(50, -Storage.CHART_ZOOM.step), 50);
});

test("persists only the normalized chart zoom preference across reads", () => {
    const values = new Map();
    global.localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, value); }
    };
    try {
        const preferences = { chartZoom: Storage.commitChartZoom(120, 100) };
        assert.equal(Storage.writePreferences(preferences), true);
        assert.equal(Storage.normalizeStoredChartZoom(Storage.readPreferences().chartZoom), 120);
        values.set(Storage.PREFERENCES_KEY, JSON.stringify({ chartZoom: 999999 }));
        assert.equal(Storage.normalizeStoredChartZoom(Storage.readPreferences().chartZoom), 100);
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
