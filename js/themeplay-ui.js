import {
  initThemePlay,
  startPlaySession,
  getGoals,
  onAction,
  resetPlay,
} from "./themeplay.js";
import { openLlamaRagWindow } from "./llama-rag-ui.js";
import { randomizeColors, randomizeLayout, randomizeMotion } from "./randomizers.js";

let panelRoot = null;
let goalsContainer = null;
let feedbackContainer = null;
let open = false;

function createGoalItem(goal) {
  const item = document.createElement("div");
  item.className = "themeplay-goal";
  item.dataset.goalId = goal.id;
  item.textContent = goal.label;
  if (goal.complete) {
    item.classList.add("is-complete");
  }
  return item;
}

function updateGoals() {
  if (!goalsContainer) return;
  goalsContainer.innerHTML = "";
  getGoals().forEach((goal) => {
    goalsContainer.appendChild(createGoalItem(goal));
  });
}

function sparkle(goalId) {
  const item = goalsContainer?.querySelector(`[data-goal-id="${goalId}"]`);
  if (!item) return;
  item.classList.add("sparkle");
  setTimeout(() => item.classList.remove("sparkle"), 900);
}

function setFeedback(text) {
  if (!feedbackContainer) return;
  feedbackContainer.textContent = text;
  feedbackContainer.classList.add("pop-feedback");
  setTimeout(() => feedbackContainer.classList.remove("pop-feedback"), 500);
}

async function loadPanel() {
  if (panelRoot) return panelRoot;
  const html = await fetch("./themeplay-window.html").then((res) => res.text());
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html.trim();
  panelRoot = wrapper.firstElementChild;
  panelRoot.classList.add("themeplay-overlay", "is-hidden");
  goalsContainer = panelRoot.querySelector(".themeplay-goals");
  feedbackContainer = panelRoot.querySelector(".themeplay-feedback");

  panelRoot.querySelector(".themeplay-close").addEventListener("click", hideThemePlayPanel);
  panelRoot.querySelector(".themeplay-help").addEventListener("click", () => {
    openLlamaRagWindow();
    onAction("help");
  });
  panelRoot.querySelector(".themeplay-randomize").addEventListener("click", () => {
    const randomizer = [randomizeColors, randomizeLayout, randomizeMotion][Math.floor(Math.random() * 3)];
    randomizer(document);
  });
  panelRoot.querySelector(".themeplay-preview").addEventListener("click", () => {
    document.body.classList.toggle("preview-mode");
    onAction("preview");
  });

  updateGoals();
  document.body.appendChild(panelRoot);
  return panelRoot;
}

function showThemePlayPanel() {
  if (!panelRoot) return;
  open = true;
  panelRoot.classList.remove("is-hidden");
  panelRoot.classList.add("is-open");
  startPlaySession();
}

export async function toggleThemePlayPanel() {
  await loadPanel();
  if (open) {
    hideThemePlayPanel();
  } else {
    showThemePlayPanel();
  }
}

export async function attachThemePlayUI() {
  await loadPanel();
}

export function hideThemePlayPanel() {
  if (!panelRoot) return;
  open = false;
  panelRoot.classList.remove("is-open");
  panelRoot.classList.add("is-hidden");
}

function markCompletion(detail) {
  if (!detail?.goalId) return;
  sparkle(detail.goalId);
  setFeedback(detail.feedback);
  updateGoals();
}

function handleAllComplete(detail) {
  const reward = document.createElement("div");
  reward.className = "themeplay-reward";
  reward.innerHTML = `
    <div class="themeplay-reward__title">Your Theme Is Ready</div>
    <div class="themeplay-reward__actions">
      <button class="themeplay-btn reward-export">Make My Theme</button>
      <button class="themeplay-btn reward-preview">Preview Theme</button>
      <button class="themeplay-btn reward-reset">Play Again</button>
    </div>
  `;
  reward.querySelector(".reward-export").addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("ui:exportTheme"));
    onAction("export");
  });
  reward.querySelector(".reward-preview").addEventListener("click", () => {
    document.body.classList.toggle("preview-mode");
    onAction("preview");
  });
  reward.querySelector(".reward-reset").addEventListener("click", () => {
    resetPlay();
    updateGoals();
    reward.remove();
  });
  panelRoot?.appendChild(reward);
  setFeedback(detail?.message || "Ready to Export Your Theme");
}

// Defer initialization until DOM is ready
if (typeof document !== "undefined") {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initThemePlay();
      document.addEventListener("themeplay:goalComplete", (event) => markCompletion(event.detail));
      document.addEventListener("themeplay:allComplete", (event) => handleAllComplete(event.detail));
    });
  } else {
    initThemePlay();
    document.addEventListener("themeplay:goalComplete", (event) => markCompletion(event.detail));
    document.addEventListener("themeplay:allComplete", (event) => handleAllComplete(event.detail));
  }
}
