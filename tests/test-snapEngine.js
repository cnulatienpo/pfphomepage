// /tests/test-snapEngine.js
import assert from "assert";
import { JSDOM } from "jsdom";
import * as Module from "../js/snapEngine.js";

const dom = new JSDOM(`<!DOCTYPE html><div id="root"></div>`);
global.document = dom.window.document;
global.window = dom.window;

global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

console.log("Running tests for snapEngine...");

assert.ok(Module, "snapEngine module failed to load");

for (const fnName of Object.keys(Module)) {
  assert.ok(
    typeof Module[fnName] === "function" || typeof Module[fnName] === "object",
    `Export "${fnName}" is not a function or object`
  );
}

const checkbox = document.createElement("input");
checkbox.type = "checkbox";
let toggled = false;
const canvasEngine = { toggleGrid: (state) => (toggled = state) };
Module.renderSnapControls(checkbox, canvasEngine);
checkbox.checked = true;
checkbox.dispatchEvent(new dom.window.Event("change"));
assert.strictEqual(toggled, true, "renderSnapControls should toggle grid on change");

console.log("snapEngine tests passed.");
