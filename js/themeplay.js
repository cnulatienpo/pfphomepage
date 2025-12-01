import { ThemePlayGoals } from "./themeplay-goals.js";

export const THEMEPLAY_PROGRESS_KEY = "themeplay-progress";

const actionGoalMap = new Map();
ThemePlayGoals.forEach((goal) => {
  if (goal.action) {
    actionGoalMap.set(goal.action, goal.id);
  }
});

function emptyProgress() {
  const base = {};
  ThemePlayGoals.forEach((goal) => {
    base[goal.id] = false;
  });
  return base;
}

function loadProgress() {
  try {
    const stored = localStorage.getItem(THEMEPLAY_PROGRESS_KEY);
    if (!stored) return emptyProgress();
    const parsed = JSON.parse(stored);
    return { ...emptyProgress(), ...parsed };
  } catch (error) {
    console.warn("ThemePlay progress could not be loaded", error);
    return emptyProgress();
  }
}

function persistProgress(progress) {
  localStorage.setItem(THEMEPLAY_PROGRESS_KEY, JSON.stringify(progress));
}

export function getProgress() {
  return loadProgress();
}

export function completeGoal(goalId) {
  const progress = loadProgress();
  if (!progress[goalId]) {
    progress[goalId] = true;
    persistProgress(progress);
  }
}

export function allGoalsComplete() {
  const progress = loadProgress();
  return ThemePlayGoals.every((goal) => progress[goal.id]);
}

export function resetPlay() {
  const progress = emptyProgress();
  persistProgress(progress);
}

function recordAction(actionId) {
  const goalId = actionGoalMap.get(actionId);
  if (goalId) {
    completeGoal(goalId);
  }
}

export function notifyThemePlayAction(actionId) {
  window.dispatchEvent(
    new CustomEvent("themeplay:action", { detail: actionId, bubbles: false })
  );
}

window.addEventListener("themeplay:action", (event) => {
  const detail = event.detail;
  if (!detail) return;

  if (typeof detail === "string") {
    recordAction(detail);
    return;
  }

  if (detail.action) {
    recordAction(detail.action);
  }
});
