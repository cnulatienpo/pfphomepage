// /tests/test-componentFactory.js
import assert from "assert";
import { JSDOM } from "jsdom";
import * as Module from "../js/componentFactory.js";

const dom = new JSDOM(`<!DOCTYPE html><div id="root"></div>`);
global.document = dom.window.document;
global.window = dom.window;

console.log("Running tests for componentFactory...");

assert.ok(Module, "componentFactory module failed to load");

for (const fnName of Object.keys(Module)) {
  assert.ok(
    typeof Module[fnName] === "function" || typeof Module[fnName] === "object",
    `Export "${fnName}" is not a function or object`
  );
}

const container = document.createElement("div");
let added = 0;
Module.renderComponents(container, () => added++);
assert.ok(container.children.length > 0, "renderComponents should add preset cards");
container.firstChild.dispatchEvent(new dom.window.Event("click"));
assert.strictEqual(added, 1, "Clicking a component card should trigger onAdd callback");

console.log("componentFactory tests passed.");
