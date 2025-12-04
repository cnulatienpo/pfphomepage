// UseFontInThemeButton.tsx
// Button that activates the generated font inside the theme builder.

import React from "react";
import { loadFontIntoTheme } from "./loadFontIntoTheme";
import { useThemeFont } from "./ThemeFontContext";

export default function UseFontInThemeButton({ fontPackage }) {
  const { setActiveFontName } = useThemeFont();

  if (!fontPackage) {
    return null;
  }

  const handleUse = () => {
    const { metadata, fontBuffer } = fontPackage;
    loadFontIntoTheme(metadata.name, fontBuffer);
    setActiveFontName(metadata.name);
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
