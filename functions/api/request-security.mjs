export class RequestValidationError extends Error {
    constructor(status, message) {
        super(message);
        this.name = "RequestValidationError";
        this.status = status;
    }
}

function isJsonContentType(value) {
    const mediaType = String(value || "").split(";", 1)[0].trim().toLowerCase();
    return mediaType === "application/json" || mediaType.endsWith("+json");
}

export function assertSameOrigin(request) {
    const origin = request.headers.get("Origin");
    if (!origin) {
        throw new RequestValidationError(403, "Request origin is not allowed.");
    }

    let requestOrigin;
    try {
        requestOrigin = new URL(request.url).origin;
    } catch (error) {
        throw new RequestValidationError(400, "Invalid request URL.");
    }

    if (origin !== requestOrigin) {
        throw new RequestValidationError(403, "Request origin is not allowed.");
    }
}

export function sameOriginCorsHeaders(request) {
    try {
        const origin = request.headers.get("Origin");
        if (origin && origin === new URL(request.url).origin) {
            return {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "600",
                "Vary": "Origin"
            };
        }
    } catch (error) {
        return {};
    }
    return {};
}

export async function readBoundedJson(request, maxBytes) {
    if (!isJsonContentType(request.headers.get("Content-Type"))) {
        throw new RequestValidationError(415, "Content-Type must be application/json.");
    }

    const declaredLength = request.headers.get("Content-Length");
    if (declaredLength !== null) {
        if (!/^\d+$/.test(declaredLength)) {
            throw new RequestValidationError(400, "Invalid Content-Length.");
        }
        if (Number(declaredLength) > maxBytes) {
            throw new RequestValidationError(413, "Request body is too large.");
        }
    }

    if (!request.body) {
        throw new RequestValidationError(400, "Invalid request body.");
    }

    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let receivedBytes = 0;
    let body = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            receivedBytes += value.byteLength;
            if (receivedBytes > maxBytes) {
                await reader.cancel();
                throw new RequestValidationError(413, "Request body is too large.");
            }
            body += decoder.decode(value, { stream: true });
        }
        body += decoder.decode();
    } finally {
        reader.releaseLock();
    }

    let payload;
    try {
        payload = JSON.parse(body);
    } catch (error) {
        throw new RequestValidationError(400, "Invalid request body.");
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new RequestValidationError(400, "Invalid request body.");
    }
    return payload;
}

export async function timingSafeTokenEqual(candidate, expected) {
    const encoder = new TextEncoder();
    const [candidateDigest, expectedDigest] = await Promise.all([
        crypto.subtle.digest("SHA-256", encoder.encode(String(candidate || ""))),
        crypto.subtle.digest("SHA-256", encoder.encode(String(expected || "")))
    ]);
    const candidateBytes = new Uint8Array(candidateDigest);
    const expectedBytes = new Uint8Array(expectedDigest);
    if (typeof crypto.subtle.timingSafeEqual === "function") {
        return crypto.subtle.timingSafeEqual(candidateDigest, expectedDigest) && Boolean(candidate) && Boolean(expected);
    }
    let difference = 0;
    for (let index = 0; index < candidateBytes.length; index += 1) {
        difference |= candidateBytes[index] ^ expectedBytes[index];
    }
    return difference === 0 && Boolean(candidate) && Boolean(expected);
}
