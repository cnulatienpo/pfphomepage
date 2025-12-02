// /tests/test-exportTools.js
import assert from "assert";
import { JSDOM } from "jsdom";
import * as Module from "../js/exportTools.js";

const dom = new JSDOM(`<!DOCTYPE html><div id="root"></div>`);
global.document = dom.window.document;
global.window = dom.window;

global.Blob = function Blob(data, opts) {
  this.data = data;
  this.type = opts?.type;
};
global.URL.createObjectURL = () => "blob:mock";

global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

console.log("Running tests for exportTools...");

assert.ok(Module, "exportTools module failed to load");

for (const fnName of Object.keys(Module)) {
  assert.ok(
    typeof Module[fnName] === "function" || typeof Module[fnName] === "object",
    `Export "${fnName}" is not a function or object`
  );
}

const canvas = { toDataURL: () => "data:image/png;base64,stub" };
let clickedPNG = false;
const anchorProto = dom.window.HTMLAnchorElement.prototype;
const originalClick = anchorProto.click;
anchorProto.click = function () {
  clickedPNG = true;
};
Module.exportToPNG(canvas);
assert.ok(clickedPNG, "exportToPNG should trigger anchor click");

let jsonClicked = false;
anchorProto.click = function () {
  jsonClicked = true;
};
const layerManager = { serialize: () => ({ layers: [] }), layers: [] };
Module.exportToJSON(layerManager);
assert.ok(jsonClicked, "exportToJSON should trigger download flow");

let htmlClicked = false;
anchorProto.click = function () {
  htmlClicked = true;
};
Module.exportToHTML(layerManager);
assert.ok(htmlClicked, "exportToHTML should trigger download flow");

anchorProto.click = originalClick;

console.log("exportTools tests passed.");
