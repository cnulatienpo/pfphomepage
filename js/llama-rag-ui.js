import { getLlamaRagResponse } from "./llamaRag.js";

export function openLlamaRagWindow() {
  const popup = window.open(
    "llama-rag-window.html",
    "llamaRag",
    "width=420,height=600,resizable=yes"
  );
  if (popup) {
    popup.focus();
  }
}

export function attachLlamaRag() {
  const log = document.getElementById("llama-rag-log");
  const input = document.getElementById("llama-rag-input");
  const form = document.getElementById("llama-rag-form");

  function appendMessage(label, message) {
    const prefix = label ? `${label}: ` : "";
    if (log) {
      log.value += `${prefix}${message}\n`;
      log.scrollTop = log.scrollHeight;
    }
  }

  function sendMessage(evt) {
    evt.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    appendMessage("You", text);
    const reply = getLlamaRagResponse(text);
    appendMessage("Llama Rag", reply);
    input.value = "";
    input.focus();
  }

  if (form && input && log) {
    form.addEventListener("submit", sendMessage);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        sendMessage(event);
      }
    });

    appendMessage("Llama Rag", "Panel online. Type instructions.");
  }
}
