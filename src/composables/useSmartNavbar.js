import { onBeforeUnmount, onMounted, ref } from "vue";

export function normalizePagePath(pathname) {
  const path = String(pathname || "/")
    .split(/[?#]/, 1)[0]
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.html$/i, "");
  return path || "index";
}

export function useSmartNavbar({ navbar, navLinks, menuButton, spacer }) {
  const menuOpen = ref(false);
  let resizeObserver = null;
  let menuTransitionTimer = 0;
  let scrollFrame = 0;
  let previousScrollY = 0;
  let direction = 0;
  let directionOriginY = 0;
  let keepVisibleUntil = 0;

  function openDetails() {
    return Array.from(navbar.value?.querySelectorAll("details[open]") || []);
  }

  function closeDetails() {
    openDetails().forEach(details => {
      details.open = false;
    });
  }

  function showNavbar() {
    navbar.value?.classList.remove("is-scroll-hidden");
  }

  function holdVisible() {
    keepVisibleUntil = performance.now() + 900;
    showNavbar();
  }

  function syncNavbarHeight() {
    if (!navbar.value || !spacer.value) return;
    const navbarHeight = Math.ceil(navbar.value.getBoundingClientRect().height);
    spacer.value.style.height = `${navbarHeight}px`;
    navbar.value.style.setProperty("--site-navbar-height", `${navbarHeight}px`);
  }

  function toggleMenu() {
    menuOpen.value = !menuOpen.value;
    document.body.classList.toggle("nav-drawer-open", menuOpen.value);
    window.clearTimeout(menuTransitionTimer);
    navbar.value?.classList.add("menu-transitioning");
    menuTransitionTimer = window.setTimeout(function() {
      navbar.value?.classList.remove("menu-transitioning");
    }, 260);
    holdVisible();
    if (!menuOpen.value) closeDetails();
  }

  function closeMenu(restoreFocus = false) {
    window.clearTimeout(menuTransitionTimer);
    navbar.value?.classList.remove("menu-transitioning");
    menuOpen.value = false;
    document.body.classList.remove("nav-drawer-open");
    closeDetails();
    if (restoreFocus) menuButton.value?.focus();
  }

  function handleNavClick(event) {
    if (event.target.closest("a")) closeMenu(false);
  }

  function handleKeydown(event) {
    if (event.key !== "Escape") return;
    if (menuOpen.value) closeMenu(true);
    else closeDetails();
  }

  function handleDocumentClick(event) {
    if (
      menuOpen.value
      && !navLinks.value?.contains(event.target)
      && !menuButton.value?.contains(event.target)
    ) {
      closeMenu(false);
    }

    openDetails().forEach(details => {
      if (!details.contains(event.target)) details.open = false;
    });
  }

  function handleResize() {
    syncNavbarHeight();
    if (window.innerWidth > 1180 && menuOpen.value) closeMenu(false);
  }

  function updateNavbarFromScroll() {
    scrollFrame = 0;
    const currentScrollY = Math.max(0, window.scrollY);
    const delta = currentScrollY - previousScrollY;

    if (delta > 0 && direction !== 1) {
      direction = 1;
      directionOriginY = previousScrollY;
    } else if (delta < 0 && direction !== -1) {
      direction = -1;
      directionOriginY = previousScrollY;
    }

    if (
      currentScrollY <= 8
      || menuOpen.value
      || openDetails().length
      || performance.now() < keepVisibleUntil
    ) {
      showNavbar();
    } else if (direction === -1 && directionOriginY - currentScrollY >= 3) {
      showNavbar();
    } else if (direction === 1 && currentScrollY - directionOriginY >= 14) {
      navbar.value?.classList.add("is-scroll-hidden");
    }

    previousScrollY = currentScrollY;
  }

  function handleScroll() {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateNavbarFromScroll);
  }

  onMounted(function() {
    previousScrollY = Math.max(0, window.scrollY);
    directionOriginY = previousScrollY;
    syncNavbarHeight();

    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(syncNavbarHeight);
      resizeObserver.observe(navbar.value);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("click", handleDocumentClick);
  });

  onBeforeUnmount(function() {
    resizeObserver?.disconnect();
    window.cancelAnimationFrame(scrollFrame);
    window.clearTimeout(menuTransitionTimer);
    window.removeEventListener("scroll", handleScroll);
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("keydown", handleKeydown);
    document.removeEventListener("click", handleDocumentClick);
    document.body.classList.remove("nav-drawer-open");
  });

  return {
    closeMenu,
    handleNavClick,
    holdVisible,
    menuOpen,
    toggleMenu
  };
}
