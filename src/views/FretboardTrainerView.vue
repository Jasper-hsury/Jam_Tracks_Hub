<script setup>
import { computed, ref, watch } from "vue";
import { useFretboardTrainer } from "../composables/useFretboardTrainer.js";
import { useSiteLocale } from "../i18n/useSiteLocale.js";
import { exactNoteName, NOTES } from "../music/fretboardTrainer.mjs";
import { pages as englishPages } from "../../locales/en/common.json";
import { pages as traditionalChinesePages } from "../../locales/zh-TW/common.json";

const localeMessages = {
  en: englishPages.fretboardTrainer,
  "zh-TW": traditionalChinesePages.fretboardTrainer
};

const { language } = useSiteLocale();
const messages = computed(() => localeMessages[language.value] || localeMessages.en);
const trainer = useFretboardTrainer();
const feedbackText = ref(messages.value.chooseNote);

const feedbackClass = computed(() => ({
  "is-correct": trainer.feedbackState.value === "correct",
  "is-revealed": trainer.feedbackState.value === "revealed",
  "is-wrong": trainer.feedbackState.value === "wrong"
}));
const progressText = computed(() => formatMessage(messages.value.answered, {
  count: trainer.totalCount.value
}));
const questionStringName = computed(() => `${trainer.currentQuestion.value.string.name} string`);

function formatMessage(template, variables) {
  return String(template).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, function(match, name) {
    return Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : match;
  });
}

function buttonClass(pitch) {
  const correctPitch = trainer.currentQuestion.value.pitch;
  return {
    "is-correct": trainer.hasAnswered.value && pitch === correctPitch,
    "is-wrong": trainer.selectedPitch.value === pitch && pitch !== correctPitch
  };
}

function chooseAnswer(pitch) {
  const result = trainer.answer(pitch);
  if (!result) return;

  const variables = {
    fret: result.question.fret,
    note: exactNoteName(result.question.pitch),
    string: result.question.string.number
  };
  feedbackText.value = formatMessage(
    result.isCorrect ? messages.value.correct : messages.value.wrong,
    variables
  );
}

function revealAnswer() {
  const question = trainer.reveal();
  if (!question) return;

  feedbackText.value = formatMessage(messages.value.answerDetail, {
    fret: question.fret,
    note: exactNoteName(question.pitch),
    string: question.string.number,
    stringName: question.string.name
  });
}

function nextQuestion() {
  trainer.nextQuestion();
  feedbackText.value = messages.value.chooseNote;
}

function resetTrainer() {
  trainer.reset();
  feedbackText.value = messages.value.chooseNote;
}

watch(language, () => {
  if (!trainer.hasAnswered.value) feedbackText.value = messages.value.chooseNote;
});
</script>

<template>
  <main class="tracks-page trainer-page" id="main-content">
    <header class="trainer-heading">
      <p class="home-eyebrow">{{ messages.eyebrow }}</p>
      <h1>{{ messages.title }}</h1>
      <p class="hero-tagline signature-slogan">{{ messages.tagline }}</p>
      <p class="trainer-lead">{{ messages.lead }}</p>
    </header>

    <section class="trainer-workspace" aria-labelledby="trainerQuestionTitle">
      <div class="trainer-card trainer-question-card">
        <div class="trainer-question-topline">
          <p class="trainer-kicker">{{ messages.currentQuestion }}</p>
          <span id="trainerProgress">{{ progressText }}</span>
        </div>
        <h2 id="trainerQuestionTitle">{{ messages.questionTitle }}</h2>
        <div class="trainer-question-display">
          <div>
            <span>{{ messages.string }}</span>
            <strong id="questionString">{{ trainer.currentQuestion.value.string.number }}</strong>
            <small id="questionStringName">{{ questionStringName }}</small>
          </div>
          <div>
            <span>{{ messages.fret }}</span>
            <strong id="questionFret">{{ trainer.currentQuestion.value.fret }}</strong>
            <small id="questionFretHint">{{ messages.standardTuning }}</small>
          </div>
        </div>

        <div
          class="trainer-feedback"
          :class="feedbackClass"
          id="trainerFeedback"
          aria-live="polite"
        >{{ feedbackText }}</div>
      </div>

      <div class="trainer-card trainer-answer-card">
        <div class="trainer-answer-heading">
          <div>
            <p class="trainer-kicker">{{ messages.answer }}</p>
            <h2>{{ messages.pickNote }}</h2>
          </div>
          <div class="trainer-score" :aria-label="messages.currentScore">
            <strong id="scoreCorrect">{{ trainer.correctCount.value }}</strong>
            <span>/</span>
            <strong id="scoreTotal">{{ trainer.totalCount.value }}</strong>
          </div>
        </div>

        <div class="note-answer-grid" id="noteAnswerGrid" :aria-label="messages.chooseNoteName">
          <button
            v-for="note in NOTES"
            :key="note.pitch"
            type="button"
            :data-pitch="note.pitch"
            :class="buttonClass(note.pitch)"
            :disabled="trainer.hasAnswered.value"
            :aria-pressed="String(trainer.selectedPitch.value === note.pitch)"
            @click="chooseAnswer(note.pitch)"
          >{{ note.label }}</button>
        </div>

        <div class="trainer-actions">
          <button class="secondary-button" id="revealAnswerButton" type="button" @click="revealAnswer">{{ messages.reveal }}</button>
          <button class="primary-button" id="nextQuestionButton" type="button" @click="nextQuestion">{{ messages.next }}</button>
          <button class="secondary-button" id="resetTrainerButton" type="button" @click="resetTrainer">{{ messages.reset }}</button>
        </div>
      </div>

      <aside class="trainer-card trainer-reference" aria-labelledby="trainerReferenceTitle">
        <p class="trainer-kicker">{{ messages.reference }}</p>
        <h2 id="trainerReferenceTitle">{{ messages.standardTuningTitle }}</h2>
        <div class="string-reference-grid">
          <span><strong>6</strong> {{ messages.lowE }}</span>
          <span><strong>5</strong> A</span>
          <span><strong>4</strong> D</span>
          <span><strong>3</strong> G</span>
          <span><strong>2</strong> B</span>
          <span><strong>1</strong> {{ messages.highE }}</span>
        </div>
        <p>{{ messages.referenceExample }}</p>
      </aside>
    </section>
  </main>
</template>
