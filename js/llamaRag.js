export function getLlamaRagResponse(inputString = "") {
  const text = inputString.toLowerCase();

  const routes = [
    {
      keywords: ["size", "width", "height", "bigger", "smaller", "scale"],
      response: () =>
        "Size runs on sliders. Push right to widen, left to narrow. Nothing fancy.",
    },
    {
      keywords: ["color", "paint", "tint", "hue", "shade"],
      response: () => "Color is paint. Pick a bucket, coat the part, move on.",
    },
    {
      keywords: ["layer", "stack", "order", "front", "back"],
      response: () =>
        "Layers are the stack. Move a piece up to sit on top. Drop it to send it behind.",
    },
    {
      keywords: ["motion", "animate", "move", "cycle", "loop", "preset"],
      response: () => "Motion runs off presets. Pick a cycle and keep the range tight.",
    },
    {
      keywords: ["depth", "3d", "distance", "z-index", "ahead", "behind"],
      response: () => "Depth is front and back cuts. Choose where it sits in the lane.",
    },
    {
      keywords: ["sound", "audio", "volume", "loud", "quiet"],
      response: () => "Sound is numbers pushing parts. Feed numbers, watch output, adjust.",
    },
    {
      keywords: ["error", "broken", "fail", "bug", "jam"],
      response: () =>
        "When it jams, follow procedure. Reset the unit, check cables, reload, test again.",
    },
  ];

  for (const route of routes) {
    if (route.keywords.some((keyword) => text.includes(keyword))) {
      return route.response();
    }
  }

  const neutralResponses = [
    "It does the job. Adjust what you need and keep moving.",
    "This panel takes input and spits output. Set it and go.",
    "You press the control, it responds. That is the whole story.",
  ];

  return neutralResponses[Math.floor(Math.random() * neutralResponses.length)];
}
