import { audioSequence } from "../music/scaleExplorer.mjs";

export function createScaleAudioPlayer({
  createContext,
  setTimeoutFn = globalThis.setTimeout?.bind(globalThis),
  clearTimeoutFn = globalThis.clearTimeout?.bind(globalThis)
} = {}) {
  let audioContext = null;
  let isPlaying = false;
  let finishTimer = null;
  const activeOscillators = new Set();

  function getAudioContext() {
    if (!audioContext) {
      const factory = createContext || (() => {
        const AudioContextConstructor = globalThis.AudioContext || globalThis.webkitAudioContext;
        return new AudioContextConstructor();
      });
      audioContext = factory();
    }
    return audioContext;
  }

  async function play({ rootPitch, scaleId, onStateChange = () => {} }) {
    if (isPlaying) return false;

    const context = getAudioContext();
    if (context.state === "suspended") await context.resume();

    isPlaying = true;
    onStateChange(true);
    const sequence = audioSequence(rootPitch, scaleId);
    const startTime = context.currentTime + 0.05;

    sequence.forEach(note => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = startTime + note.offsetSeconds;

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(note.frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.16, noteStart + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.24);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.26);
      activeOscillators.add(oscillator);
      oscillator.onended = () => activeOscillators.delete(oscillator);
    });

    finishTimer = setTimeoutFn(() => {
      isPlaying = false;
      finishTimer = null;
      onStateChange(false);
    }, sequence.length * 280 + 180);
    return true;
  }

  function dispose(onStateChange = () => {}) {
    if (finishTimer !== null) clearTimeoutFn(finishTimer);
    finishTimer = null;
    activeOscillators.forEach(oscillator => {
      try {
        oscillator.stop();
      } catch (error) {
        // An oscillator that already ended needs no further cleanup.
      }
    });
    activeOscillators.clear();
    if (isPlaying) onStateChange(false);
    isPlaying = false;
  }

  return {
    dispose,
    get isPlaying() {
      return isPlaying;
    },
    play
  };
}
