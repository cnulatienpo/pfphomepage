import { ThemePlayGoals } from "./themeplay-goals.js";
import {
  completeGoal,
  getProgress,
  allGoalsComplete,
  resetPlay,
  notifyThemePlayAction,
  THEMEPLAY_PROGRESS_KEY,
} from "./themeplay.js";

const goalListEl = document.getElementById("themeplay-goal-list");
const rewardPanel = document.getElementById("themeplay-reward-panel");
const btnRandomize = document.getElementById("tp-randomize");
const btnPreview = document.getElementById("tp-preview");
const btnHelp = document.getElementById("tp-help");
const btnExport = document.getElementById("tp-export");
const btnReplay = document.getElementById("tp-replay");

function broadcast(eventName, detail) {
  const event = new CustomEvent(eventName, { detail });
  window.dispatchEvent(event);

  if (window.opener && !window.opener.closed) {
    try {
      window.opener.dispatchEvent(new CustomEvent(eventName, { detail }));
    } catch (error) {
      console.warn("ThemePlay broadcast failed", error);
    }
  }
}

function broadcastAction(actionId) {
  notifyThemePlayAction(actionId);
  if (window.opener && !window.opener.closed) {
    try {
      window.opener.dispatchEvent(
        new CustomEvent("themeplay:action", { detail: actionId })
      );
    } catch (error) {
      console.warn("ThemePlay action broadcast failed", error);
    }
  }
}

// Draw all goals
function renderGoals() {
  goalListEl.innerHTML = "";
  const progress = getProgress();

  ThemePlayGoals.forEach((goal) => {
    const div = document.createElement("div");
    div.className = "tp-goal";
    if (progress[goal.id]) div.classList.add("completed");

    const textEl = document.createElement("div");
    textEl.className = "tp-goal-text";
    textEl.textContent = goal.text;

    div.appendChild(textEl);

    div.addEventListener("click", () => {
      completeGoal(goal.id);
      animateGoal(div);
      renderGoals();
      checkFinish();
    });

    goalListEl.appendChild(div);
  });

  checkFinish();
}

function animateGoal(el) {
  el.style.animation = "goalShimmer 0.8s ease";
  setTimeout(() => {
    el.style.animation = "";
  }, 800);
}

function checkFinish() {
  if (allGoalsComplete()) {
    rewardPanel.classList.remove("hidden");
  } else {
    rewardPanel.classList.add("hidden");
  }
}

// Button: Randomize Something
btnRandomize.addEventListener("click", () => {
  broadcast("themeplay:randomize");
});

// Button: Preview Mode
btnPreview.addEventListener("click", () => {
  broadcast("themeplay:preview");
  broadcastAction("preview");
});

// Button: Talk To Llama Rag
btnHelp.addEventListener("click", () => {
  broadcastAction("ask-llama");
  window.open("llama-rag-window.html", "_blank", "width=420,height=600");
});

// Button: Export theme
if (btnExport) {
  btnExport.addEventListener("click", () => {
    broadcast("themeplay:export");
    broadcastAction("export");
  });
}

// Button: Play Again
if (btnReplay) {
  btnReplay.addEventListener("click", () => {
    resetPlay();
    rewardPanel.classList.add("hidden");
    renderGoals();
  });
}

// Sync when another window updates progress
window.addEventListener("storage", (event) => {
  if (event.key === THEMEPLAY_PROGRESS_KEY) {
    renderGoals();
  }
});

// Initialize on load
window.addEventListener("DOMContentLoaded", () => {
  renderGoals();
  broadcastAction("open-themeplay");
});
