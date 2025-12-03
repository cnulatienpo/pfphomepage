// download.js
// Simple helper for saving any ArrayBuffer as a .ttf file.

import { saveAs } from "file-saver";

export function download(buffer, fileName = "MyFont.ttf") {
  try {
    const blob = new Blob([buffer], { type: "font/ttf" });
    saveAs(blob, fileName);
  } catch (err) {
    console.error("Download failed:", err);
  }
}
