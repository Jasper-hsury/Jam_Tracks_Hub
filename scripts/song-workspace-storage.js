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
    const CHART_ZOOM = Object.freeze({ min: 50, max: 150, step: 10, default: 100 });

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
            const items = await requestResult(store.getAll());
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

    function readPreferences() {
        try {
            const value = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}");
            return value && typeof value === "object" ? value : {};
        } catch (error) {
            return {};
        }
    }

    function writePreferences(preferences) {
        try {
            localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences || {}));
            return true;
        } catch (error) {
            return false;
        }
    }

    function normalizeStoredChartZoom(value) {
        const numeric = Number(value);
        return Number.isInteger(numeric) && numeric >= CHART_ZOOM.min && numeric <= CHART_ZOOM.max
            ? numeric
            : CHART_ZOOM.default;
    }

    function commitChartZoom(value, lastValid) {
        const fallback = normalizeStoredChartZoom(lastValid);
        if (typeof value === "string" && value.trim() === "") return fallback;
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return fallback;
        return Math.max(CHART_ZOOM.min, Math.min(CHART_ZOOM.max, Math.round(numeric)));
    }

    function stepChartZoom(value, delta) {
        const current = normalizeStoredChartZoom(value);
        return commitChartZoom(current + delta, current);
    }

    return {
        DB_NAME,
        DB_VERSION,
        STORE_NAME,
        PREFERENCES_KEY,
        CHART_ZOOM,
        StorageUnavailableError,
        openDatabase,
        list,
        get,
        put,
        remove,
        replaceAll,
        readPreferences,
        writePreferences,
        normalizeStoredChartZoom,
        commitChartZoom,
        stepChartZoom
    };
});
