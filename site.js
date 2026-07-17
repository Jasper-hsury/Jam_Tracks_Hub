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
        const themeToggle = document.createElement("button");
        themeToggle.className = "theme-toggle";
        themeToggle.type = "button";

        function updateThemeToggle() {
            const isLight = document.documentElement.dataset.theme === "light";
            themeToggle.innerHTML = `
                <span class="theme-toggle-icon" aria-hidden="true">${isLight ? "☀" : "◐"}</span>
                <span class="theme-toggle-text">${isLight ? "Light" : "Dark"}</span>
            `;
            themeToggle.setAttribute(
                "aria-label",
                `Switch to ${isLight ? "dark" : "light"} theme`
            );
            themeToggle.setAttribute("aria-pressed", String(isLight));
        }

        themeToggle.addEventListener("click", function() {
            const nextTheme = document.documentElement.dataset.theme === "light"
                ? "default"
                : "light";
            document.documentElement.dataset.theme = nextTheme;
            try {
                localStorage.setItem(THEME_KEY, nextTheme);
            } catch (error) {
                // Keep the selected theme for the current page when storage is unavailable.
            }
            updateThemeToggle();
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

    if (backToTopButton) {
        function updateBackToTopButton() {
            const isVisible = window.scrollY > 300;
            backToTopButton.style.display = isVisible ? "grid" : "none";
        }

        backToTopButton.addEventListener("click", function() {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });

        window.addEventListener("scroll", updateBackToTopButton, { passive: true });
        updateBackToTopButton();
    }
});
