const categories = [
  {
    id: "colors",
    keywords: ["color", "palette", "hue", "paint"],
    reply: "Use Look & Color. Pick a fill. Pick a text color. That’s it.",
  },
  {
    id: "layout",
    keywords: ["layout", "grid", "place", "drop", "arrange"],
    reply: "Place boxes. Use snap lines. Move them until it lines up.",
  },
  {
    id: "sizing",
    keywords: ["size", "scale", "width", "height"],
    reply: "Use the size sliders. Stop when it fits the spot.",
  },
  {
    id: "spacing",
    keywords: ["spacing", "gap", "padding", "margin"],
    reply: "Use the spacing slider. Tiny gaps feel tight. Bigger gaps feel calm.",
  },
  {
    id: "layers",
    keywords: ["layer", "z", "front", "behind"],
    reply: "Layers are out of order. Move the right one higher.",
  },
  {
    id: "motion",
    keywords: ["motion", "animate", "move", "wiggle", "bounce"],
    reply: "Pick a motion preset. Test it. If it’s too much, pull it back.",
  },
  {
    id: "backgrounds",
    keywords: ["background", "wall", "floor"],
    reply: "Pick a background swatch. Swap until the page feels steady.",
  },
  {
    id: "export",
    keywords: ["export", "download", "save"],
    reply: "Export panel makes the theme. Press the big button.",
  },
  {
    id: "text",
    keywords: ["text", "font", "title", "words"],
    reply: "Use the title block. Change color and size until it reads clearly.",
  },
  {
    id: "problems",
    keywords: ["wrong", "weird", "broken", "can’t", "cant", "cannot"],
    reply: "Hard to say. Try a different setting. Play with it.",
  },
];

export function getLlamaRagResponse(inputText = "") {
  const normalized = inputText.toLowerCase();
  for (const category of categories) {
    if (category.keywords.some((keyword) => normalized.includes(keyword))) {
      return category.reply;
    }
  }
  return "Hard to say. Try a different setting. Play with it.";
}
