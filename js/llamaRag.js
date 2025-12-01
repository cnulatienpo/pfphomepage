import { LlamaRagResponses } from './llamaRag-responses.js';

const CATEGORY_KEYWORDS = [
  { category: 'colors', keywords: ['color', 'palette', 'fill', 'tint', 'shade', 'hue'] },
  {
    category: 'layout',
    keywords: [
      'layout',
      'align',
      'grid',
      'row',
      'column',
      'header',
      'footer',
      'section',
      'stack',
      'spacing',
      'margin',
      'padding',
    ],
  },
  { category: 'sizing', keywords: ['size', 'width', 'height', 'scale', 'resize', 'bigger', 'smaller'] },
  { category: 'layers', keywords: ['layer', 'z-index', 'front', 'behind', 'stacking', 'order'] },
  { category: 'backgrounds', keywords: ['background', 'texture', 'gradient', 'canvas', 'wallpaper'] },
  { category: 'typography', keywords: ['font', 'typography', 'typeface', 'letters', 'letter weight', 'line spacing'] },
  { category: 'motion', keywords: ['motion', 'animation', 'animate', 'move', 'bounce', 'slide', 'fade', 'speed', 'preset'] },
  { category: 'random', keywords: ['random', 'shuffle', 'surprise', 'try'] },
  { category: 'problems', keywords: ['problem', 'issue', 'wrong', 'messy', 'why', 'broken', 'empty', 'lost', 'bother'] },
  { category: 'export', keywords: ['export', 'theme', 'zip', 'download', 'file'] },
];

function pickCategoryFromText(inputText) {
  const text = (inputText || '').toLowerCase();
  for (const entry of CATEGORY_KEYWORDS) {
    const hit = entry.keywords.some((keyword) => text.includes(keyword));
    if (hit) return entry.category;
  }
  return 'unknown';
}

function pickResponseForCategory(category) {
  const bucket = LlamaRagResponses[category] || LlamaRagResponses.unknown;
  if (!bucket.length) return '';
  const index = Math.floor(Math.random() * bucket.length);
  return bucket[index];
}

export function detectLlamaRagCategory(inputText) {
  return pickCategoryFromText(inputText);
}

export function getLlamaRagResponse(inputText) {
  const category = pickCategoryFromText(inputText);
  const response = pickResponseForCategory(category);
  return { category, response };
}

export function renderLlamaRagResponse(inputText, targetElement) {
  const { category, response } = getLlamaRagResponse(inputText);
  if (targetElement) {
    targetElement.dataset.llamaCategory = category;
    targetElement.textContent = response;
  }
  return response;
}
