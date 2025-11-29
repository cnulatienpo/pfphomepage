// /tests/test-inspector.js
import assert from "assert";
import { JSDOM } from "jsdom";
import * as Module from "../js/inspector.js";

const dom = new JSDOM(`<!DOCTYPE html><div id="root"></div>`);
global.document = dom.window.document;
global.window = dom.window;

global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

console.log("Running tests for inspector...");

assert.ok(Module, "inspector module failed to load");

for (const fnName of Object.keys(Module)) {
  assert.ok(
    typeof Module[fnName] === "function" || typeof Module[fnName] === "object",
    `Export "${fnName}" is not a function or object`
  );
}

const container = document.createElement("div");
const layerManager = {
  activeId: "l1",
  layers: [{ id: "l1", name: "Layer 1", width: 100, height: 100, blendMode: "source-over", locked: false, visible: true }],
  updateLayer(id, payload) {
    this.lastUpdate = { id, payload };
  },
  toggleLock() {
    this.locked = !this.locked;
  },
  toggleVisibility() {
    this.visible = !this.visible;
  },
};
Module.renderInspector(container, layerManager);
assert.ok(container.children.length > 0, "renderInspector should populate inspector fields");

console.log("inspector tests passed.");
