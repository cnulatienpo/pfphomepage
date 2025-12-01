const goalList = [
  { id: "goal-palette", label: "Pick a color palette.", actions: ["color-change", "palette"] },
  { id: "goal-header", label: "Place a header.", actions: ["drop-header", "place-header"] },
  { id: "goal-three", label: "Place three elements on the page.", actions: ["place-element"] , count:3},
  { id: "goal-background", label: "Try a background.", actions: ["background"] },
  { id: "goal-motion", label: "Try a motion effect.", actions: ["motion-change", "motion-test"] },
  { id: "goal-random", label: "Use one randomizer.", actions: ["randomizer"] },
  { id: "goal-card", label: "Make a card look nice.", actions: ["card-styled"] },
  { id: "goal-title", label: "Add a title.", actions: ["place-title"] },
  { id: "goal-preview", label: "Preview your theme.", actions: ["preview"] },
  { id: "goal-export", label: "Export your theme.", actions: ["export"] }
];

let currentGoal = goalList[0].id;
let completedGoals = new Set();
let playSessionActive = false;
let actionCounts = new Map();
const feedbackLines = ["Nice. Keep going.", "You tried something.", "Next toy unlocked."];

function emit(eventName, detail) {
  document.dispatchEvent(new CustomEvent(eventName, { detail }));
}

function resetCounters() {
  actionCounts = new Map();
}

export function initThemePlay() {
  resetCounters();
  completedGoals = new Set();
  currentGoal = goalList[0].id;
  playSessionActive = false;
  emit("themeplay:init", getProgress());
}

export function startPlaySession() {
  playSessionActive = true;
  emit("themeplay:started", getProgress());
}

export function getCurrentGoal() {
  return currentGoal;
}

export function getProgress() {
  return {
    currentGoal,
    completedGoals: Array.from(completedGoals),
    goals: goalList.map((goal) => ({
      ...goal,
      complete: completedGoals.has(goal.id),
    })),
    playSessionActive,
  };
}

export function completeGoal(goalId) {
  if (!goalId || completedGoals.has(goalId)) return;
  completedGoals.add(goalId);
  currentGoal = goalList.find((goal) => !completedGoals.has(goal.id))?.id || null;
  const feedback = feedbackLines[Math.floor(Math.random() * feedbackLines.length)];
  emit("themeplay:goalComplete", { goalId, feedback, progress: getProgress() });
  if (!currentGoal) {
    emit("themeplay:allComplete", { message: "Ready to Export Your Theme", progress: getProgress() });
  }
}

function maybeCompleteByCount(goal, actionType) {
  if (!goal.count) return false;
  const prev = actionCounts.get(goal.id) || 0;
  const next = prev + 1;
  actionCounts.set(goal.id, next);
  if (next >= goal.count) {
    completeGoal(goal.id);
    return true;
  }
  return false;
}

export function onAction(actionType) {
  if (!playSessionActive) return;
  const matchingGoals = goalList.filter(
    (goal) => !completedGoals.has(goal.id) && goal.actions.includes(actionType)
  );
  matchingGoals.forEach((goal) => {
    if (!goal.count) {
      completeGoal(goal.id);
    } else {
      maybeCompleteByCount(goal, actionType);
    }
  });
}

export function resetPlay() {
  initThemePlay();
  emit("themeplay:reset", getProgress());
}

export function getGoals() {
  return goalList.map((goal) => ({ ...goal, complete: completedGoals.has(goal.id) }));
}
