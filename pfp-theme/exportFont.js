// exportFont.js
// Exports an OpenType.js font object as a downloadable .ttf file.
// Uses Blob + FileSaver fallback.

import { saveAs } from "file-saver";

export function exportFont(font, fileName = "MyFont.ttf") {
  try {
    const buffer = font.toArrayBuffer();
    const blob = new Blob([buffer], { type: "font/ttf" });
    saveAs(blob, fileName);
  } catch (err) {
    console.error("Font export failed:", err);
  }
}
