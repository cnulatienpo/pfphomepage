// ThemePlay game engine: tracks goals, progress, and completion.
// No binaries, no external dependencies.

import { ThemePlayGoals } from "./themeplay-goals.js";

const STORAGE_KEY = "themeplay_progress_v1";

let progress = {};     // { [goalId]: true }
let sessionActive = false;

// Load saved progress from localStorage
function loadProgress() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch (e) {
    console.warn("ThemePlay: failed to load progress", e);
  }
  return {};
}

// Save progress to localStorage
function saveProgress() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn("ThemePlay: failed to save progress", e);
  }
}

// Ensure progress contains only known goals
function normalizeProgress() {
  const normalized = {};
  const validIds = new Set(ThemePlayGoals.map(g => g.id));
  Object.keys(progress).forEach(id => {
    if (validIds.has(id) && progress[id]) normalized[id] = true;
  });
  progress = normalized;
}

// Public API: initialize ThemePlay
export function initThemePlay() {
  progress = loadProgress();
  normalizeProgress();
  sessionActive = true;
}

// Public API: start a play session
export function startPlaySession() {
  if (!sessionActive) initThemePlay();
  sessionActive = true;
}

// Public API: complete a goal by id
export function completeGoal(goalId) {
  if (!goalId) return;

  // Ignore unknown ids silently
  const exists = ThemePlayGoals.some(g => g.id === goalId);
  if (!exists) return;

  if (!progress[goalId]) {
    progress[goalId] = true;
    saveProgress();

    // Fire an event so other parts of the app can react
    window.dispatchEvent(
      new CustomEvent("themeplay:goalCompleted", { detail: { goalId } })
    );

    // If everything is done, fire a completion event
    if (allGoalsComplete()) {
      window.dispatchEvent(new CustomEvent("themeplay:allGoalsComplete"));
    }
  }
}

// Public API: get current progress map (copy)
export function getProgress() {
  return { ...progress };
}

// Public API: check if all goals are complete
export function allGoalsComplete() {
  if (!ThemePlayGoals || ThemePlayGoals.length === 0) return false;
  return ThemePlayGoals.every(goal => progress[goal.id]);
}

// Public API: get the next incomplete goal, or null
export function getCurrentGoal() {
  for (const goal of ThemePlayGoals) {
    if (!progress[goal.id]) return goal;
  }
  return null;
}

// Public API: reset everything
export function resetPlay() {
  progress = {};
  saveProgress();
  sessionActive = false;
  window.dispatchEvent(new CustomEvent("themeplay:reset"));
}

// Optional helper: mark first matching goal by text search
// Useful if you do not want to hardcode ids in some places.
export function completeGoalByTextFragment(fragment) {
  if (!fragment) return;
  const lower = fragment.toLowerCase();
  const match = ThemePlayGoals.find(g =>
    g.text.toLowerCase().includes(lower)
  );
  if (match) completeGoal(match.id);
}

// Auto-init when this module is loaded in a browser context
if (typeof window !== "undefined") {
  initThemePlay();
}
