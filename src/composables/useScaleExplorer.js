import { computed, readonly, ref } from "vue";
import {
  buildScaleRenderData,
  noteNamesForRoot,
  parseScaleQuery,
  rangeOptions,
  relatedToolUrls,
  rootName,
  scaleDefinition
} from "../music/scaleExplorer.mjs";

export function useScaleExplorer({ search = globalThis.location?.search || "" } = {}) {
  const initial = parseScaleQuery(search);
  const rootPitch = ref(initial.rootPitch);
  const scaleId = ref(initial.scaleId);
  const neckFrets = ref(initial.neckFrets);
  const fretStart = ref(initial.fretStart);
  const fretEnd = ref(initial.fretEnd);
  const labelMode = ref(initial.labelMode);

  const scale = computed(() => scaleDefinition(scaleId.value));
  const noteNames = computed(() => noteNamesForRoot(rootPitch.value));
  const root = computed(() => rootName(rootPitch.value));
  const intervals = computed(() => scale.value.intervals.map((interval, index) => ({
    interval,
    degree: scale.value.degrees[index],
    note: noteNames.value[(rootPitch.value + interval) % 12],
    tonic: index === 0,
    index
  })));
  const ranges = computed(() => rangeOptions(neckFrets.value));
  const renderData = computed(() => buildScaleRenderData({
    rootPitch: rootPitch.value,
    scaleId: scaleId.value,
    fretStart: fretStart.value,
    fretEnd: fretEnd.value,
    labelMode: labelMode.value
  }));
  const toolUrls = computed(() => relatedToolUrls(rootPitch.value, scaleId.value));

  function setRoot(nextRootPitch) {
    const normalized = Number(nextRootPitch);
    if (Number.isInteger(normalized) && normalized >= 0 && normalized <= 11) {
      rootPitch.value = normalized;
    }
  }

  function setScale(nextScaleId) {
    scaleId.value = scaleDefinition(nextScaleId).id;
  }

  function setNeckFrets(nextFretCount) {
    neckFrets.value = Number(nextFretCount) === 22 ? 22 : 15;
    fretStart.value = 0;
    fretEnd.value = neckFrets.value;
  }

  function setRange(start, end) {
    const match = ranges.value.find(option => option.start === Number(start) && option.end === Number(end));
    if (!match) return;
    fretStart.value = match.start;
    fretEnd.value = match.end;
  }

  function setLabelMode(nextMode) {
    labelMode.value = nextMode === "degree" ? "degree" : "note";
  }

  return {
    fretEnd: readonly(fretEnd),
    fretStart: readonly(fretStart),
    intervals,
    labelMode: readonly(labelMode),
    neckFrets: readonly(neckFrets),
    noteNames,
    ranges,
    renderData,
    root,
    rootPitch: readonly(rootPitch),
    scale,
    scaleId: readonly(scaleId),
    setLabelMode,
    setNeckFrets,
    setRange,
    setRoot,
    setScale,
    toolUrls
  };
}
