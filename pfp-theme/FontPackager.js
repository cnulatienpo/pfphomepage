// FontPackager.js
// Builds a complete font package that your theme builder can store or load.
// Contains: fontObj, metadata, previewPNG, glyphShapes, tags.

export async function buildFontPackage({
  fontObj,
  metadata,
  tags = {},
  glyphs = {},
  previewCanvas
}) {
  // Convert canvas preview to PNG
  let previewPNG = null;
  if (previewCanvas) {
    previewPNG = previewCanvas.toDataURL("image/png");
  }

  // Clone shapes (Paper.js)
  const clonedShapes = {};
  for (const c in glyphs) {
    const g = glyphs[c];
    clonedShapes[c] = g ? g.clone() : null;
  }

  // Extract raw binary buffer
  const buffer = fontObj.toArrayBuffer();

  // Package
  const packageObj = {
    version: 1,
    savedAt: new Date().toISOString(),
    metadata,
    previewPNG,
    tags,
    glyphs: clonedShapes,
    fontBuffer: buffer
  };

  return packageObj;
}
