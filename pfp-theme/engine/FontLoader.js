// FontLoader.js
// Takes an OpenType.js font object and injects it into the browser
// as a usable @font-face on the spot.

export function loadFontIntoPage(fontObj, fontName = "MyThemeFont") {
  try {
    // Convert the OpenType font to ArrayBuffer → Blob → ObjectURL
    const buffer = fontObj.toArrayBuffer();
    const blob = new Blob([buffer], { type: "font/ttf" });
    const url = URL.createObjectURL(blob);

    // Remove old font-face rules with the same name
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      try {
        const rules = sheet.cssRules || [];
        for (let i = rules.length - 1; i >= 0; i--) {
          const r = rules[i];
          if (r.cssText && r.cssText.includes(fontName)) {
            sheet.deleteRule(i);
          }
        }
      } catch {
        // ignore cross-origin sheets
      }
    }

    // Insert the new @font-face rule
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      @font-face {
        font-family: '${fontName}';
        src: url(${url}) format('truetype');
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(styleEl);

    // Return the name for convenience
    return fontName;
  } catch (err) {
    console.error("Could not load font into page:", err);
    return null;
  }
}
