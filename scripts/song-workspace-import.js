(function(root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.JamSongImport = api;
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
    "use strict";

    class SingleSongImportError extends Error {
        constructor() {
            super("JTH_SINGLE_SONG_IMPORT_FAILED");
            this.name = "SingleSongImportError";
        }
    }

    async function importSingleSong(source, options) {
        const settings = options || {};
        const core = settings.core;
        const storage = settings.storage;
        if (!core?.prepareImportedSong || !storage?.put) {
            throw new SingleSongImportError();
        }

        try {
            const song = core.prepareImportedSong(source, settings.now);
            await storage.put(song);
            const existingSongs = Array.isArray(settings.existingSongs) ? settings.existingSongs : [];
            return {
                song,
                songs: [song].concat(existingSongs.filter(function(existing) { return existing.id !== song.id; }))
            };
        } catch (error) {
            throw new SingleSongImportError();
        }
    }

    return {
        SingleSongImportError,
        importSingleSong
    };
});
