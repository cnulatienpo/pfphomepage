// ThemeFontContext.tsx
// Global store for active font inside the theme builder.

import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeFontContext = createContext(null);

export function ThemeFontProvider({ children }) {
  const [activeFontName, setActiveFontName] = useState(
    localStorage.getItem("activeFontName") || "system-ui"
  );

  useEffect(() => {
    localStorage.setItem("activeFontName", activeFontName);
    document.documentElement.style.setProperty("--theme-font", activeFontName);
  }, [activeFontName]);

  const value = {
    activeFontName,
    setActiveFontName
  };

  return (
    <ThemeFontContext.Provider value={value}>
      {children}
    </ThemeFontContext.Provider>
  );
}

export function useThemeFont() {
  return useContext(ThemeFontContext);
}
