import { getLlamaRagResponse } from "./llamaRag.js";
import { notifyThemePlayAction } from "./themeplay.js";

const logEl = document.getElementById("llama-log");
const form = document.getElementById("llama-form");
const input = document.getElementById("llama-input");
const actions = document.getElementById("llama-actions");

const quickPrompts = [
  "How do I drop things?",
  "How should I paint the colors?",
  "How do I preview?",
  "How do I export?",
];

function broadcastAction(actionId) {
  notifyThemePlayAction(actionId);
  if (window.opener && !window.opener.closed) {
    window.opener.dispatchEvent(new CustomEvent("themeplay:action", { detail: actionId }));
  }
}

function appendCard(role, heading, body) {
  const card = document.createElement("div");
  card.className = `llama-card ${role}`;

  const title = document.createElement("h4");
  title.textContent = heading;

  const text = document.createElement("p");
  text.textContent = body;

  card.appendChild(title);
  card.appendChild(text);
  logEl.appendChild(card);
  logEl.scrollTop = logEl.scrollHeight;
}

function answerQuestion(question) {
  if (!question.trim()) return;

  appendCard("you", "You", question.trim());
  const response = getLlamaRagResponse(question);
  appendCard("llama", response.heading, response.body);
  if (response.tip) {
    appendCard("llama", "Tiny tip", response.tip);
  }
  broadcastAction("ask-llama");
}

function initQuickPrompts() {
  quickPrompts.forEach((prompt) => {
    const chip = document.createElement("div");
    chip.className = "llama-chip";
    chip.textContent = prompt;
    chip.addEventListener("click", () => answerQuestion(prompt));
    actions.appendChild(chip);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  answerQuestion(input.value);
  input.value = "";
  input.focus();
});

window.addEventListener("DOMContentLoaded", () => {
  const starter = getLlamaRagResponse("");
  appendCard("llama", starter.heading, starter.body);
  if (starter.tip) {
    appendCard("llama", "Tiny tip", starter.tip);
  }
  initQuickPrompts();
});
