import {
    onRequestOptions as onSubscribeOptions,
    onRequestPost as onSubscribePost
} from "./functions/api/subscribe.js";
import {
    onRequestOptions as onFeedbackOptions,
    onRequestPost as onFeedbackPost
} from "./functions/api/feedback.js";
import {
    onRequestGet as onSubscribersCsvGet
} from "./functions/api/subscribers.csv.js";

const API_SECURITY_HEADERS = {
    "Cache-Control": "no-store",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
};

function withApiSecurityHeaders(response) {
    const headers = new Headers(response.headers);
    Object.entries(API_SECURITY_HEADERS).forEach(function(entry) {
        headers.set(entry[0], entry[1]);
    });
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}

function methodNotAllowed(allowedMethods) {
    return new Response("Method Not Allowed\n", {
        status: 405,
        headers: {
            "Allow": allowedMethods.join(", "),
            "Cache-Control": "no-store",
            "Content-Type": "text/plain; charset=utf-8"
        }
    });
}

function apiNotFound() {
    return new Response(JSON.stringify({ ok: false, message: "API route not found." }), {
        status: 404,
        headers: {
            "Cache-Control": "no-store",
            "Content-Type": "application/json; charset=utf-8"
        }
    });
}

function apiFailure() {
    return new Response(JSON.stringify({ ok: false, message: "Service unavailable." }), {
        status: 503,
        headers: {
            "Cache-Control": "no-store",
            "Content-Type": "application/json; charset=utf-8"
        }
    });
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const context = { request, env, ctx };

        try {
            if (url.pathname === "/api/subscribe") {
                if (request.method === "OPTIONS") {
                    return withApiSecurityHeaders(await onSubscribeOptions(context));
                }
                if (request.method === "POST") {
                    return withApiSecurityHeaders(await onSubscribePost(context));
                }
                return withApiSecurityHeaders(methodNotAllowed(["POST", "OPTIONS"]));
            }

            if (url.pathname === "/api/feedback") {
                if (request.method === "OPTIONS") {
                    return withApiSecurityHeaders(await onFeedbackOptions(context));
                }
                if (request.method === "POST") {
                    return withApiSecurityHeaders(await onFeedbackPost(context));
                }
                return withApiSecurityHeaders(methodNotAllowed(["POST", "OPTIONS"]));
            }

            if (url.pathname === "/api/subscribers.csv") {
                if (request.method === "GET") {
                    return withApiSecurityHeaders(await onSubscribersCsvGet(context));
                }
                return withApiSecurityHeaders(methodNotAllowed(["GET"]));
            }

            if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
                return withApiSecurityHeaders(apiNotFound());
            }

            if (request.method !== "GET" && request.method !== "HEAD") {
                return methodNotAllowed(["GET", "HEAD"]);
            }

            return env.ASSETS.fetch(request);
        } catch (error) {
            return withApiSecurityHeaders(apiFailure());
        }
    }
};
