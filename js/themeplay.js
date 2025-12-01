import { ThemePlayGoals } from "./themeplay-goals.js";

const STORAGE_KEY = "themeplay-progress-v1";

let state = {
  sessionActive: false,
  goalsCompleted: {} // { [goalId]: true }
};

// Load state from localStorage
function loadStateFromStorage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === "object") {
      state = {
        sessionActive: !!parsed.sessionActive,
        goalsCompleted: parsed.goalsCompleted || {}
      };
    }
  } catch (e) {
    // Ignore storage errors, keep in-memory state
  }
}

// Save state to localStorage
function saveStateToStorage() {
  try {
    const snapshot = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, snapshot);
  } catch (e) {
    // Ignore storage errors
  }
}

// Confirm that a goal id exists in ThemePlayGoals
function ensureGoalId(id) {
  return ThemePlayGoals.some(g => g.id === id);
}

// Public API: initialize ThemePlay
export function initThemePlay() {
  loadStateFromStorage();
}

// Public API: start a play session
export function startPlaySession() {
  state.sessionActive = true;
  saveStateToStorage();
}

// Public API: complete a goal by id
export function completeGoal(goalId) {
  if (!goalId || !ensureGoalId(goalId)) return;
  if (!state.goalsCompleted[goalId]) {
    state.goalsCompleted[goalId] = true;
    saveStateToStorage();
  }
}

// Public API: get current progress (copy)
export function getProgress() {
  return { ...state.goalsCompleted };
}

// Public API: check if all goals are complete
export function allGoalsComplete() {
  if (!Array.isArray(ThemePlayGoals) || ThemePlayGoals.length === 0) return false;
  return ThemePlayGoals.every(goal => state.goalsCompleted[goal.id]);
}

// Public API: reset all progress
export function resetPlay() {
  state.sessionActive = false;
  state.goalsCompleted = {};
  saveStateToStorage();
}

// Optional: mark goals from other parts of the app
// Usage example:
// window.dispatchEvent(new CustomEvent("themeplay:markGoal", { detail: { goalId: "goal-id" } }));
window.addEventListener("themeplay:markGoal", event => {
  if (!event || !event.detail || !event.detail.goalId) return;
  completeGoal(event.detail.goalId);
});

// Optional: hook builder actions if you want automatic goal completion
// Map action strings to goal ids here
const actionToGoalMap = {
  // "drag-element": "goal-drag-one",
  // "change-color": "goal-change-fill"
};

window.addEventListener("themeplay:action", event => {
  if (!event || !event.detail) return;
  const action = event.detail;
  const goalId = actionToGoalMap[action];
  if (goalId) completeGoal(goalId);
});

// Initialize on load
window.addEventListener("DOMContentLoaded", () => {
  initThemePlay();
});
