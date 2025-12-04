// loadFontIntoTheme.js
// Injects a font into the page so the whole theme builder uses it.

export function loadFontIntoTheme(fontName, fontBuffer) {
  const blob = new Blob([fontBuffer], { type: "font/otf" });
  const url = URL.createObjectURL(blob);

  const id = "dynamic-font-face";

  const old = document.getElementById(id);
  if (old) old.remove();

  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    @font-face {
      font-family: '${fontName}';
      src: url('${url}') format('opentype');
      font-weight: normal;
      font-style: normal;
    }
  `;

  document.head.appendChild(style);

  document.documentElement.style.setProperty("--theme-font", fontName);
}

