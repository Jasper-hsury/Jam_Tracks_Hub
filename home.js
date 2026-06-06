document.addEventListener("DOMContentLoaded", function() {
    const listenNowButton = document.getElementById("listenNowBtn");
    const pianoAudio = document.getElementById("pianoAudio");
    const pianoSection = document.getElementById("piano-track");

    if (!listenNowButton || !pianoAudio || !pianoSection) {
        return;
    }

    listenNowButton.addEventListener("click", function(event) {
        event.preventDefault();

        pianoSection.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        pianoAudio.currentTime = 6;
        pianoAudio.play().catch(function(error) {
            console.log("Audio playback failed:", error);
        });
    });
});
