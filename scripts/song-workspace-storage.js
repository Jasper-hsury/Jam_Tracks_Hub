(function(root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.JamSongStorage = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
    "use strict";

    const DB_NAME = "jamtrackshub-song-workspace";
    const DB_VERSION = 1;
    const STORE_NAME = "songs";
    const PREFERENCES_KEY = "jamTracksHubSongWorkspacePreferences";
    const MAX_PREFERENCES_BYTES = 256 * 1024;
    const MAX_STORED_RECORDS = 500;
    const MAX_SHAPE_SELECTION_SONGS = 500;
    const MAX_SHAPE_SELECTIONS_PER_SONG = 128;
    const CHART_ZOOM = Object.freeze({ min: 50, max: 150, step: 10, default: 100 });
    const LINE_SPACING = Object.freeze({ min: 0, max: 20, step: 1, default: 10 });

    class StorageUnavailableError extends Error {
        constructor(message) {
            super(message || "Browser storage is unavailable.");
            this.name = "StorageUnavailableError";
        }
    }

    function requestResult(request) {
        return new Promise(function(resolve, reject) {
            request.onsuccess = function() { resolve(request.result); };
            request.onerror = function() { reject(request.error || new StorageUnavailableError()); };
        });
    }

    function openDatabase(indexedDb) {
        const idb = indexedDb || (typeof indexedDB !== "undefined" ? indexedDB : null);
        if (!idb) {
            return Promise.reject(new StorageUnavailableError());
        }
        return new Promise(function(resolve, reject) {
            const request = idb.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = function() {
                const database = request.result;
                const store = database.objectStoreNames.contains(STORE_NAME)
                    ? request.transaction.objectStore(STORE_NAME)
                    : database.createObjectStore(STORE_NAME, { keyPath: "id" });
                if (!store.indexNames.contains("updatedAt")) {
                    store.createIndex("updatedAt", "updatedAt");
                }
            };
            request.onsuccess = function() { resolve(request.result); };
            request.onerror = function() { reject(request.error || new StorageUnavailableError()); };
            request.onblocked = function() { reject(new StorageUnavailableError("Song storage is blocked by another tab.")); };
        });
    }

    async function withStore(mode, action, indexedDb) {
        const database = await openDatabase(indexedDb);
        try {
            const transaction = database.transaction(STORE_NAME, mode);
            const store = transaction.objectStore(STORE_NAME);
            const completion = new Promise(function(resolve, reject) {
                transaction.oncomplete = resolve;
                transaction.onerror = function() { reject(transaction.error || new StorageUnavailableError()); };
                transaction.onabort = function() { reject(transaction.error || new StorageUnavailableError()); };
            });
            const result = await action(store);
            await completion;
            return result;
        } finally {
            database.close();
        }
    }

    function list(indexedDb) {
        return withStore("readonly", async function(store) {
            const items = await requestResult(store.getAll(undefined, MAX_STORED_RECORDS + 1));
            return items.sort(function(a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)); });
        }, indexedDb);
    }

    function get(id, indexedDb) {
        return withStore("readonly", function(store) { return requestResult(store.get(id)); }, indexedDb);
    }

    function put(song, indexedDb) {
        return withStore("readwrite", function(store) { return requestResult(store.put(song)); }, indexedDb);
    }

    function remove(id, indexedDb) {
        return withStore("readwrite", function(store) { return requestResult(store.delete(id)); }, indexedDb);
    }

    function replaceAll(songs, indexedDb) {
        return withStore("readwrite", function(store) {
            store.clear();
            songs.forEach(function(song) { store.put(song); });
            return Promise.resolve(songs.length);
        }, indexedDb);
    }

    function boundedString(value, maxLength) {
        return typeof value === "string" && value.length <= maxLength ? value : null;
    }

    function sanitizeShapeSelections(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) return {};
        const selections = {};
        Object.keys(value).slice(0, MAX_SHAPE_SELECTION_SONGS).forEach(function(songId) {
            const safeSongId = boundedString(songId, 160);
            const songSelections = value[songId];
            if (!safeSongId || !songSelections || typeof songSelections !== "object" || Array.isArray(songSelections)) return;
            const safeSelections = {};
            Object.keys(songSelections).slice(0, MAX_SHAPE_SELECTIONS_PER_SONG).forEach(function(symbol) {
                const safeSymbol = boundedString(symbol, 40);
                const safeVoicing = boundedString(songSelections[symbol], 200);
                if (safeSymbol && safeVoicing) safeSelections[safeSymbol] = safeVoicing;
            });
            if (Object.keys(safeSelections).length) selections[safeSongId] = safeSelections;
        });
        return selections;
    }

    function sanitizePreferences(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) return {};
        const preferences = {};
        if (Object.prototype.hasOwnProperty.call(value, "chartZoom")) {
            preferences.chartZoom = normalizeStoredChartZoom(value.chartZoom);
        }
        if (Object.prototype.hasOwnProperty.call(value, "lineSpacing")) {
            preferences.lineSpacing = normalizeStoredLineSpacing(value.lineSpacing);
        }
        if (["original", "balanced", "beginner", "roman", "nashville"].includes(value.viewMode)) {
            preferences.viewMode = value.viewMode;
        }
        if (typeof value.chordHints === "boolean") preferences.chordHints = value.chordHints;
        const lastSongId = boundedString(value.lastSongId, 160);
        if (lastSongId && /^song-[a-z0-9-]+$/i.test(lastSongId)) preferences.lastSongId = lastSongId;
        const multiplier = Number(value.scrollSpeedMultiplier);
        if (Number.isFinite(multiplier)) preferences.scrollSpeedMultiplier = Math.max(0.5, Math.min(2, multiplier));
        const legacyFontScale = Number(value.fontScale);
        if (Number.isFinite(legacyFontScale)) preferences.fontScale = Math.max(0.5, Math.min(1.5, legacyFontScale));
        const legacyScrollSpeed = Number(value.scrollSpeed);
        if (Number.isFinite(legacyScrollSpeed)) preferences.scrollSpeed = Math.max(1, Math.min(200, legacyScrollSpeed));
        if (Object.prototype.hasOwnProperty.call(value, "songShapeSelections")) {
            preferences.songShapeSelections = sanitizeShapeSelections(value.songShapeSelections);
        }
        return preferences;
    }

    function readPreferences() {
        try {
            const raw = localStorage.getItem(PREFERENCES_KEY) || "{}";
            if (raw.length > MAX_PREFERENCES_BYTES) return {};
            return sanitizePreferences(JSON.parse(raw));
        } catch (error) {
            return {};
        }
    }

    function writePreferences(preferences) {
        try {
            localStorage.setItem(PREFERENCES_KEY, JSON.stringify(sanitizePreferences(preferences)));
            return true;
        } catch (error) {
            return false;
        }
    }

    function normalizeStoredInteger(value, bounds) {
        const numeric = Number(value);
        return Number.isInteger(numeric) && numeric >= bounds.min && numeric <= bounds.max
            ? numeric
            : bounds.default;
    }

    function commitBoundedInteger(value, lastValid, bounds) {
        const fallback = normalizeStoredInteger(lastValid, bounds);
        if (typeof value === "string" && value.trim() === "") return fallback;
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return fallback;
        return Math.max(bounds.min, Math.min(bounds.max, Math.round(numeric)));
    }

    function normalizeStoredChartZoom(value) {
        return normalizeStoredInteger(value, CHART_ZOOM);
    }

    function commitChartZoom(value, lastValid) {
        return commitBoundedInteger(value, lastValid, CHART_ZOOM);
    }

    function stepChartZoom(value, delta) {
        const current = normalizeStoredChartZoom(value);
        return commitChartZoom(current + delta, current);
    }

    function normalizeStoredLineSpacing(value) {
        return normalizeStoredInteger(value, LINE_SPACING);
    }

    function commitLineSpacing(value, lastValid) {
        return commitBoundedInteger(value, lastValid, LINE_SPACING);
    }

    function stepLineSpacing(value, delta) {
        const current = normalizeStoredLineSpacing(value);
        return commitLineSpacing(current + delta, current);
    }

    function filterValidSongs(records, validator) {
        const songs = [];
        let skippedCount = 0;
        (Array.isArray(records) ? records : []).forEach(function(record) {
            if (songs.length >= MAX_STORED_RECORDS) {
                skippedCount += 1;
                return;
            }
            try {
                songs.push(validator(record));
            } catch (error) {
                skippedCount += 1;
            }
        });
        return { songs, skippedCount };
    }

    return {
        DB_NAME,
        DB_VERSION,
        STORE_NAME,
        PREFERENCES_KEY,
        MAX_PREFERENCES_BYTES,
        MAX_STORED_RECORDS,
        CHART_ZOOM,
        LINE_SPACING,
        StorageUnavailableError,
        openDatabase,
        list,
        get,
        put,
        remove,
        replaceAll,
        readPreferences,
        writePreferences,
        sanitizePreferences,
        filterValidSongs,
        normalizeStoredChartZoom,
        commitChartZoom,
        stepChartZoom,
        normalizeStoredLineSpacing,
        commitLineSpacing,
        stepLineSpacing
    };
});
