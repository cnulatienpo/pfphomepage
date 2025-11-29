// /tests/test-colorBuckets.js
import assert from "assert";
import { JSDOM } from "jsdom";
import * as Module from "../js/colorBuckets.js";

const dom = new JSDOM(`<!DOCTYPE html><div id="root"></div>`);
global.document = dom.window.document;
global.window = dom.window;

console.log("Running tests for colorBuckets...");

assert.ok(Module, "colorBuckets module failed to load");

for (const fnName of Object.keys(Module)) {
  assert.ok(
    typeof Module[fnName] === "function" || typeof Module[fnName] === "object",
    `Export "${fnName}" is not a function or object`
  );
}

const container = document.createElement("div");
let picked;
Module.renderColorBuckets(container, (color) => {
  picked = color;
});
assert.ok(container.children.length > 0, "renderColorBuckets should render swatches");
container.firstChild.dispatchEvent(new dom.window.Event("click"));
assert.ok(picked, "Color callback should receive a value when a swatch is clicked");

console.log("colorBuckets tests passed.");
