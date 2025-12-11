/**
 * fontMakerPanel.js
 * Bridge to integrate the React-based FontMaker from pfp-theme
 * into the vanilla JS layoutShell
 * 
 * LAZY-LOADED: Only imports and mounts FontMaker when explicitly requested
 * to avoid breaking the main app if FontMaker dependencies fail
 */

let fontMakerRoot = null;
let fontMakerLoaded = false;

/**
 * Lazy load React and FontMaker components only when needed
 */
async function lazyLoadFontMaker() {
  if (fontMakerLoaded) {
    return;
  }

  try {
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');
    const FontMakerRoute = (await import('../pfp-theme/FontMakerRoute.tsx')).default;
    const { ThemeFontProvider } = await import('../pfp-theme/ThemeFontContext.tsx');
    
    fontMakerLoaded = true;
    console.log('[fontMakerPanel] FontMaker dependencies loaded successfully');
    
    return { React: React.default, createRoot, FontMakerRoute, ThemeFontProvider };
  } catch (err) {
    console.error('[fontMakerPanel] Failed to load FontMaker dependencies:', err);
    return null;
  }
}

/**
 * Mount the FontMaker panel when explicitly called
 */
export async function mountFontMakerPanel() {
  const slot = document.querySelector('#font-maker-container');
  if (!slot) {
    console.warn('[fontMakerPanel] No #font-maker-container slot found.');
    return;
  }

  console.log('[fontMakerPanel] Mounting FontMaker in sidebar...');

  // Lazy load dependencies
  const deps = await lazyLoadFontMaker();
  if (!deps) {
    slot.innerHTML = '<p style="color:red">Failed to load FontMaker</p>';
    return;
  }

  const { React, createRoot, FontMakerRoute, ThemeFontProvider } = deps;

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

/**
 * Unmount the FontMaker panel
 */
export function unmountFontMakerPanel() {
  if (fontMakerRoot) {
    fontMakerRoot.unmount();
    fontMakerRoot = null;
  }
}

export default { mountFontMakerPanel, unmountFontMakerPanel };
