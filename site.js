document.addEventListener("DOMContentLoaded", function() {
    const backToTopButton = document.getElementById("backToTopBtn");

    if (!backToTopButton) {
        return;
    }

    function updateBackToTopButton() {
        const isVisible = window.scrollY > 300;
        backToTopButton.style.display = isVisible ? "grid" : "none";
    }

    backToTopButton.addEventListener("click", function() {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", updateBackToTopButton, { passive: true });
    updateBackToTopButton();
});
