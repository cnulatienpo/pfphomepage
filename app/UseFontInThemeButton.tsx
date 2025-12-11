// UseFontInThemeButton.tsx
// Button that activates the generated font inside the theme builder.

import React from "react";
import { loadFontIntoTheme } from "./loadFontIntoTheme";
import { useThemeFont } from "./ThemeFontContext";

function base64ToArrayBuffer(base64) {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (err) {
    console.error("Could not decode font buffer", err);
    return null;
  }
}

export default function UseFontInThemeButton({ fontPackage }) {
  const { setActiveFontName } = useThemeFont();

  if (!fontPackage) {
    return null;
  }

  const handleUse = () => {
    const { metadata, fontBuffer } = fontPackage;
    const resolvedName = metadata.fontName || metadata.name || "ThemeFont";
    const buffer =
      typeof fontBuffer === "string" ? base64ToArrayBuffer(fontBuffer) : fontBuffer;

    if (!buffer) return;

    loadFontIntoTheme(resolvedName, buffer);
    setActiveFontName(resolvedName);
  };

  return (
    <button
      style={{
        padding: "8px 14px",
        background: "var(--steel-800)",
        color: "white",
        border: "1px solid var(--steel-500)",
        cursor: "pointer",
        fontSize: "14px"
      }}
      onClick={handleUse}
    >
      Use This In The Theme
    </button>
  );
}
