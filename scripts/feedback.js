(function() {
    const form = document.getElementById("feedbackForm");
    if (!form) {
        return;
    }

    const topicInput = form.querySelector("[name='topic']");
    const suggestionInput = form.querySelector("[name='suggestion']");
    const honeypotInput = form.querySelector("[name='website']");
    const submitButton = form.querySelector("button[type='submit']");
    const submitLabel = submitButton?.querySelector("[data-i18n]");
    const status = document.getElementById("feedbackStatus");
    const endpoint = form.dataset.feedbackEndpoint || "/api/feedback";

    function t(key, fallback) {
        return window.JasperI18n?.translate?.(key, fallback) ?? fallback;
    }

    function setStatus(message, tone, key, fallback) {
        if (!status) {
            return;
        }

        status.textContent = message;
        status.dataset.tone = tone || "";
        status.dataset.i18nStatusKey = key || "";
        status.dataset.i18nStatusFallback = fallback || "";
    }

    function setTranslatedStatus(key, fallback, tone) {
        setStatus(t(key, fallback), tone, key, fallback);
    }

    function setSubmitLabel(key, fallback) {
        const label = t(key, fallback);

        if (submitLabel) {
            submitLabel.textContent = label;
        } else if (submitButton) {
            submitButton.textContent = label;
        }
    }

    form.addEventListener("submit", async function(event) {
        event.preventDefault();

        const topic = String(topicInput?.value || "").trim();
        const suggestion = String(suggestionInput?.value || "").trim();

        if (!topic) {
            setTranslatedStatus("pages.feedback.topicRequired", "Please enter a topic.", "error");
            topicInput?.focus();
            return;
        }

        if (!suggestion) {
            setTranslatedStatus("pages.feedback.suggestionRequired", "Please enter your suggestion.", "error");
            suggestionInput?.focus();
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            setSubmitLabel("pages.feedback.sending", "Sending...");
        }
        setTranslatedStatus("pages.feedback.sending", "Sending...", "pending");

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    topic,
                    suggestion,
                    website: honeypotInput?.value || "",
                    page: window.location.pathname || "/feedback.html"
                })
            });

            let payload = {};
            try {
                payload = await response.json();
            } catch (error) {
                payload = {};
            }

            if (!response.ok || payload.ok === false) {
                throw new Error(payload.message || "Feedback failed");
            }

            form.reset();
            setTranslatedStatus("pages.feedback.success", "Thanks. Your feedback was sent.", "success");
        } catch (error) {
            setTranslatedStatus("pages.feedback.error", "Could not send feedback. Please try again.", "error");
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                setSubmitLabel("pages.feedback.submit", "Send Feedback");
            }
        }
    });

    window.addEventListener("jasper:language-change", function() {
        if (!submitButton?.disabled) {
            setSubmitLabel("pages.feedback.submit", "Send Feedback");
        }

        if (status?.dataset.i18nStatusKey) {
            setTranslatedStatus(
                status.dataset.i18nStatusKey,
                status.dataset.i18nStatusFallback || "",
                status.dataset.tone || ""
            );
        }
    });
})();
