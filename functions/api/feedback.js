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
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400"
        }
    });
}

export async function onRequestPost(context) {
    const database = context.env.SUBSCRIBERS_DB;

    if (!database) {
        return jsonResponse({
            ok: false,
            message: "Feedback database is not configured."
        }, 500);
    }

    let payload;
    try {
        payload = await context.request.json();
    } catch (error) {
        return jsonResponse({
            ok: false,
            message: "Invalid request body."
        }, 400);
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
