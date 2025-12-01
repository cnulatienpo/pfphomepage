import { LlamaRagResponses } from "./llamaRag-responses.js";

function normalize(text) {
  return text.toLowerCase();
}

function matchResponse(query) {
  const normalizedQuery = normalize(query);
  return LlamaRagResponses.find((entry) =>
    entry.keywords.some((keyword) => normalizedQuery.includes(keyword))
  );
}

export function getLlamaRagResponse(query) {
  if (!query || !query.trim()) {
    return {
      heading: "Ask anything",
      body: "Type what you need. Llama Rag will answer with tiny, useful steps.",
      tip: "Try asking about layout, motion, or exporting.",
    };
  }

  const match = matchResponse(query.trim());
  if (match) {
    return match;
  }

  return {
    heading: "Try this",
    body: "Start with one change: pick a mode, drag something onto the page, and peek at Preview Mode to see how it feels.",
    tip: "Mention drag, color, motion, or export so I can aim the advice.",
  };
}
