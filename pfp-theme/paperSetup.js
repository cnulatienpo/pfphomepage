// paperSetup.js
// Initializes Paper.js once and returns the shared instance.
// Required by all shape + SVG tools.

import paper from "paper";

export function setupPaper() {
  // If already initialized, reuse it
  if (paper && paper.project && paper.project.view) {
    return paper;
  }

  // Create an offscreen canvas (Paper.js requires one)
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 1000;

  paper.setup(canvas);

  return paper;
}
