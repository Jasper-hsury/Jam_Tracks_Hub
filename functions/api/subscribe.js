const JSON_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: JSON_HEADERS
    });
}

async function ensureSubscribersTable(database) {
    await database.prepare(`
        CREATE TABLE IF NOT EXISTS subscribers (
            email TEXT PRIMARY KEY,
            subscribed_at TEXT NOT NULL,
            source TEXT,
            page TEXT,
            user_agent TEXT
        )
    `).run();
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
            message: "Subscription database is not configured."
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

    const honeypot = String(payload.website || "").trim();
    if (honeypot) {
        return jsonResponse({
            ok: true,
            status: "subscribed"
        });
    }

    const email = String(payload.email || "").trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
        return jsonResponse({
            ok: false,
            message: "Please enter a valid email address."
        }, 400);
    }

    const source = String(payload.source || "website").slice(0, 120);
    const page = String(payload.page || "").slice(0, 240);
    const userAgent = (context.request.headers.get("User-Agent") || "").slice(0, 500);
    const subscribedAt = new Date().toISOString();

    try {
        await ensureSubscribersTable(database);
        const result = await database.prepare(`
            INSERT OR IGNORE INTO subscribers
                (email, subscribed_at, source, page, user_agent)
            VALUES (?, ?, ?, ?, ?)
        `).bind(email, subscribedAt, source, page, userAgent).run();

        const isNewSubscriber = Number(result.meta?.changes || 0) > 0;

        return jsonResponse({
            ok: true,
            status: isNewSubscriber ? "subscribed" : "already_subscribed"
        });
    } catch (error) {
        return jsonResponse({
            ok: false,
            message: "Could not save this subscription."
        }, 500);
    }
}

export async function onRequestGet() {
    return jsonResponse({
        ok: false,
        message: "Use POST to subscribe."
    }, 405);
}
