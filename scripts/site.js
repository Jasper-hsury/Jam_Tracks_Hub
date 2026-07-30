document.addEventListener("DOMContentLoaded", function() {
    const THEME_KEY = "jasperMusicTheme";
    const body = document.body;
    const navbar = document.querySelector(".navbar");
    const navLinks = navbar?.querySelector(".nav-links");
    const main = document.querySelector("main");
    const footerLinks = document.querySelector(".footer .social-links");
    const backToTopButton = document.getElementById("backToTopBtn");

    if (main) {
        if (!main.id) {
            main.id = "main-content";
        }

        const skipLink = document.createElement("a");
        skipLink.className = "skip-link";
        skipLink.href = `#${main.id}`;
        skipLink.textContent = "Skip to main content";
        body.insertBefore(skipLink, body.firstChild);
    }

    if (navbar && navLinks) {
        navbar.setAttribute("aria-label", "Primary navigation");
        navLinks.id = navLinks.id || "primaryNavigation";
        const navDropdowns = Array.from(navLinks.querySelectorAll(".nav-dropdown details"));
        const currentPage = window.location.pathname.split("/").pop() || "index.html";
        const compactToolLinks = [
            {
                href: "key-finder.html",
                label: "Key Finder"
            },
            {
                href: "fretboard-trainer.html",
                label: "Fretboard Trainer"
            }
        ];
        const isCompactToolActive = compactToolLinks.some(link => currentPage === link.href);
        const compactToolsItem = document.createElement("li");
        compactToolsItem.className = "nav-compact-tools-item";
        compactToolsItem.innerHTML = `
            <details class="nav-compact-tools${isCompactToolActive ? " is-active" : ""}">
                <summary>
                    <span>Tools</span>
                </summary>
                <div class="nav-compact-tools-menu">
                    ${compactToolLinks.map(link => `
                        <a href="${link.href}"${currentPage === link.href ? " class=\"active\" aria-current=\"page\"" : ""}>${link.label}</a>
                    `).join("")}
                </div>
            </details>
        `;
        const compactToolsDetails = compactToolsItem.querySelector("details");
        if (compactToolsDetails) {
            navDropdowns.push(compactToolsDetails);
        }
        navLinks.appendChild(compactToolsItem);

        const menuButton = document.createElement("button");
        menuButton.className = "nav-menu-button";
        menuButton.type = "button";
        menuButton.setAttribute("aria-controls", navLinks.id);
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation menu");
        menuButton.innerHTML = `
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
        `;
        navbar.insertBefore(menuButton, navLinks);
        let menuTransitionTimer = null;

        function closeMenu(restoreFocus) {
            window.clearTimeout(menuTransitionTimer);
            navbar.classList.remove("menu-transitioning");
            navbar.classList.remove("menu-open");
            body.classList.remove("nav-drawer-open");
            menuButton.setAttribute("aria-expanded", "false");
            menuButton.setAttribute("aria-label", "Open navigation menu");
            navDropdowns.forEach(dropdown => {
                dropdown.open = false;
            });

            if (restoreFocus) {
                menuButton.focus();
            }
        }

        menuButton.addEventListener("click", function() {
            const isOpen = navbar.classList.toggle("menu-open");
            body.classList.toggle("nav-drawer-open", isOpen);
            navbar.classList.add("menu-transitioning");
            window.clearTimeout(menuTransitionTimer);
            menuTransitionTimer = window.setTimeout(() => {
                navbar.classList.remove("menu-transitioning");
            }, 260);
            menuButton.setAttribute("aria-expanded", String(isOpen));
            menuButton.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
        });

        navLinks.addEventListener("click", function(event) {
            if (event.target.closest("a")) {
                closeMenu(false);
            }
        });

        document.addEventListener("keydown", function(event) {
            if (event.key === "Escape") {
                if (navbar.classList.contains("menu-open")) {
                    closeMenu(true);
                } else {
                    navDropdowns.forEach(dropdown => {
                        dropdown.open = false;
                    });
                }
            }
        });

        document.addEventListener("click", function(event) {
            if (
                navbar.classList.contains("menu-open")
                && !navLinks.contains(event.target)
                && !menuButton.contains(event.target)
            ) {
                closeMenu(false);
            }

            navDropdowns.forEach(dropdown => {
                if (!dropdown.contains(event.target)) {
                    dropdown.open = false;
                }
            });
        });

        window.addEventListener("resize", function() {
            if (window.innerWidth > 1180) {
                closeMenu(false);
            }
        }, { passive: true });
    }

    const themeToggleHost = navLinks || footerLinks;
    if (themeToggleHost) {
        const themeToggle = document.createElement("label");
        themeToggle.className = "theme-toggle";
        themeToggle.innerHTML = `
            <input class="theme-toggle-input" type="checkbox" aria-label="Switch between dark and light theme">
            <span class="theme-toggle-label">Appearance</span>
            <span class="theme-toggle-switch" aria-hidden="true">
                <svg class="theme-toggle-icon" viewBox="0 0 128 128" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                    <path class="theme-toggle-icon-base" d="M77.547 120.684h-5.765l-1.698 3.012a7.477 7.477 0 0 1-6.513 3.804h-.003a7.479 7.479 0 0 1-6.513-3.804l-1.698-3.012h-5.765v-4.06h27.956v4.06z"></path>
                    <path class="theme-toggle-icon-rays" d="M77.547 113.65H49.591v-4.279h27.956v4.279zm0-11.711H49.591v4.279h27.956v-4.279zm38.587-32.576-12.209-3.271.92-3.434 12.209 3.271-.92 3.434zm-104.268 0-.92-3.434 12.209-3.271.92 3.434-12.209 3.271zm92.979-24.913-.92-3.434 12.209-3.272.92 3.434-12.209 3.272zm-81.69 0-12.209-3.272.92-3.434 12.209 3.272-.92 3.434zM94.82 25.247l-2.514-2.514 8.938-8.938 2.514 2.514-8.938 8.938zm-61.64 0-8.937-8.938 2.514-2.514 8.937 8.938-2.514 2.514zm43.358-11.618-3.434-.92L76.376.5l3.434.92-3.272 12.209zm-25.076 0L48.191 1.42 51.625.5l3.272 12.209-3.435.92z"></path>
                    <path class="theme-toggle-icon-bulb" d="M59.802 64.141h7.535v34.934h-7.535V64.141zm3.767-44.754c-18.485-.53-33.631 14.817-33.631 33.824 0 9.781 4.016 18.581 10.431 24.753 5.637 5.423 9.222 13.147 9.222 21.111h7.84V64.141H51.75c-4.44 0-8.051-3.612-8.051-8.051s3.612-8.051 8.051-8.051 8.052 3.612 8.052 8.051v5.681h7.535V56.09c0-4.44 3.612-8.051 8.052-8.051 4.44 0 8.051 3.612 8.051 8.051s-3.612 8.051-8.051 8.051h-5.682v34.934h7.84c0-7.964 3.584-15.688 9.222-21.111C93.184 71.792 97.2 62.992 97.2 53.211c0-19.008-15.146-34.355-33.631-33.824zM51.75 50.408a5.687 5.687 0 0 0-5.681 5.681 5.687 5.687 0 0 0 5.681 5.681h5.682v-5.681a5.688 5.688 0 0 0-5.682-5.681zM75.389 61.77h-5.682v-5.681a5.688 5.688 0 0 1 5.682-5.681 5.687 5.687 0 0 1 5.681 5.681 5.687 5.687 0 0 1-5.681 5.681z"></path>
                </svg>
            </span>
        `;
        const themeInput = themeToggle.querySelector(".theme-toggle-input");

        function updateThemeToggle() {
            const isLight = document.documentElement.dataset.theme === "light";
            themeInput.checked = isLight;
            themeToggle.classList.toggle("is-light-theme", isLight);
            themeInput.setAttribute("aria-label", `Switch to ${isLight ? "dark" : "light"} theme`);
        }

        function setTheme(nextTheme) {
            const previousTheme = document.documentElement.dataset.theme || "default";
            if (nextTheme === previousTheme) {
                updateThemeToggle();
                return;
            }
            document.documentElement.dataset.theme = nextTheme;
            try {
                localStorage.setItem(THEME_KEY, nextTheme);
            } catch (error) {
                // Keep the selected theme for the current page when storage is unavailable.
            }
            updateThemeToggle();
            let themeChangeEvent;
            if (typeof CustomEvent === "function") {
                themeChangeEvent = new CustomEvent("jasper:theme-change", {
                    detail: {
                        previousTheme,
                        theme: nextTheme
                    }
                });
            } else {
                themeChangeEvent = new Event("jasper:theme-change");
                themeChangeEvent.detail = {
                    previousTheme,
                    theme: nextTheme
                };
            }
            window.dispatchEvent(themeChangeEvent);
            window.JasperAnimations?.playThemeWash?.();
        }

        themeInput.addEventListener("change", function() {
            setTheme(themeInput.checked ? "light" : "default");
        });

        updateThemeToggle();
        if (navLinks) {
            const themeItem = document.createElement("li");
            themeItem.className = "nav-theme-item";
            themeToggle.classList.add("nav-theme-toggle");
            themeItem.appendChild(themeToggle);
            navLinks.appendChild(themeItem);
        } else {
            themeToggle.classList.add("footer-theme-toggle");
            footerLinks.appendChild(themeToggle);
        }
    }

    const subscribeForm = document.getElementById("homeSubscribeForm");
    if (subscribeForm) {
        const emailInput = subscribeForm.querySelector("input[type='email']");
        const status = document.getElementById("homeSubscribeStatus");
        const submitButton = subscribeForm.querySelector("button[type='submit']");
        const endpoint = subscribeForm.dataset.subscribeEndpoint || "/api/subscribe";
        const source = subscribeForm.dataset.subscribeSource || "website";

        subscribeForm.addEventListener("submit", async function(event) {
            event.preventDefault();

            if (!emailInput || !emailInput.checkValidity()) {
                emailInput?.reportValidity();
                return;
            }

            const email = emailInput.value.trim().toLowerCase();
            const honeypotInput = subscribeForm.querySelector("input[name='website']");

            if (status) {
                status.textContent = "Saving your email...";
            }
            if (submitButton) {
                submitButton.disabled = true;
            }

            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email,
                        website: honeypotInput?.value || "",
                        source,
                        page: window.location.pathname || "/"
                    })
                });
                const payload = await response.json().catch(function() {
                    return {};
                });

                if (!response.ok || !payload.ok) {
                    throw new Error(payload.message || "Subscription request failed.");
                }

                if (status) {
                    status.textContent = payload.status === "already_subscribed"
                        ? "You're already on the list."
                        : "You're on the list. Thank you!";
                }
                emailInput.value = "";
            } catch (error) {
                console.error("Subscribe request failed", error);
                if (status) {
                    status.textContent = "Subscription is not available yet. Please try again later.";
                }
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                }
            }
        });
    }

    if (backToTopButton) {
        let backToTopFrame = 0;

        function updateBackToTopButton() {
            const isVisible = window.scrollY > 300;
            backToTopButton.style.display = isVisible ? "grid" : "none";
        }

        function easeInOutCubic(progress) {
            return progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        }

        function scrollBackToTop() {
            window.cancelAnimationFrame(backToTopFrame);

            const startY = window.scrollY;
            if (startY <= 0) {
                return;
            }

            const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (reduceMotion) {
                window.scrollTo(0, 0);
                return;
            }

            const duration = 1150;
            const startTime = window.performance.now();
            const root = document.documentElement;
            const previousScrollBehavior = root.style.scrollBehavior;
            root.style.scrollBehavior = "auto";

            function step(now) {
                const progress = Math.min((now - startTime) / duration, 1);
                const easedProgress = easeInOutCubic(progress);
                window.scrollTo(0, Math.round(startY * (1 - easedProgress)));

                if (progress < 1) {
                    backToTopFrame = window.requestAnimationFrame(step);
                } else {
                    root.style.scrollBehavior = previousScrollBehavior;
                }
            }

            backToTopFrame = window.requestAnimationFrame(step);
        }

        backToTopButton.addEventListener("click", function() {
            scrollBackToTop();
        });

        window.addEventListener("scroll", updateBackToTopButton, { passive: true });
        updateBackToTopButton();
    }
});
