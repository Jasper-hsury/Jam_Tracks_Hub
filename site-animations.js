(function() {
    const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
    const reduceMotion = window.matchMedia(MOTION_QUERY).matches;
    const hasGsap = Boolean(window.gsap);
    const hasScrollTrigger = Boolean(window.ScrollTrigger);

    if (reduceMotion) {
        document.documentElement.classList.add("motion-reduced");
        return;
    }

    function ready(callback) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", callback);
        } else {
            callback();
        }
    }

    function elements(selector, root = document) {
        return Array.from(root.querySelectorAll(selector));
    }

    function applyCssEntrance(targets) {
        targets.forEach((target, index) => {
            target.classList.add("motion-reveal");
            target.style.setProperty("--motion-delay", `${Math.min(index * 55, 360)}ms`);
            window.requestAnimationFrame(() => target.classList.add("is-visible"));
        });
        document.documentElement.classList.add("animations-ready");
    }

    function animatePageEntrance() {
        const heroPieces = elements([
            ".home-hero .home-eyebrow",
            ".home-hero h1",
            ".home-hero .signature-slogan",
            ".home-hero .home-lead",
            ".page-heading-row",
            ".dictionary-heading",
            ".trainer-heading",
            ".scale-heading",
            ".key-finder-panel > .key-finder-copy",
            ".key-finder-status-row"
        ].join(", "));

        if (!hasGsap) {
            applyCssEntrance([document.querySelector(".navbar"), ...heroPieces].filter(Boolean));
            return;
        }

        gsap.set(".navbar", { y: -16, opacity: 0 });
        gsap.set(heroPieces, { y: 22, opacity: 0 });

        const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
        timeline
            .to(".navbar", { y: 0, opacity: 1, duration: 0.52 })
            .to(heroPieces, {
                y: 0,
                opacity: 1,
                duration: 0.64,
                stagger: 0.07
            }, "-=0.18")
            .from([
                ".hero-actions > *",
                ".home-metrics > div",
                ".dictionary-root-grid button",
                ".key-button",
                ".track-pill-button"
            ].join(", "), {
                y: 12,
                opacity: 0,
                duration: 0.42,
                stagger: 0.025,
                clearProps: "transform,opacity"
            }, "-=0.24");

        document.documentElement.classList.add("animations-ready");
    }

    function animateScrollReveals() {
        const revealTargets = elements([
            "main > section",
            ".track-controls",
            ".track-result-count",
            ".home-release-card",
            ".start-card",
            ".dictionary-browser",
            ".dictionary-detail",
            ".progression-card",
            ".key-result",
            ".scale-panel",
            ".trainer-card"
        ].join(", "))
            .filter(target => !target.closest(".navbar"));

        if (!hasGsap || !hasScrollTrigger) {
            if (!("IntersectionObserver" in window)) {
                revealTargets.forEach(target => target.classList.add("is-visible"));
                return;
            }

            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) {
                        return;
                    }
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

            revealTargets.forEach((target, index) => {
                target.classList.add("motion-reveal");
                target.style.setProperty("--motion-delay", `${Math.min(index * 36, 280)}ms`);
                observer.observe(target);
            });
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        revealTargets.forEach(target => {
            gsap.from(target, {
                y: 26,
                opacity: 0,
                duration: 0.72,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: target,
                    start: "top 88%",
                    once: true
                }
            });
        });
    }

    function animateInteractiveSurface(target, isEntering) {
        if (!hasGsap || target.matches(":disabled")) {
            return;
        }

        gsap.to(target, {
            y: isEntering ? -3 : 0,
            scale: isEntering ? 1.012 : 1,
            duration: isEntering ? 0.22 : 0.28,
            ease: isEntering ? "power2.out" : "power3.out",
            overwrite: true
        });
    }

    function bindPremiumHover() {
        const selectors = [
            ".start-card",
            ".home-release-card",
            ".track-card",
            ".chord-shape-card",
            ".dictionary-quality-button",
            ".track-pill-button",
            ".primary-button",
            ".secondary-button",
            ".track-primary-action",
            ".track-secondary-action"
        ].join(", ");

        document.addEventListener("pointerenter", event => {
            const target = event.target.closest(selectors);
            if (target) {
                animateInteractiveSurface(target, true);
            }
        }, true);

        document.addEventListener("pointerleave", event => {
            const target = event.target.closest(selectors);
            if (target) {
                animateInteractiveSurface(target, false);
            }
        }, true);
    }

    function animateTrackCards(root = document) {
        if (!hasGsap) {
            applyCssEntrance(elements(".track-card:not(.track-skeleton)", root));
            return;
        }

        const cards = elements(".track-card:not(.track-skeleton)", root);
        if (!cards.length) {
            return;
        }

        gsap.fromTo(cards, {
            y: 16,
            opacity: 0
        }, {
            y: 0,
            opacity: 1,
            duration: 0.44,
            stagger: 0.04,
            ease: "power3.out",
            clearProps: "transform,opacity"
        });
    }

    function observeTrackGrid() {
        const grid = document.getElementById("tracksGrid");
        if (!grid || !window.MutationObserver) {
            return;
        }

        let pending = 0;
        const observer = new MutationObserver(() => {
            window.cancelAnimationFrame(pending);
            pending = window.requestAnimationFrame(() => animateTrackCards(grid));
        });

        observer.observe(grid, { childList: true });
        animateTrackCards(grid);
    }

    function animateKeyFinderResult(root = document) {
        const result = root.querySelector?.("#keyFinderResult") || document.getElementById("keyFinderResult");
        if (!result || result.classList.contains("key-finder-empty")) {
            return;
        }

        const pieces = elements([
            ".result-title-row",
            ".key-finder-final",
            ".confidence-note",
            ".result-explanation",
            ".result-explanation-card",
            ".key-finder-candidates li",
            ".result-actions > *",
            ".result-evidence-grid > div",
            ".result-ranking-block"
        ].join(", "), result);

        if (!hasGsap) {
            applyCssEntrance(pieces);
            return;
        }

        gsap.fromTo(pieces, {
            y: 18,
            opacity: 0
        }, {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.045,
            ease: "power3.out",
            clearProps: "transform,opacity"
        });

        elements(".confidence-bar span", result).forEach(bar => {
            const width = bar.style.width || getComputedStyle(bar).width;
            gsap.fromTo(bar, { width: "0%" }, {
                width,
                duration: 0.9,
                ease: "power3.out"
            });
        });
    }

    function observeKeyFinderResult() {
        const result = document.getElementById("keyFinderResult");
        if (!result || !window.MutationObserver) {
            return;
        }

        let pending = 0;
        const observer = new MutationObserver(() => {
            window.cancelAnimationFrame(pending);
            pending = window.requestAnimationFrame(() => animateKeyFinderResult(document));
        });

        observer.observe(result, { childList: true, subtree: true });
    }

    function animateChordShapes(root = document) {
        if (!hasGsap) {
            applyCssEntrance(elements(".chord-shape-card", root));
            return;
        }

        const cards = elements(".chord-shape-card", root);
        if (!cards.length) {
            return;
        }

        gsap.fromTo(cards, {
            y: 18,
            opacity: 0
        }, {
            y: 0,
            opacity: 1,
            duration: 0.48,
            stagger: 0.04,
            ease: "power3.out",
            clearProps: "transform,opacity"
        });

        cards.forEach(card => {
            const markers = elements(".diagram-finger, .diagram-string-status.is-open strong", card);
            gsap.fromTo(markers, {
                scale: 0.64,
                opacity: 0
            }, {
                scale: 1,
                opacity: 1,
                duration: 0.38,
                stagger: 0.035,
                ease: "back.out(1.8)",
                clearProps: "transform,opacity"
            });

            const roots = elements(".diagram-finger.is-root, .diagram-string-status.is-root strong", card);
            gsap.fromTo(roots, { scale: 1 }, {
                scale: 1.08,
                duration: 0.28,
                delay: 0.18,
                yoyo: true,
                repeat: 1,
                ease: "power2.inOut",
                clearProps: "transform"
            });
        });
    }

    function observeChordShapes() {
        const grid = document.getElementById("chordShapeGrid");
        if (!grid || !window.MutationObserver) {
            return;
        }

        let pending = 0;
        const observer = new MutationObserver(() => {
            window.cancelAnimationFrame(pending);
            pending = window.requestAnimationFrame(() => animateChordShapes(grid));
        });

        observer.observe(grid, { childList: true });
        animateChordShapes(grid);
    }

    function bindFilterFeedback() {
        if (!hasGsap) {
            return;
        }

        document.addEventListener("click", event => {
            const pill = event.target.closest(".track-pill-button, .dictionary-root-grid button, .dictionary-quality-button");
            if (!pill) {
                return;
            }

            gsap.fromTo(pill, { scale: 0.96 }, {
                scale: 1,
                duration: 0.28,
                ease: "back.out(2.4)",
                clearProps: "transform"
            });
        });
    }

    function bindThemeCrossfade() {
        let lastWashTime = 0;

        function playThemeWash() {
            const now = Date.now();
            if (now - lastWashTime < 180) {
                return;
            }
            lastWashTime = now;

            const overlay = document.createElement("span");
            overlay.className = "theme-transition-wash";
            overlay.setAttribute("aria-hidden", "true");
            document.body.appendChild(overlay);

            if (!hasGsap) {
                overlay.classList.add("is-css-fallback");
                window.setTimeout(() => overlay.remove(), 460);
                return;
            }

            gsap.fromTo(overlay, { opacity: 0 }, {
                opacity: 1,
                duration: 0.16,
                ease: "power1.out",
                yoyo: true,
                repeat: 1,
                onComplete: () => overlay.remove()
            });

            gsap.fromTo("main", { opacity: 0.92 }, {
                opacity: 1,
                duration: 0.36,
                ease: "power2.out",
                clearProps: "opacity"
            });
        }

        window.JasperAnimations = {
            ...(window.JasperAnimations || {}),
            playThemeWash
        };

        let previousTheme = document.documentElement.dataset.theme || "default";
        if (window.MutationObserver) {
            const observer = new MutationObserver(mutations => {
                const changed = mutations.some(mutation => mutation.attributeName === "data-theme");
                const nextTheme = document.documentElement.dataset.theme || "default";
                if (!changed || nextTheme === previousTheme) {
                    return;
                }

                previousTheme = nextTheme;
                playThemeWash();
            });

            observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        }

        window.addEventListener("jasper:theme-change", function(event) {
            previousTheme = event.detail?.theme || document.documentElement.dataset.theme || "default";
            playThemeWash();
        });
    }

    ready(function() {
        animatePageEntrance();
        animateScrollReveals();
        bindPremiumHover();
        observeTrackGrid();
        observeKeyFinderResult();
        observeChordShapes();
        bindFilterFeedback();
        bindThemeCrossfade();
    });
})();
