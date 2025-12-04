// exportFont.js
// Exports an OpenType.js font object as a downloadable .ttf file.
// Uses Blob + anchor fallback so we avoid external dependencies.

export function exportFont(font, fileName = "MyFont.ttf") {
  try {
    const buffer = font.toArrayBuffer();
    const blob = new Blob([buffer], { type: "font/ttf" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Font export failed:", err);
  }
}
