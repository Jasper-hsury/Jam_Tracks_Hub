import {
    RequestValidationError,
    assertSameOrigin,
    readBoundedJson,
    sameOriginCorsHeaders
} from "./request-security.mjs";

const MAX_REQUEST_BODY_BYTES = 16 * 1024;
const JSON_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
};

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: JSON_HEADERS
    });
}

async function ensureFeedbackTable(database) {
    await database.prepare(`
        CREATE TABLE IF NOT EXISTS feedback (
            id TEXT PRIMARY KEY,
            topic TEXT NOT NULL,
            suggestion TEXT NOT NULL,
            page TEXT,
            user_agent TEXT,
            created_at TEXT NOT NULL
        )
    `).run();
}

function normalizeField(value, maxLength) {
    return String(value || "").trim().slice(0, maxLength);
}

function createId() {
    return globalThis.crypto.randomUUID();
}

export async function onRequestOptions(context) {
    try {
        assertSameOrigin(context.request);
    } catch (error) {
        return jsonResponse({ ok: false, message: "Request origin is not allowed." }, error.status || 403);
    }
    return new Response(null, {
        status: 204,
        headers: sameOriginCorsHeaders(context.request)
    });
}

export async function onRequestPost(context) {
    const database = context.env.SUBSCRIBERS_DB;

    if (!database) {
        return jsonResponse({
            ok: false,
            message: "Service unavailable."
        }, 503);
    }

    let payload;
    try {
        assertSameOrigin(context.request);
        payload = await readBoundedJson(context.request, MAX_REQUEST_BODY_BYTES);
    } catch (error) {
        return jsonResponse({
            ok: false,
            message: error instanceof RequestValidationError ? error.message : "Invalid request body."
        }, error instanceof RequestValidationError ? error.status : 400);
    }

    const honeypot = normalizeField(payload.website, 120);
    if (honeypot) {
        return jsonResponse({
            ok: true,
            status: "received"
        });
    }

    const topic = normalizeField(payload.topic, 120);
    const suggestion = normalizeField(payload.suggestion, 2400);

    if (!topic) {
        return jsonResponse({
            ok: false,
            message: "Please enter a topic."
        }, 400);
    }

    if (!suggestion) {
        return jsonResponse({
            ok: false,
            message: "Please enter your suggestion."
        }, 400);
    }

    const page = normalizeField(payload.page, 240);
    const userAgent = normalizeField(context.request.headers.get("User-Agent"), 500);
    const createdAt = new Date().toISOString();

    try {
        await ensureFeedbackTable(database);
        await database.prepare(`
            INSERT INTO feedback
                (id, topic, suggestion, page, user_agent, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(createId(), topic, suggestion, page, userAgent, createdAt).run();

        return jsonResponse({
            ok: true,
            status: "received"
        });
    } catch (error) {
        return jsonResponse({
            ok: false,
            message: "Could not save this feedback."
        }, 500);
    }
}

export async function onRequestGet() {
    return jsonResponse({
        ok: false,
        message: "Use POST to send feedback."
    }, 405);
}
