(function() {
    const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
    const reduceMotion = window.matchMedia(MOTION_QUERY).matches;
    const hasGsap = Boolean(window.gsap);
    const hasScrollTrigger = Boolean(window.ScrollTrigger);
    const hasSplitText = Boolean(window.SplitText);
    const hasDrawSvg = Boolean(window.DrawSVGPlugin);
    const hasMotionPath = Boolean(window.MotionPathPlugin);

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
        const isSongWorkspacePage = Boolean(document.querySelector(".song-workspace-page"));
        const homeTitle = document.querySelector(".home-hero h1");
        const homeSlogan = document.querySelector(".home-hero .signature-slogan");
        const shouldSplitHomeHero = Boolean(homeTitle && homeSlogan && hasGsap && hasSplitText);
        const heroPieces = elements([
            ".home-hero .home-eyebrow",
            ".home-hero h1",
            ".home-hero .signature-slogan",
            ".home-hero .home-lead",
            ".home-hero .hero-actions > *",
            ".page-heading-row",
            ".dictionary-heading",
            ".trainer-heading",
            ".scale-page-heading",
            ".tracks-page > h1",
            ".tracks-page > .hero-tagline",
            ".key-finder-panel > .key-finder-copy",
            ".key-finder-status-row",
            ".song-workspace-hero > .result-kicker",
            ".song-workspace-hero > h1",
            ".song-workspace-hero > .signature-slogan",
            ".song-workspace-hero > .song-workspace-lead",
            ".song-workspace-promises > *",
            ".workspace-create-area > .workspace-section-heading"
        ].join(", "));
        const navPieces = elements(".navbar .logo, .navbar .nav-links > li");
        const heroPiecesForEntrance = (shouldSplitHomeHero
            ? heroPieces.filter(target => target !== homeTitle && target !== homeSlogan)
            : heroPieces)
            .filter(target => !target.closest(".privacy-page"));

        if (!hasGsap) {
            applyCssEntrance([document.querySelector(".navbar"), ...navPieces, ...heroPieces].filter(Boolean));
            return;
        }

        gsap.set(".navbar", { y: -16, opacity: 0 });
        gsap.set(navPieces, { y: -8, opacity: 0 });
        if (heroPiecesForEntrance.length) {
            gsap.set(heroPiecesForEntrance, { y: 22, opacity: 0 });
        }

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

            if (fallbackHeroPieces.length) {
                timeline.to(fallbackHeroPieces, {
                    y: 0,
                    opacity: 1,
                    duration: 0.64,
                    stagger: isTracksPage ? 0.1 : 0.07
                }, "-=0.18");
            }
        }

        const secondaryEntrancePieces = elements([
                ".hero-actions > *",
                ".home-metrics > div",
                ".key-button",
                ".track-pill-button"
            ].join(", "))
            .filter(target => !target.closest(".home-hero"));

        if (secondaryEntrancePieces.length) {
            timeline.from(secondaryEntrancePieces, {
                y: 12,
                opacity: 0,
                duration: 0.42,
                stagger: 0.025,
                clearProps: "transform,opacity"
            }, "-=0.24");
        }

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

        if (isSongWorkspacePage) {
            timeline.from(".workspace-entry-grid > .workspace-entry-card", {
                y: 18,
                opacity: 0,
                duration: 0.48,
                stagger: 0.065,
                ease: "power3.out",
                clearProps: "transform,opacity"
            }, "-=0.34");
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
            .filter(target => !target.closest(".trainer-page"))
            .filter(target => !target.closest(".song-workspace-page"))
            .filter(target => !target.closest(".privacy-page"));

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

    function registerOptionalHomePlugins() {
        if (!hasGsap) {
            return;
        }

        if (hasDrawSvg) {
            gsap.registerPlugin(window.DrawSVGPlugin);
        }

        if (hasMotionPath) {
            gsap.registerPlugin(window.MotionPathPlugin);
        }
    }

    function prepareSvgDrawTarget(target) {
        if (!target || target._drawReady) {
            return target?._drawLength || 0;
        }

        try {
            const length = typeof target.getTotalLength === "function" ? target.getTotalLength() : 0;
            target._drawLength = length;
            target._drawReady = true;
            if (length > 0 && !hasDrawSvg) {
                target.style.strokeDasharray = length;
                target.style.strokeDashoffset = length;
            }
            return length;
        } catch (error) {
            target._drawLength = 0;
            target._drawReady = true;
            return 0;
        }
    }

    function getMotionPathElement(dot) {
        if (!dot || dot._homeMotionPath) {
            return dot?._homeMotionPath || null;
        }

        const pathData = dot.dataset.motionPath;
        const svg = dot.ownerSVGElement;
        if (!pathData || !svg) {
            return null;
        }

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "none");
        path.setAttribute("aria-hidden", "true");
        path.style.pointerEvents = "none";
        svg.appendChild(path);
        dot._homeMotionPath = path;
        return path;
    }

    function placeDotOnPath(dot, progress) {
        const path = getMotionPathElement(dot);
        if (!dot || !path || typeof path.getTotalLength !== "function") {
            return;
        }

        try {
            const length = path.getTotalLength();
            const point = path.getPointAtLength(Math.max(0, Math.min(1, progress)) * length);
            dot.setAttribute("cx", point.x);
            dot.setAttribute("cy", point.y);
        } catch (error) {
            // SVG path support can vary in older embedded browsers; skipping is safer than breaking the page.
        }
    }

    function animateSvgMotionDot(dot, timeline, position, options = {}) {
        if (!dot || !timeline) {
            return;
        }

        const path = getMotionPathElement(dot);
        const pathData = dot.dataset.motionPath;
        if (!path || !pathData) {
            return;
        }

        placeDotOnPath(dot, options.reverse ? 1 : 0);

        if (hasMotionPath) {
            timeline.to(dot, {
                motionPath: {
                    path: pathData,
                    alignOrigin: [0.5, 0.5],
                    autoRotate: false
                },
                duration: options.duration || 1,
                ease: options.ease || "power1.inOut"
            }, position);
            return;
        }

        const proxy = { progress: options.reverse ? 1 : 0 };
        timeline.to(proxy, {
            progress: options.reverse ? 0 : 1,
            duration: options.duration || 1,
            ease: options.ease || "power1.inOut",
            onUpdate: () => placeDotOnPath(dot, proxy.progress)
        }, position);
    }

    function offsetTimelinePosition(position, offset) {
        if (typeof position === "number") {
            return position + offset;
        }

        return `${position}+=${offset}`;
    }

    function getHomeStepSvgEffect(card, options = {}) {
        const motion = card?.dataset.motion || "groove";
        const effects = {
            groove: {
                drawDuration: 0.54,
                drawStagger: 0.035,
                drawEase: "sine.out",
                noteFrom: { y: 7, scale: 0.9, opacity: 0 },
                noteTo: { y: 0, scale: 1, opacity: 1 },
                noteDelay: 0.08,
                noteDuration: 0.34,
                noteStagger: 0.035,
                noteEase: "back.out(1.45)",
                motionDelay: 0.12,
                dotStagger: 0.07,
                motionDuration: 0.58,
                motionEase: "sine.inOut"
            },
            flip: {
                drawDuration: 0.66,
                drawStagger: 0.065,
                drawEase: "power3.out",
                noteFrom: { rotationY: -76, scale: 0.88, opacity: 0 },
                noteTo: { rotationY: 0, scale: 1, opacity: 1 },
                noteDelay: 0.18,
                noteDuration: 0.44,
                noteStagger: { each: 0.05, from: "edges" },
                noteEase: "power3.out",
                motionDelay: 0.2,
                dotStagger: 0.09,
                motionDuration: 0.76,
                motionEase: "power2.inOut"
            },
            map: {
                drawDuration: 0.82,
                drawStagger: 0.028,
                drawEase: "power1.inOut",
                noteFrom: { x: -8, y: 8, scale: 0.86, opacity: 0 },
                noteTo: { x: 0, y: 0, scale: 1, opacity: 1 },
                noteDelay: 0.12,
                noteDuration: 0.38,
                noteStagger: { each: 0.04, from: "center" },
                noteEase: "back.out(1.25)",
                motionDelay: 0.08,
                dotStagger: 0.06,
                motionDuration: 0.95,
                motionEase: "power1.inOut"
            },
            scan: {
                drawDuration: 0.4,
                drawStagger: 0.02,
                drawEase: "power2.out",
                noteFrom: { y: 10, opacity: 0, filter: "blur(4px)" },
                noteTo: { y: 0, opacity: 1, filter: "blur(0px)" },
                noteDelay: 0.04,
                noteDuration: 0.28,
                noteStagger: 0.026,
                noteEase: "power2.out",
                motionDelay: 0.06,
                dotStagger: 0.045,
                motionDuration: 0.48,
                motionEase: "power2.out"
            },
            cascade: {
                drawDuration: 0.74,
                drawStagger: 0.08,
                drawEase: "expo.out",
                noteFrom: { y: -10, scale: 0.84, opacity: 0 },
                noteTo: { y: 0, scale: 1, opacity: 1 },
                noteDelay: 0.16,
                noteDuration: 0.42,
                noteStagger: 0.08,
                noteEase: "back.out(1.35)",
                motionDelay: 0.18,
                dotStagger: 0.1,
                motionDuration: 1.08,
                motionEase: "none"
            },
            pulse: {
                drawDuration: 0.58,
                drawStagger: 0.04,
                drawEase: "power2.out",
                noteFrom: { scale: 0.55, opacity: 0 },
                noteTo: { scale: 1, opacity: 1 },
                noteDelay: 0.1,
                noteDuration: 0.58,
                noteStagger: { each: 0.045, from: "center" },
                noteEase: "elastic.out(1, 0.62)",
                motionDelay: 0.14,
                dotStagger: 0.07,
                motionDuration: 0.84,
                motionEase: "elastic.out(1, 0.74)"
            }
        };
        const effect = effects[motion] || effects.groove;

        return {
            ...effect,
            ...options,
            drawDuration: options.drawDuration || options.duration || effect.drawDuration,
            motionDuration: options.motionDuration || effect.motionDuration
        };
    }

    function animateHomeStepSvgMotif(card, timeline, position = 0, options = {}) {
        if (!hasGsap || !card || !timeline) {
            return;
        }

        registerOptionalHomePlugins();

        const motif = card.querySelector(".step-motif");
        if (!motif) {
            return;
        }
        const drawTargets = elements(".home-draw", motif);
        const dots = elements(".home-motion-dot", motif);
        const notes = elements(".motif-note, .motif-note-symbol, .motif-roman", motif);
        const effect = getHomeStepSvgEffect(card, options);

        if (drawTargets.length) {
            if (hasDrawSvg) {
                timeline.fromTo(drawTargets, { drawSVG: "0%" }, {
                    drawSVG: "100%",
                    duration: effect.drawDuration,
                    stagger: effect.drawStagger,
                    ease: effect.drawEase
                }, position);
            } else {
                drawTargets.forEach(target => {
                    const length = prepareSvgDrawTarget(target);
                    if (options.replay && length > 0) {
                        target.style.strokeDashoffset = length;
                    }
                });
                timeline.to(drawTargets, {
                    strokeDashoffset: 0,
                    duration: effect.drawDuration,
                    stagger: effect.drawStagger,
                    ease: effect.drawEase
                }, position);
            }
        }

        if (notes.length) {
            timeline.fromTo(notes, effect.noteFrom, {
                ...effect.noteTo,
                duration: effect.noteDuration,
                stagger: effect.noteStagger,
                ease: effect.noteEase,
                clearProps: "transform,opacity,filter"
            }, offsetTimelinePosition(position, effect.noteDelay));
        }

        dots.forEach((dot, dotIndex) => {
            animateSvgMotionDot(dot, timeline, offsetTimelinePosition(position, effect.motionDelay + dotIndex * effect.dotStagger), {
                duration: effect.motionDuration,
                ease: effect.motionEase,
                reverse: options.reverse
            });
        });
    }

    function replayHomeStepSvgMotif(card) {
        if (!hasGsap || !card?.classList.contains("home-step-card")) {
            return;
        }

        const motif = card.querySelector(".step-motif");
        if (!motif) {
            return;
        }

        const timeline = gsap.timeline({ defaults: { overwrite: true } });
        animateHomeStepSvgMotif(card, timeline, 0, {
            drawDuration: 0.42,
            noteDuration: 0.32,
            motionDuration: 0.62,
            replay: true,
            reverse: false
        });
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
            const cardStart = Math.max(0.12, 0.22 + index * 0.055);
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
                }, cardStart)
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
            animateHomeStepSvgMotif(card, timeline, cardStart + 0.14, {
                duration: 0.78,
                motionDuration: 0.95
            });
        });
    }

    function animateHomeStepCardHover(card) {
        if (!hasGsap || !card?.classList.contains("home-step-card")) {
            return;
        }

        const motif = card.querySelector(".step-motif");
        const motion = card.dataset.motion || "groove";

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
            replayHomeStepSvgMotif(card);
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
                end: () => `+=${travelDistance() + window.innerHeight * 0.62}`,
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
        const closestElement = eventTarget => {
            if (eventTarget instanceof Element) {
                return eventTarget.closest(selectors);
            }
            return eventTarget?.parentElement?.closest(selectors) || null;
        };

        document.addEventListener("pointerenter", event => {
            const target = closestElement(event.target);
            if (target) {
                animateInteractiveSurface(target, true);
                animateHomeStepCardHover(target);
            }
        }, true);

        document.addEventListener("pointerleave", event => {
            const target = closestElement(event.target);
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

    let trackCoverParallaxTriggers = [];

    function setupTrackCoverParallax() {
        const cards = elements(".tracks-library-page .track-card:not(.track-skeleton)");
        trackCoverParallaxTriggers.forEach(trigger => trigger?.kill?.());
        trackCoverParallaxTriggers = [];

        if (!cards.length || !hasGsap || !hasScrollTrigger) {
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        cards.forEach(card => {
            gsap.set(card, { "--track-cover-y": "-9px" });
            const tween = gsap.to(card, {
                "--track-cover-y": "11px",
                ease: "none",
                scrollTrigger: {
                    trigger: card,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.65,
                    invalidateOnRefresh: true
                }
            });

            if (tween.scrollTrigger) {
                trackCoverParallaxTriggers.push(tween.scrollTrigger);
            }
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

    function positionTrackWindmill(windmill) {
        windmill.classList.add("is-positioned");
    }

    function setupTrackScrollWindmill() {
        const page = document.querySelector(".tracks-library-page");
        const windmill = document.querySelector(".track-scroll-windmill");
        const rotor = windmill?.querySelector(".track-scroll-five-blade-rotor") || windmill?.querySelector(".track-scroll-windmill-svg");
        const cards = elements(".tracks-library-page .track-card:not(.track-skeleton)");
        if (!page || !windmill || !rotor || !cards.length) {
            return;
        }

        if (nativeTrackWindmillCleanup) {
            nativeTrackWindmillCleanup();
            nativeTrackWindmillCleanup = null;
        }

        if (windmill.parentElement !== document.body) {
            document.body.appendChild(windmill);
        }

        let lastScrollY = window.scrollY;
        let pendingFrame = 0;

        function updatePosition() {
            positionTrackWindmill(windmill);
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
                setupTrackCoverParallax();
                setupTrackScrollWindmill();
            });
        });

        observer.observe(grid, { childList: true });
        animateTrackCards(grid);
        setupTrackCoverParallax();
        setupTrackScrollWindmill();

        window.addEventListener("tracks:rendered", () => {
            window.cancelAnimationFrame(pending);
            pending = window.requestAnimationFrame(() => {
                setupTrackCoverParallax();
                setupTrackScrollWindmill();
                window.ScrollTrigger?.refresh?.();
            });
        });
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

        if (root?.classList?.contains("is-flipping-shapes")) {
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

        cards.forEach((card, cardIndex) => {
            const stringLines = elements(".diagram-string-line", card);
            const fretLines = elements(".diagram-fret-line", card);
            const diagramLabels = elements(".diagram-base-fret, .diagram-string-status.is-muted, .diagram-string-status > span", card);
            const markers = elements(".diagram-finger, .diagram-string-status.is-open strong", card)
                .sort((a, b) => Number(a.dataset.toneOrder || 99) - Number(b.dataset.toneOrder || 99));
            const shapeDelay = Math.min(cardIndex * 0.035, 0.18);
            const diagramTl = gsap.timeline({
                delay: shapeDelay,
                defaults: {
                    ease: "power2.out"
                }
            });

            diagramTl.fromTo(stringLines, {
                scaleY: 0,
                opacity: 0.35,
                transformOrigin: "center top"
            }, {
                scaleY: 1,
                opacity: 1,
                duration: 0.38,
                stagger: 0.018,
                clearProps: "transform,opacity"
            }, 0);

            diagramTl.fromTo(fretLines, {
                scaleX: 0,
                opacity: 0.35,
                transformOrigin: "left center"
            }, {
                scaleX: 1,
                opacity: 1,
                duration: 0.38,
                stagger: 0.018,
                clearProps: "transform,opacity"
            }, 0.04);

            diagramTl.fromTo(diagramLabels, {
                opacity: 0
            }, {
                opacity: 1,
                duration: 0.18,
                stagger: 0.012,
                clearProps: "opacity"
            }, 0.14);

            diagramTl.fromTo(markers, {
                y: 4,
                scale: 0.82,
                opacity: 0.08,
                boxShadow: "0 0 0 0 rgba(45, 123, 118, 0)"
            }, {
                y: 0,
                scale: 1,
                opacity: 1,
                boxShadow: "0 0 0 6px rgba(45, 123, 118, 0)",
                duration: 0.34,
                stagger: 0.055,
                ease: "back.out(1.65)",
                clearProps: "transform,opacity,boxShadow"
            }, 0.2);
        });
    }

    function observeChordShapes() {
        const grid = document.getElementById("chordShapeGrid");
        if (!grid || !window.MutationObserver) {
            return;
        }

        let pending = 0;
        let suppressNextMutationAnimation = false;
        const observer = new MutationObserver(() => {
            if (suppressNextMutationAnimation) {
                suppressNextMutationAnimation = false;
                return;
            }
            window.cancelAnimationFrame(pending);
            pending = window.requestAnimationFrame(() => animateChordShapes(grid));
        });

        observer.observe(grid, { childList: true });
        window.addEventListener("dictionary:shapes-rendered", event => {
            suppressNextMutationAnimation = true;
            animateChordShapes(event.detail?.root || grid);
        });
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
        const pageEntranceNeedsTranslations = Boolean(
            document.querySelector(".home-hero, .song-workspace-hero") &&
            window.JasperI18n &&
            document.documentElement.dataset.i18nReady !== "true"
        );
        if (pageEntranceNeedsTranslations) {
            window.addEventListener("jasper:language-change", animatePageEntrance, { once: true });
        } else {
            animatePageEntrance();
        }
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
