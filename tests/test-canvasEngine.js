// /tests/test-canvasEngine.js
import assert from "assert";
import { JSDOM } from "jsdom";
import * as Module from "../js/canvasEngine.js";

const dom = new JSDOM(`<!DOCTYPE html><div id="root"></div>`);
global.document = dom.window.document;
global.window = dom.window;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

console.log("Running tests for canvasEngine...");

assert.ok(Module, "canvasEngine module failed to load");

for (const fnName of Object.keys(Module)) {
  assert.ok(
    typeof Module[fnName] === "function" || typeof Module[fnName] === "object",
    `Export "${fnName}" is not a function or object`
  );
}

const dummyContext = {
  save() {},
  setTransform() {},
  clearRect() {},
  fillStyle: "",
  fillRect() {},
  createLinearGradient() {
    return { addColorStop() {} };
  },
  globalCompositeOperation: "source-over",
  globalAlpha: 1,
  translate() {},
  rotate() {},
  scale() {},
  beginPath() {},
  arc() {},
  strokeStyle: "",
  lineWidth: 1,
  moveTo() {},
  lineTo() {},
  stroke() {},
  restore() {},
  font: "",
  textAlign: "",
  textBaseline: "",
  fillText() {},
};

const canvas = { width: 200, height: 200, getContext: () => dummyContext };
const overlay = { getContext: () => dummyContext };
const originalLoop = Module.CanvasEngine.prototype._startLoop;
Module.CanvasEngine.prototype._startLoop = function noop() {};

const engine = new Module.CanvasEngine(canvas, overlay, { layers: [] });
assert.ok(engine instanceof Module.CanvasEngine, "CanvasEngine did not construct successfully");

Module.CanvasEngine.prototype._startLoop = originalLoop;

console.log("canvasEngine tests passed.");
