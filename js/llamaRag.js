import { LlamaRagResponses } from './llamaRag-responses.js';

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function chooseCategory(input) {
  const text = input.toLowerCase();
  if (/color|palette|paint/.test(text)) return 'colors';
  if (/layout|grid|row|column|stack/.test(text)) return 'layout';
  if (/size|resize|scale|fit/.test(text)) return 'sizing';
  if (/layer|order|stack/.test(text)) return 'layers';
  if (/background|texture|gradient/.test(text)) return 'backgrounds';
  if (/font|type|text/.test(text)) return 'typography';
  if (/motion|animate|move/.test(text)) return 'motion';
  if (/export|save|download/.test(text)) return 'export';
  if (/broken|problem|issue|stuck/.test(text)) return 'problems';
  if (/random/.test(text)) return 'random';
  return 'unknown';
}

export function getLlamaRagResponse(message) {
  const category = chooseCategory(message || '');
  const pool = LlamaRagResponses[category] || LlamaRagResponses.unknown;
  return pick(pool);
}
