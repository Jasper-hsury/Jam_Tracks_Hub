export function createChordDictionaryAudioPlayer({
  createContext = () => {
    const AudioContextConstructor = globalThis.AudioContext || globalThis.webkitAudioContext;
    return new AudioContextConstructor();
  },
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout
} = {}) {
  let audioContext = null;
  let playing = false;
  let completionTimer = 0;
  const activeOscillators = new Set();

  function context() {
    if (!audioContext) audioContext = createContext();
    return audioContext;
  }

  function finish(onStateChange) {
    playing = false;
    completionTimer = 0;
    onStateChange?.(false);
  }

  async function play({ frets, tuningMidi, onStateChange }) {
    if (playing || !Array.isArray(frets) || !frets.some(fret => fret >= 0)) return false;
    const audio = context();
    if (audio.state === "suspended") await audio.resume();
    playing = true;
    onStateChange?.(true);
    const startTime = audio.currentTime + 0.04;
    frets.forEach((fret, stringIndex) => {
      if (fret < 0) return;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const noteStart = startTime + stringIndex * 0.035;
      const midi = tuningMidi[stringIndex] + fret;
      const frequency = 440 * Math.pow(2, (midi - 69) / 12);
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.11, noteStart + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 1.05);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      activeOscillators.add(oscillator);
      oscillator.onended = () => activeOscillators.delete(oscillator);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 1.1);
    });
    completionTimer = setTimeoutFn(() => finish(onStateChange), 1400);
    return true;
  }

  function dispose(onStateChange) {
    if (completionTimer) clearTimeoutFn(completionTimer);
    activeOscillators.forEach(oscillator => {
      try { oscillator.stop(); } catch (error) { /* Oscillator may already have ended. */ }
    });
    activeOscillators.clear();
    if (playing) onStateChange?.(false);
    playing = false;
    completionTimer = 0;
  }

  return {
    dispose,
    get isPlaying() { return playing; },
    play
  };
}
