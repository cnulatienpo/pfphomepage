/**
 * fontMakerPanel.js
 * Bridge to integrate the React-based FontMaker from pfp-theme
 * into the vanilla JS layoutShell
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

// Import FontMaker components from pfp-theme (using relative paths)
import FontMakerRoute from '../pfp-theme/FontMakerRoute.tsx';
import { ThemeFontProvider } from '../pfp-theme/ThemeFontContext.tsx';

let fontMakerRoot = null;

export function mountFontMakerPanel() {
  const slot = document.querySelector('#font-maker-container');
  if (!slot) {
    console.warn('[fontMakerPanel] No #font-maker-container slot found.');
    return;
  }

  console.log('[fontMakerPanel] Mounting FontMaker in sidebar.');

  // Clear any existing content
  slot.innerHTML = '';

  // Create React root and render FontMaker wrapped in ThemeFontProvider
  if (!fontMakerRoot) {
    fontMakerRoot = createRoot(slot);
  }

  fontMakerRoot.render(
    React.createElement(
      ThemeFontProvider,
      null,
      React.createElement(FontMakerRoute, null)
    )
  );

  console.log('[fontMakerPanel] FontMaker mounted successfully');
}

export function unmountFontMakerPanel() {
  if (fontMakerRoot) {
    fontMakerRoot.unmount();
    fontMakerRoot = null;
  }
}

export default { mountFontMakerPanel, unmountFontMakerPanel };
