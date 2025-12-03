// loadSvg.js
// Turns uploaded SVG data into a Paper.js compound path
// Works with the Paper.js setup function

import { setupPaper } from "./paperSetup";
import "path-data-polyfill";

export async function loadSvg(svgDataURL) {
  const paper = setupPaper();

  return new Promise((resolve, reject) => {
    try {
      // Convert data URL to text
      const base64 = svgDataURL.split(",")[1];
      const svgText = atob(base64);

      // Parse the SVG into a DOM node
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
      const svgRoot = svgDoc.documentElement;

      // Collect all <path> elements
      const pathNodes = Array.from(svgRoot.querySelectorAll("path"));

      if (pathNodes.length === 0) {
        reject("No usable <path> elements found in SVG.");
        return;
      }

      // Build a compound path in Paper.js
      const compound = new paper.CompoundPath();

      pathNodes.forEach(node => {
        const d = node.getAttribute("d");
        if (!d) return;

        // Paper.js path importer
        const p = new paper.Path(d);

        // Apply transforms from SVG if present
        const transform = node.getAttribute("transform");
        if (transform) {
          try {
            p.transform(new paper.Matrix(transform));
          } catch (e) {
            // Ignore unsupported transforms
          }
        }

        compound.addChild(p);
      });

      // Normalize orientation (make clockwise or consistent)
      compound.reduce();

      // Center the compound path at origin for easier manipulation
      compound.position = new paper.Point(0, 0);

      // Return Paper.js object
      resolve(compound);

    } catch (err) {
      reject("SVG parsing failed: " + err);
    }
  });
}
