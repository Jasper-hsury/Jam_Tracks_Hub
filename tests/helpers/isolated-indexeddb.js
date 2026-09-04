"use strict";

function clone(value) {
    return value === undefined ? undefined : structuredClone(value);
}

function createRequest(executor) {
    const request = { result: undefined, error: null, onsuccess: null, onerror: null };
    queueMicrotask(function() {
        try {
            request.result = executor();
            request.onsuccess?.();
        } catch (error) {
            request.error = error;
            request.onerror?.();
        }
    });
    return request;
}

function createIsolatedIndexedDb(options) {
    const settings = options || {};
    const records = new Map();
    let schemaCreated = false;

    const indexNames = { contains(name) { return name === "updatedAt" && schemaCreated; } };
    const objectStoreNames = { contains(name) { return name === "songs" && schemaCreated; } };

    function store() {
        return {
            indexNames,
            createIndex(name) {
                if (name !== "updatedAt") throw new Error("Unexpected synthetic index.");
                schemaCreated = true;
            },
            getAll(_query, count) {
                return createRequest(function() {
                    return Array.from(records.values()).slice(0, count).map(clone);
                });
            },
            get(id) {
                return createRequest(function() { return clone(records.get(id)); });
            },
            put(record) {
                return createRequest(function() {
                    if (settings.failWrites) throw new Error("Synthetic write failure.");
                    records.set(record.id, clone(record));
                    return record.id;
                });
            },
            delete(id) {
                return createRequest(function() {
                    records.delete(id);
                    return undefined;
                });
            },
            clear() {
                records.clear();
                return createRequest(function() { return undefined; });
            }
        };
    }

    const database = {
        objectStoreNames,
        createObjectStore(name, configuration) {
            if (name !== "songs" || configuration?.keyPath !== "id") {
                throw new Error("Unexpected synthetic object store.");
            }
            schemaCreated = true;
            return store();
        },
        transaction(name, mode) {
            if (settings.failTransactions) throw new Error("Synthetic transaction failure.");
            if (name !== "songs" || !["readonly", "readwrite"].includes(mode)) {
                throw new Error("Unexpected synthetic transaction.");
            }
            const transaction = {
                error: null,
                oncomplete: null,
                onerror: null,
                onabort: null,
                objectStore(requestedName) {
                    if (requestedName !== "songs") throw new Error("Unexpected synthetic object store request.");
                    return store();
                }
            };
            setTimeout(function() { transaction.oncomplete?.(); }, 0);
            return transaction;
        },
        close() {}
    };

    return {
        records,
        open(name, version) {
            const request = {
                result: database,
                error: null,
                transaction: { objectStore() { return store(); } },
                onupgradeneeded: null,
                onsuccess: null,
                onerror: null,
                onblocked: null
            };
            queueMicrotask(function() {
                if (settings.failOpen) {
                    request.error = new Error("Synthetic open failure.");
                    request.onerror?.();
                    return;
                }
                if (name !== "jamtrackshub-song-workspace" || version !== 1) {
                    request.error = new Error("Unexpected synthetic database contract.");
                    request.onerror?.();
                    return;
                }
                if (!schemaCreated) request.onupgradeneeded?.();
                request.onsuccess?.();
            });
            return request;
        }
    };
}

module.exports = { createIsolatedIndexedDb };
