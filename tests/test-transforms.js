// /tests/test-transforms.js
import assert from "assert";
import { JSDOM } from "jsdom";
import * as Module from "../js/transforms.js";

const dom = new JSDOM(`<!DOCTYPE html><div id="root"></div>`);
global.document = dom.window.document;
global.window = dom.window;

console.log("Running tests for transforms...");

assert.ok(Module, "transforms module failed to load");

for (const fnName of Object.keys(Module)) {
  assert.ok(
    typeof Module[fnName] === "function" || typeof Module[fnName] === "object",
    `Export "${fnName}" is not a function or object`
  );
}

const container = document.createElement("div");
const layerManager = {
  activeId: "t1",
  layers: [{ id: "t1", transform: { rotation: 0, scale: 1, x: 0, y: 0 } }],
  updateLayer(id, payload) {
    this.lastUpdate = { id, payload };
  },
};
Module.buildTransformUI(container, layerManager, () => {});
assert.strictEqual(
  container.children.length,
  Module.transformDefs.length,
  "Transform UI should render inputs for each definition"
);

console.log("transforms tests passed.");
