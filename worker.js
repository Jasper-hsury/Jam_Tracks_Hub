import {
    onRequestGet as onSubscribeGet,
    onRequestOptions as onSubscribeOptions,
    onRequestPost as onSubscribePost
} from "./functions/api/subscribe.js";
import {
    onRequestGet as onFeedbackGet,
    onRequestOptions as onFeedbackOptions,
    onRequestPost as onFeedbackPost
} from "./functions/api/feedback.js";
import {
    onRequestGet as onSubscribersCsvGet
} from "./functions/api/subscribers.csv.js";

function methodNotAllowed() {
    return new Response("Method Not Allowed\n", {
        status: 405,
        headers: {
            "Allow": "GET, POST, OPTIONS",
            "Cache-Control": "no-store",
            "Content-Type": "text/plain; charset=utf-8"
        }
    });
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const context = { request, env, ctx };

        if (url.pathname === "/api/subscribe") {
            if (request.method === "OPTIONS") {
                return onSubscribeOptions(context);
            }
            if (request.method === "POST") {
                return onSubscribePost(context);
            }
            if (request.method === "GET") {
                return onSubscribeGet(context);
            }
            return methodNotAllowed();
        }

        if (url.pathname === "/api/feedback") {
            if (request.method === "OPTIONS") {
                return onFeedbackOptions(context);
            }
            if (request.method === "POST") {
                return onFeedbackPost(context);
            }
            if (request.method === "GET") {
                return onFeedbackGet(context);
            }
            return methodNotAllowed();
        }

        if (url.pathname === "/api/subscribers.csv") {
            if (request.method === "GET") {
                return onSubscribersCsvGet(context);
            }
            return methodNotAllowed();
        }

        return env.ASSETS.fetch(request);
    }
};
