(function() {
    const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
    const reduceMotion = window.matchMedia(MOTION_QUERY).matches;
    const hasGsap = Boolean(window.gsap);
    const hasScrollTrigger = Boolean(window.ScrollTrigger);
    const hasSplitText = Boolean(window.SplitText);

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

    function createSplitText(target, options) {
        if (!hasGsap || !hasSplitText || !target) {
            return null;
        }

        try {
            gsap.registerPlugin(window.SplitText);
            if (typeof window.SplitText.create === "function") {
                return window.SplitText.create(target, options);
            }
            return new window.SplitText(target, options);
        } catch (error) {
            console.warn("SplitText animation skipped:", error);
            return null;
        }
    }

    function animatePageEntrance() {
        const isTracksPage = Boolean(document.querySelector(".tracks-library-page"));
        const isDictionaryPage = Boolean(document.querySelector(".chord-dictionary-page"));
        const homeTitle = document.querySelector(".home-hero h1");
        const homeSlogan = document.querySelector(".home-hero .signature-slogan");
        const shouldSplitHomeHero = Boolean(homeTitle && homeSlogan && hasGsap && hasSplitText);
        const heroPieces = elements([
            ".home-hero .home-eyebrow",
            ".home-hero h1",
            ".home-hero .signature-slogan",
            ".home-hero .home-lead",
            ".page-heading-row",
            ".dictionary-heading",
            ".trainer-heading",
            ".scale-page-heading",
            ".tracks-page > h1",
            ".tracks-page > .hero-tagline",
            ".key-finder-panel > .key-finder-copy",
            ".key-finder-status-row"
        ].join(", "));
        const navPieces = elements(".navbar .logo, .navbar .nav-links > li");
        const heroPiecesForEntrance = shouldSplitHomeHero
            ? heroPieces.filter(target => target !== homeTitle && target !== homeSlogan)
            : heroPieces;

        if (!hasGsap) {
            applyCssEntrance([document.querySelector(".navbar"), ...navPieces, ...heroPieces].filter(Boolean));
            return;
        }

        gsap.set(".navbar", { y: -16, opacity: 0 });
        gsap.set(navPieces, { y: -8, opacity: 0 });
        gsap.set(heroPiecesForEntrance, { y: 22, opacity: 0 });

        const titleSplit = shouldSplitHomeHero
            ? createSplitText(homeTitle, {
                type: "words,chars",
                wordsClass: "home-split-word",
                charsClass: "home-split-char"
            })
            : null;
        const sloganSplit = shouldSplitHomeHero
            ? createSplitText(homeSlogan, {
                type: "words",
                wordsClass: "home-split-word"
            })
            : null;
        const titleChars = titleSplit?.chars || [];
        const sloganWords = sloganSplit?.words || [];
        const splitReady = shouldSplitHomeHero && titleChars.length && sloganWords.length;

        if (splitReady) {
            gsap.set([homeTitle, homeSlogan], { opacity: 1 });
            gsap.set([...titleChars, ...sloganWords], { opacity: 0 });
        } else if (shouldSplitHomeHero) {
            gsap.set([homeTitle, homeSlogan], { y: 22, opacity: 0 });
        }

        const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
        timeline
            .to(".navbar", { y: 0, opacity: 1, duration: 0.52 })
            .to(navPieces, {
                y: 0,
                opacity: 1,
                duration: 0.38,
                stagger: 0.035,
                clearProps: "transform,opacity"
            }, "-=0.3");

        if (splitReady) {
            const homeEyebrow = heroPiecesForEntrance.filter(target => target.matches(".home-hero .home-eyebrow"));
            const remainingHeroPieces = heroPiecesForEntrance.filter(target => !target.matches(".home-hero .home-eyebrow"));

            timeline
                .to(homeEyebrow, {
                    y: 0,
                    opacity: 1,
                    duration: 0.42,
                    clearProps: "transform,opacity"
                }, "-=0.12")
                .fromTo(titleChars, {
                    yPercent: 112,
                    opacity: 0,
                    rotateX: -24
                }, {
                    yPercent: 0,
                    opacity: 1,
                    rotateX: 0,
                    duration: 0.72,
                    stagger: 0.026,
                    ease: "back.out(1.24)",
                    clearProps: "transform,opacity"
                }, "-=0.08")
                .fromTo(sloganWords, {
                    y: 16,
                    opacity: 0,
                    rotateX: -12
                }, {
                    y: 0,
                    opacity: 1,
                    rotateX: 0,
                    duration: 0.48,
                    stagger: 0.075,
                    ease: "power3.out",
                    clearProps: "transform,opacity"
                }, "-=0.28")
                .to(remainingHeroPieces, {
                    y: 0,
                    opacity: 1,
                    duration: 0.58,
                    stagger: 0.06
                }, "-=0.24");
        } else {
            const fallbackHeroPieces = shouldSplitHomeHero
                ? [...heroPiecesForEntrance, homeTitle, homeSlogan].filter(Boolean)
                : heroPiecesForEntrance;

            timeline.to(fallbackHeroPieces, {
                    y: 0,
                    opacity: 1,
                    duration: 0.64,
                    stagger: isTracksPage ? 0.1 : 0.07
                }, "-=0.18");
        }

        timeline.from([
                ".hero-actions > *",
                ".home-metrics > div",
                ".key-button",
                ".track-pill-button"
            ].join(", "), {
                y: 12,
                opacity: 0,
                duration: 0.42,
                stagger: 0.025,
                clearProps: "transform,opacity"
            }, "-=0.24");

        if (isTracksPage) {
            timeline.from(".tracks-library-page .track-controls", {
                y: 28,
                scale: 0.97,
                opacity: 0,
                duration: 0.62,
                ease: "back.out(1.25)",
                clearProps: "transform,opacity"
            }, "-=0.2");
        }

        if (isDictionaryPage) {
            timeline.from([
                ".dictionary-browser-heading",
                ".dictionary-root-field",
                ".dictionary-category",
                ".dictionary-detail-heading",
                ".dictionary-facts > div",
                ".dictionary-related-actions > *",
                ".dictionary-shape-heading",
                ".dictionary-position-filter"
            ].join(", "), {
                y: 14,
                opacity: 0,
                duration: 0.38,
                stagger: 0.028,
                ease: "power2.out",
                clearProps: "transform,opacity"
            }, "-=0.22");
        }

        document.documentElement.classList.add("animations-ready");
    }

    function animateScrollReveals() {
        const revealTargets = elements([
            "main > section",
            ".track-controls",
            ".track-result-count",
            ".home-release-card",
            ".home-step-rail",
            ".dictionary-browser",
            ".dictionary-detail",
            ".progression-card",
            ".key-result",
            ".scale-panel",
            ".trainer-card"
        ].join(", "))
            .filter(target => !target.closest(".navbar"))
            .filter(target => !target.closest(".trainer-page"));

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

        revealTargets
            .filter(target => !target.closest(".home-about"))
            .forEach(target => {
            gsap.from(target, {
                y: 26,
                opacity: 0,
                duration: 0.72,
                ease: "power3.out",
                clearProps: "transform,opacity",
                scrollTrigger: {
                    trigger: target,
                    start: "top 88%",
                    once: true
                }
            });
        });
    }

    function animateAboutSection() {
        const about = document.querySelector(".home-about");
        if (!about) {
            return;
        }

        const portrait = about.querySelector(".about-portrait");
        const copyPieces = elements(".about-copy .home-eyebrow, .about-copy h2, .about-copy > p:not(.home-eyebrow), .about-links > *", about);

        if (!hasGsap || !hasScrollTrigger) {
            applyCssEntrance([portrait, ...copyPieces].filter(Boolean));
            return;
        }

        const timeline = gsap.timeline({
            defaults: { ease: "power3.out" },
            scrollTrigger: {
                trigger: about,
                start: "top 74%",
                once: true
            }
        });

        timeline
            .from(portrait, {
                x: -26,
                scale: 0.98,
                opacity: 0,
                duration: 0.72,
                clearProps: "transform,opacity"
            })
            .from(copyPieces, {
                y: 20,
                opacity: 0,
                duration: 0.52,
                stagger: 0.07,
                clearProps: "transform,opacity"
            }, "-=0.42");
    }

    function prepareHomeStepCardText(card) {
        if (!card || card._homeStepTextReady) {
            return card?._homeStepText || null;
        }

        const title = card.querySelector("strong");
        if (!title || !hasGsap || !hasSplitText) {
            return null;
        }

        const split = createSplitText(title, {
            type: "words,chars",
            wordsClass: "home-step-word",
            charsClass: "home-step-char"
        });
        const chars = split?.chars || [];
        const words = split?.words || [];
        card._homeStepTextReady = true;
        card._homeStepText = { split, chars, words };
        return card._homeStepText;
    }

    function getHomeStepTextEffect(card) {
        const motion = card.dataset.motion || "groove";
        const effects = {
            groove: {
                from: { yPercent: 92, rotationZ: -7, opacity: 0 },
                to: { yPercent: 0, rotationZ: 0, opacity: 1, ease: "back.out(1.4)", stagger: 0.024 }
            },
            flip: {
                from: { yPercent: 38, rotationX: -78, opacity: 0 },
                to: { yPercent: 0, rotationX: 0, opacity: 1, ease: "power3.out", stagger: 0.018 }
            },
            map: {
                from: { x: -14, y: 6, opacity: 0 },
                to: { x: 0, y: 0, opacity: 1, ease: "power2.out", stagger: { each: 0.018, from: "center" } }
            },
            scan: {
                from: { y: 10, opacity: 0, filter: "blur(5px)" },
                to: { y: 0, opacity: 1, filter: "blur(0px)", ease: "power2.out", stagger: 0.016 }
            },
            cascade: {
                from: { yPercent: 118, skewY: 5, opacity: 0 },
                to: { yPercent: 0, skewY: 0, opacity: 1, ease: "back.out(1.18)", stagger: 0.021 }
            },
            pulse: {
                from: { scale: 0.62, y: 12, opacity: 0 },
                to: { scale: 1, y: 0, opacity: 1, ease: "elastic.out(1, 0.58)", stagger: 0.019 }
            }
        };

        return effects[motion] || effects.groove;
    }

    function animateHomeStepCardText(cards, timeline) {
        if (!hasGsap || !hasSplitText || !timeline) {
            return;
        }

        cards.forEach((card, index) => {
            const text = prepareHomeStepCardText(card);
            if (!text?.chars?.length) {
                return;
            }

            const effect = getHomeStepTextEffect(card);
            const motif = card.querySelector(".step-motif");
            gsap.set(text.chars, {
                opacity: 0,
                transformOrigin: "50% 70%",
                transformPerspective: 900
            });

            timeline
                .fromTo(text.chars, effect.from, {
                    ...effect.to,
                    duration: 0.62,
                    clearProps: "transform,opacity,filter"
                }, Math.max(0.12, 0.22 + index * 0.055))
                .fromTo(motif, {
                    y: 14,
                    scale: 0.88,
                    rotationZ: -4,
                    opacity: 0
                }, {
                    y: 0,
                    scale: 1,
                    rotationZ: 0,
                    opacity: 1,
                    duration: 0.54,
                    ease: "power2.out",
                    clearProps: "transform,opacity"
                }, "<+=0.05");
        });
    }

    function animateHomeStepCardHover(card) {
        if (!hasGsap || !card?.classList.contains("home-step-card")) {
            return;
        }

        const text = prepareHomeStepCardText(card);
        const chars = text?.chars || [];
        const motif = card.querySelector(".step-motif");
        const motion = card.dataset.motion || "groove";

        if (chars.length) {
            const hoverEffects = {
                groove: { y: -3, rotationZ: 2 },
                flip: { rotationX: 13, y: -2 },
                map: { x: 2, y: -2 },
                scan: { y: -2, filter: "blur(0px)" },
                cascade: { y: -3, skewY: -2 },
                pulse: { y: -2, scale: 1.04 }
            };
            const effect = hoverEffects[motion] || hoverEffects.groove;

            gsap.to(chars, {
                ...effect,
                duration: 0.28,
                stagger: { each: 0.012, from: "random" },
                ease: "power2.out",
                yoyo: true,
                repeat: 1,
                overwrite: true,
                clearProps: "transform,filter"
            });
        }

        if (motif) {
            gsap.fromTo(motif, {
                y: 0,
                rotationZ: 0,
                scale: 1
            }, {
                y: -4,
                rotationZ: motion === "flip" ? -3 : 3,
                scale: 1.04,
                duration: 0.36,
                ease: "power2.out",
                yoyo: true,
                repeat: 1,
                overwrite: true,
                clearProps: "transform"
            });
        }
    }

    function animateHomeStepRail() {
        const section = document.querySelector(".home-tools");
        const rail = section?.querySelector(".home-step-rail");
        const track = rail?.querySelector(".home-step-track");
        const cards = track ? elements(".start-card", track) : [];
        if (!section || !rail || !track || !cards.length) {
            return;
        }

        if (!hasGsap || !hasScrollTrigger) {
            cards.forEach((card, index) => {
                card.classList.add("motion-reveal");
                card.style.setProperty("--motion-delay", `${Math.min(index * 80, 280)}ms`);
                window.requestAnimationFrame(() => card.classList.add("is-visible"));
            });
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        cards.forEach(card => prepareHomeStepCardText(card));

        const introTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: section,
                start: "top 82%",
                once: true
            }
        });

        introTimeline.from(cards, {
            y: 18,
            opacity: 0,
            duration: 0.56,
            stagger: 0.08,
            ease: "power3.out",
            clearProps: "transform,opacity"
        });
        animateHomeStepCardText(cards, introTimeline);

        function travelDistance() {
            return Math.max(0, track.scrollWidth - rail.clientWidth);
        }

        if (!travelDistance()) {
            return;
        }

        function resetHomeStepRail() {
            rail.scrollLeft = 0;
            gsap.set(track, { x: 0 });
        }

        resetHomeStepRail();
        rail.classList.add("is-gsap-driven");

        gsap.to(track, {
            x: () => -travelDistance(),
            ease: "none",
            scrollTrigger: {
                trigger: section,
                start: "top 12%",
                end: () => `+=${travelDistance() + window.innerHeight * 0.36}`,
                scrub: 0.7,
                pin: true,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                onLeaveBack: resetHomeStepRail,
                onRefreshInit: resetHomeStepRail,
                onRefresh: self => {
                    if (self.progress <= 0.001) {
                        resetHomeStepRail();
                    }
                },
                onUpdate: self => {
                    if (self.progress <= 0.001 && self.direction < 0) {
                        resetHomeStepRail();
                    }
                }
            }
        });
    }

    function resetInteractiveSurface(target) {
        if (!hasGsap || !target) {
            return;
        }

        target.classList.remove("is-gsap-hovered");

        gsap.to(target, {
            y: 0,
            scale: 1,
            duration: 0.24,
            ease: "power3.out",
            overwrite: true,
            onComplete: () => {
                if (!target.matches(":hover")) {
                    gsap.set(target, { clearProps: "transform" });
                }
            }
        });
    }

    function animateInteractiveSurface(target, isEntering) {
        if (!hasGsap || target.matches(":disabled")) {
            return;
        }

        if (!isEntering) {
            resetInteractiveSurface(target);
            return;
        }

        target.classList.add("is-gsap-hovered");

        gsap.to(target, {
            y: -3,
            scale: 1.012,
            duration: 0.22,
            ease: "power2.out",
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
                animateHomeStepCardHover(target);
            }
        }, true);

        document.addEventListener("pointerleave", event => {
            const target = event.target.closest(selectors);
            if (target) {
                resetInteractiveSurface(target);
            }
        }, true);

        let pendingHoverReset = 0;
        window.addEventListener("scroll", () => {
            window.cancelAnimationFrame(pendingHoverReset);
            pendingHoverReset = window.requestAnimationFrame(() => {
                elements(".is-gsap-hovered").forEach(target => {
                    if (!target.matches(":hover")) {
                        resetInteractiveSurface(target);
                    }
                });
            });
        }, { passive: true });
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
            y: document.querySelector(".tracks-library-page") ? 42 : 16,
            opacity: 0,
            scale: document.querySelector(".tracks-library-page") ? 0.96 : 1,
            rotateX: document.querySelector(".tracks-library-page") ? -5 : 0
        }, {
            y: 0,
            opacity: 1,
            scale: 1,
            rotateX: 0,
            duration: document.querySelector(".tracks-library-page") ? 0.68 : 0.44,
            stagger: document.querySelector(".tracks-library-page") ? 0.075 : 0.04,
            ease: document.querySelector(".tracks-library-page") ? "back.out(1.15)" : "power3.out",
            clearProps: "transform,opacity"
        });
    }

    let nativeTrackWindmillCleanup = null;
    let trackWindmillRotation = 0;

    function setTrackWindmillRotation(rotor, rotation) {
        if (hasGsap) {
            gsap.set(rotor, { rotation, transformOrigin: "50% 50%" });
        } else {
            rotor.style.transformBox = "fill-box";
            rotor.style.transformOrigin = "center";
            rotor.style.transform = `rotate(${rotation.toFixed(2)}deg)`;
        }
    }

    function positionTrackWindmill(windmill, anchorCard) {
        const cardRect = anchorCard.getBoundingClientRect();
        const slidesLink = elements(".track-secondary-actions a", anchorCard)
            .find(link => link.textContent.trim().toLowerCase() === "slides");
        const slidesRect = slidesLink?.getBoundingClientRect();
        const windmillRect = windmill.getBoundingClientRect();
        const windmillSize = windmillRect.width || 88;
        const viewportPadding = 4;

        const maxLeft = window.innerWidth - windmillSize / 2 - viewportPadding;
        const minLeft = Math.min(cardRect.right - windmillSize / 2 - 8, maxLeft);

        let left = slidesRect
            ? slidesRect.right + windmillSize * 1.38
            : cardRect.right + windmillSize * 1.16;
        left = Math.min(maxLeft, left);
        left = Math.max(minLeft, left);

        let top = cardRect.top + cardRect.height * 0.5;
        top = Math.min(window.innerHeight - windmillSize / 2 - viewportPadding, top);
        top = Math.max(92 + windmillSize / 2, top);

        windmill.style.left = `${Math.round(left)}px`;
        windmill.style.top = `${Math.round(top)}px`;
        windmill.classList.add("is-positioned");
    }

    function setupTrackScrollWindmill() {
        const page = document.querySelector(".tracks-library-page");
        const windmill = document.querySelector(".track-scroll-windmill");
        const rotor = windmill?.querySelector(".track-scroll-windmill-svg");
        const cards = elements(".tracks-library-page .track-card:not(.track-skeleton)");
        if (!page || !windmill || !rotor || cards.length < 2) {
            return;
        }

        if (nativeTrackWindmillCleanup) {
            nativeTrackWindmillCleanup();
            nativeTrackWindmillCleanup = null;
        }

        const anchorCard = cards[1];
        if (windmill.parentElement !== document.body) {
            document.body.appendChild(windmill);
        }

        let lastScrollY = window.scrollY;
        let pendingFrame = 0;

        function updatePosition() {
            positionTrackWindmill(windmill, anchorCard);
        }

        function updateRotation() {
            pendingFrame = 0;
            const nextScrollY = window.scrollY;
            const scrollDelta = nextScrollY - lastScrollY;
            lastScrollY = nextScrollY;

            if (scrollDelta !== 0) {
                trackWindmillRotation += scrollDelta * 0.55;
                setTrackWindmillRotation(rotor, trackWindmillRotation);
            }
        }

        function requestRotation() {
            if (pendingFrame) {
                return;
            }
            pendingFrame = window.requestAnimationFrame(updateRotation);
        }

        function handleResize() {
            updatePosition();
            requestRotation();
        }

        updatePosition();
        setTrackWindmillRotation(rotor, trackWindmillRotation);

        window.addEventListener("scroll", requestRotation, { passive: true });
        window.addEventListener("resize", handleResize);

        nativeTrackWindmillCleanup = function() {
            window.removeEventListener("scroll", requestRotation);
            window.removeEventListener("resize", handleResize);
            if (pendingFrame) {
                window.cancelAnimationFrame(pendingFrame);
            }
        };
    }

    function observeTrackGrid() {
        const grid = document.getElementById("tracksGrid");
        if (!grid || !window.MutationObserver) {
            return;
        }

        let pending = 0;
        const observer = new MutationObserver(() => {
            window.cancelAnimationFrame(pending);
            pending = window.requestAnimationFrame(() => {
                if (!grid.classList.contains("is-flipping-tracks")) {
                    animateTrackCards(grid);
                }
                setupTrackScrollWindmill();
            });
        });

        observer.observe(grid, { childList: true });
        animateTrackCards(grid);
        setupTrackScrollWindmill();
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
            y: 14,
            opacity: 0
        }, {
            y: 0,
            opacity: 1,
            duration: 0.42,
            stagger: 0.025,
            ease: "power2.out",
            clearProps: "transform,opacity"
        });

        cards.forEach(card => {
            const markers = elements(".diagram-finger, .diagram-string-status.is-open strong", card);
            gsap.fromTo(markers, {
                y: 4,
                scale: 0.92,
                opacity: 0.12
            }, {
                y: 0,
                scale: 1,
                opacity: 1,
                duration: 0.28,
                stagger: 0.018,
                ease: "power2.out",
                clearProps: "transform,opacity"
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
        animateAboutSection();
        animateHomeStepRail();
        bindPremiumHover();
        observeTrackGrid();
        observeKeyFinderResult();
        observeChordShapes();
        bindFilterFeedback();
        bindThemeCrossfade();
    });
})();
