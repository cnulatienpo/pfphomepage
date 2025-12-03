// FontPackager.js
// Builds a complete font package that your theme builder can store or load.
// Contains: fontObj, metadata, previewPNG, glyphShapes, tags.

import { setupPaper } from "./paperSetup";

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function serializeGlyphs(glyphs) {
  const paper = setupPaper();
  const out = {};
  Object.entries(glyphs || {}).forEach(([char, shape]) => {
    if (shape && typeof shape.exportJSON === "function") {
      out[char] = shape.exportJSON({ asString: true });
    }
  });
  return out;
}

export async function buildFontPackage({
  fontObj,
  metadata,
  tags = {},
  glyphs = {},
  previewCanvas,
}) {
  // Convert canvas preview to PNG
  let previewPNG = null;
  if (previewCanvas) {
    previewPNG = previewCanvas.toDataURL("image/png");
  }

  const glyphJSON = serializeGlyphs(glyphs);
  const buffer = fontObj.toArrayBuffer();
  const bufferBase64 = arrayBufferToBase64(buffer);

  const packageObj = {
    version: 1,
    savedAt: new Date().toISOString(),
    metadata,
    previewPNG,
    tags,
    glyphs: glyphJSON,
    fontBuffer: bufferBase64,
  };

  return packageObj;
}
