function csvEscape(value) {
    const text = String(value ?? "");
    if (!/[",\n\r]/.test(text)) {
        return text;
    }

    return `"${text.replace(/"/g, '""')}"`;
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

function unauthorizedResponse() {
    return new Response("Unauthorized\n", {
        status: 401,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store"
        }
    });
}

export async function onRequestGet(context) {
    const database = context.env.SUBSCRIBERS_DB;
    const adminToken = context.env.SUBSCRIBERS_ADMIN_TOKEN;

    if (!database || !adminToken) {
        return new Response("Subscriber export is not configured.\n", {
            status: 500,
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-store"
            }
        });
    }

    const url = new URL(context.request.url);
    const queryToken = url.searchParams.get("token");
    const authHeader = context.request.headers.get("Authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (queryToken !== adminToken && bearerToken !== adminToken) {
        return unauthorizedResponse();
    }

    await ensureSubscribersTable(database);
    const result = await database.prepare(`
        SELECT email, subscribed_at, source, page
        FROM subscribers
        ORDER BY subscribed_at DESC
    `).all();

    const rows = result.results || [];
    const header = ["email", "subscribed_at", "source", "page"];
    const csv = [
        header.join(","),
        ...rows.map((row) => header.map((field) => csvEscape(row[field])).join(","))
    ].join("\n");

    return new Response(`${csv}\n`, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=\"jam-tracks-hub-subscribers.csv\"",
            "Cache-Control": "no-store"
        }
    });
}
