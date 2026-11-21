const squareMissionSize = 3;

export function guidedSquareSize(id, guided) {
  return id === 'square' && guided.observing && guided.squareMission ? squareMissionSize : null;
}

export function visibleExperimentParams(id, page, guided, params) {
  if (page === 'lab') return params;
  if (page !== 'learn' || !guided.observing) return null;
  const n = guidedSquareSize(id, guided);
  return n === null ? params : { ...params, n };
}

export function updateGuidedStudy(study, id, update) {
  const chapter = study.chapters[id] ?? {};
  return { ...study, chapters: {
    ...study.chapters, [id]: { ...chapter, guided: update(chapter.guided ?? {}) },
  } };
}

export function openLessonExperiment(guided, id, preset) {
  const squareMission = id === 'square' && preset.view === 'sum' && Number(preset.params.n) === squareMissionSize;
  const resetSquare = id === 'square' && !squareMission && guided.square;
  return {
    ...guided, observing: true, view: preset.view, proof: preset.proof ?? false, squareMission,
    ...(resetSquare ? { square: editSquareWorkspace(guided.square) } : {}),
  };
}

export function editSquareWorkspace(workspace, patch) {
  return { ...workspace, ...patch, checked: false, correct: false };
}

export function lessonStages(guided, id, expectedReadiness, expectedCheck) {
  return [
    guided.ready === expectedReadiness,
    Boolean(guided.observing && (id !== 'square' || (guided.squareMission && guided.square?.correct))),
    Boolean(guided.worked),
    guided.check === expectedCheck,
    Boolean(guided.reviewed),
  ];
}
