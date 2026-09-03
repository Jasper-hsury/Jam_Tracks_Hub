import { readonly, ref } from "vue";
import { createQuestion, questionKey } from "../music/fretboardTrainer.mjs";

export function useFretboardTrainer({ random = Math.random } = {}) {
  const currentQuestion = ref(null);
  const hasAnswered = ref(false);
  const correctCount = ref(0);
  const totalCount = ref(0);
  const selectedPitch = ref(null);
  const feedbackState = ref("neutral");
  let previousQuestionKey = "";

  function nextQuestion() {
    currentQuestion.value = createQuestion(previousQuestionKey, random);
    previousQuestionKey = questionKey(currentQuestion.value);
    hasAnswered.value = false;
    selectedPitch.value = null;
    feedbackState.value = "neutral";
    return currentQuestion.value;
  }

  function answer(selectedAnswerPitch) {
    if (hasAnswered.value || !currentQuestion.value) return null;

    hasAnswered.value = true;
    selectedPitch.value = selectedAnswerPitch;
    totalCount.value += 1;
    const isCorrect = selectedAnswerPitch === currentQuestion.value.pitch;

    if (isCorrect) correctCount.value += 1;
    feedbackState.value = isCorrect ? "correct" : "wrong";

    return {
      isCorrect,
      question: currentQuestion.value
    };
  }

  function reveal() {
    if (!currentQuestion.value) return null;

    hasAnswered.value = true;
    feedbackState.value = "revealed";
    return currentQuestion.value;
  }

  function reset() {
    correctCount.value = 0;
    totalCount.value = 0;
    return nextQuestion();
  }

  nextQuestion();

  return {
    answer,
    correctCount: readonly(correctCount),
    currentQuestion: readonly(currentQuestion),
    feedbackState: readonly(feedbackState),
    hasAnswered: readonly(hasAnswered),
    nextQuestion,
    reset,
    reveal,
    selectedPitch: readonly(selectedPitch),
    totalCount: readonly(totalCount)
  };
}
