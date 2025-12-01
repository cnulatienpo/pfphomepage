import { getLlamaRagResponse } from "./llamaRag.js";

let ragContainer = null;
let ragLog = null;
let ragInput = null;
let ragWindow = null;

async function loadTemplate() {
  if (ragContainer) return ragContainer;
  const res = await fetch("./llama-rag-window.html");
  const html = await res.text();
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html.trim();
  ragContainer = wrapper.firstElementChild;
  ragContainer.classList.add("llama-rag__overlay");
  ragLog = ragContainer.querySelector(".llama-rag__log");
  ragInput = ragContainer.querySelector(".llama-rag__input");
  ragWindow = ragContainer;

  ragContainer.querySelector(".llama-rag__close").addEventListener("click", closeLlamaRag);
  ragContainer.querySelector(".llama-rag__composer").addEventListener("submit", (event) => {
    event.preventDefault();
    const value = ragInput.value.trim();
    if (!value) return;
    appendMessage("You", value);
    ragInput.value = "";
    respond(value);
  });

  return ragContainer;
}

function appendMessage(author, text) {
  const line = document.createElement("div");
  line.className = "llama-rag__message";
  line.innerHTML = `<strong>${author}:</strong> <span>${text}</span>`;
  ragLog.appendChild(line);
  ragLog.scrollTop = ragLog.scrollHeight;
}

function respond(text) {
  const reply = getLlamaRagResponse(text);
  appendMessage("Llama Rag", reply);
}

export async function openLlamaRagWindow() {
  await loadTemplate();
  if (!document.body.contains(ragContainer)) {
    document.body.appendChild(ragContainer);
  }
  ragContainer.classList.add("is-open");
  ragContainer.classList.remove("is-closed");
  ragInput?.focus();
  if (!ragLog.hasChildNodes()) {
    appendMessage("Llama Rag", "Ask what you need. I will be direct.");
  }
}

export function closeLlamaRag() {
  ragContainer?.classList.remove("is-open");
  ragContainer?.classList.add("is-closed");
}

export async function attachLlamaRag() {
  await loadTemplate();
  if (!document.body.contains(ragContainer)) {
    document.body.appendChild(ragContainer);
  }
}
