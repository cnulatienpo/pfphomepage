import { getLlamaRagResponse } from './llamaRag.js';

const log = document.getElementById('chat-log');
const input = document.getElementById('chat-input');
const sendBtn = document.getElementById('chat-send');

function appendRow(role, text) {
  const row = document.createElement('div');
  row.className = `chat-row ${role}`;
  const label = document.createElement('div');
  label.textContent = role === 'user' ? 'You' : 'Llama Rag';
  label.style.fontWeight = '700';
  const body = document.createElement('div');
  body.textContent = text;
  row.append(label, body);
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

function handleSend() {
  const text = input.value.trim();
  if (!text) return;
  appendRow('user', text);
  const reply = getLlamaRagResponse(text);
  appendRow('llama', reply);
  input.value = '';
  input.focus();
}

sendBtn.addEventListener('click', handleSend);

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleSend();
  }
});
