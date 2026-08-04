document.addEventListener("DOMContentLoaded", function() {
    const NOTES = [
        { pitch: 0, label: "C" },
        { pitch: 1, label: "C# / Db" },
        { pitch: 2, label: "D" },
        { pitch: 3, label: "D# / Eb" },
        { pitch: 4, label: "E" },
        { pitch: 5, label: "F" },
        { pitch: 6, label: "F# / Gb" },
        { pitch: 7, label: "G" },
        { pitch: 8, label: "G# / Ab" },
        { pitch: 9, label: "A" },
        { pitch: 10, label: "A# / Bb" },
        { pitch: 11, label: "B" }
    ];

    const STRINGS = [
        { number: 6, name: "Low E", pitch: 4 },
        { number: 5, name: "A", pitch: 9 },
        { number: 4, name: "D", pitch: 2 },
        { number: 3, name: "G", pitch: 7 },
        { number: 2, name: "B", pitch: 11 },
        { number: 1, name: "High E", pitch: 4 }
    ];

    const questionString = document.getElementById("questionString");
    const questionStringName = document.getElementById("questionStringName");
    const questionFret = document.getElementById("questionFret");
    const trainerFeedback = document.getElementById("trainerFeedback");
    const trainerProgress = document.getElementById("trainerProgress");
    const scoreCorrect = document.getElementById("scoreCorrect");
    const scoreTotal = document.getElementById("scoreTotal");
    const noteAnswerGrid = document.getElementById("noteAnswerGrid");
    const revealAnswerButton = document.getElementById("revealAnswerButton");
    const nextQuestionButton = document.getElementById("nextQuestionButton");
    const resetTrainerButton = document.getElementById("resetTrainerButton");

    let currentQuestion = null;
    let previousQuestionKey = "";
    let hasAnswered = false;
    let correctCount = 0;
    let totalCount = 0;

    function noteLabel(pitch) {
        return NOTES.find(note => note.pitch === pitch)?.label || "Unknown";
    }

    function t(key, fallback, variables) {
        return window.JasperI18n?.translate?.(key, fallback, variables) ?? fallback;
    }

    function exactNoteName(pitch) {
        return noteLabel(pitch).split(" / ")[0];
    }

    function questionKey(question) {
        return `${question.string.number}-${question.fret}`;
    }

    function randomQuestion() {
        let question = null;

        do {
            const string = STRINGS[Math.floor(Math.random() * STRINGS.length)];
            const fret = Math.floor(Math.random() * 13);
            question = {
                string,
                fret,
                pitch: (string.pitch + fret) % 12
            };
        } while (questionKey(question) === previousQuestionKey);

        previousQuestionKey = questionKey(question);
        return question;
    }

    function updateScore() {
        scoreCorrect.textContent = String(correctCount);
        scoreTotal.textContent = String(totalCount);
        trainerProgress.textContent = t("pages.fretboardTrainer.answered", "{{count}} answered", { count: totalCount });
    }

    function renderQuestion() {
        currentQuestion = randomQuestion();
        hasAnswered = false;

        questionString.textContent = String(currentQuestion.string.number);
        questionStringName.textContent = `${currentQuestion.string.name} string`;
        questionFret.textContent = String(currentQuestion.fret);
        trainerFeedback.className = "trainer-feedback";
        trainerFeedback.textContent = t("pages.fretboardTrainer.chooseNote", "Choose the note name below.");

        noteAnswerGrid.querySelectorAll("button").forEach(button => {
            button.disabled = false;
            button.classList.remove("is-correct", "is-wrong");
            button.setAttribute("aria-pressed", "false");
        });
    }

    function markAnswer(selectedPitch) {
        if (hasAnswered || !currentQuestion) {
            return;
        }

        hasAnswered = true;
        totalCount += 1;

        const isCorrect = selectedPitch === currentQuestion.pitch;
        if (isCorrect) {
            correctCount += 1;
        }

        noteAnswerGrid.querySelectorAll("button").forEach(button => {
            const buttonPitch = Number(button.dataset.pitch);
            button.disabled = true;
            button.setAttribute("aria-pressed", String(buttonPitch === selectedPitch));

            if (buttonPitch === currentQuestion.pitch) {
                button.classList.add("is-correct");
            } else if (buttonPitch === selectedPitch) {
                button.classList.add("is-wrong");
            }
        });

        trainerFeedback.className = `trainer-feedback ${isCorrect ? "is-correct" : "is-wrong"}`;
        trainerFeedback.textContent = isCorrect
            ? t("pages.fretboardTrainer.correct", "Correct. {{note}} is the note at string {{string}}, fret {{fret}}.", {
                note: exactNoteName(currentQuestion.pitch),
                string: currentQuestion.string.number,
                fret: currentQuestion.fret
            })
            : t("pages.fretboardTrainer.wrong", "Not this time. That note is {{note}}.", {
                note: exactNoteName(currentQuestion.pitch),
                string: currentQuestion.string.number,
                fret: currentQuestion.fret
            });

        updateScore();
    }

    function revealAnswer() {
        if (!currentQuestion) {
            return;
        }

        noteAnswerGrid.querySelectorAll("button").forEach(button => {
            button.disabled = true;
            if (Number(button.dataset.pitch) === currentQuestion.pitch) {
                button.classList.add("is-correct");
            }
        });

        hasAnswered = true;
        trainerFeedback.className = "trainer-feedback is-revealed";
        trainerFeedback.textContent = t("pages.fretboardTrainer.answerDetail", "Answer: {{note}}. String {{string}} starts on {{stringName}}; add {{fret}} semitones.", {
            note: exactNoteName(currentQuestion.pitch),
            string: currentQuestion.string.number,
            stringName: currentQuestion.string.name,
            fret: currentQuestion.fret
        });
    }

    function renderAnswerButtons() {
        noteAnswerGrid.innerHTML = NOTES.map(note => `
            <button type="button" data-pitch="${note.pitch}" aria-pressed="false">${note.label}</button>
        `).join("");
    }

    noteAnswerGrid.addEventListener("click", function(event) {
        const button = event.target.closest("button[data-pitch]");
        if (!button) {
            return;
        }

        markAnswer(Number(button.dataset.pitch));
    });

    revealAnswerButton.addEventListener("click", revealAnswer);
    nextQuestionButton.addEventListener("click", renderQuestion);
    resetTrainerButton.addEventListener("click", function() {
        correctCount = 0;
        totalCount = 0;
        updateScore();
        renderQuestion();
    });

    renderAnswerButtons();
    updateScore();
    renderQuestion();

    window.addEventListener("jasper:language-change", function() {
        updateScore();
        if (!hasAnswered) {
            trainerFeedback.textContent = t("pages.fretboardTrainer.chooseNote", "Choose the note name below.");
        }
    });
});
