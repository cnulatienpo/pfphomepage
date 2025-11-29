// /tests/test-layerManager.js
import assert from "assert";
import { JSDOM } from "jsdom";
import * as Module from "../js/layerManager.js";

const dom = new JSDOM(`<!DOCTYPE html><div id="root"></div>`);
global.document = dom.window.document;
global.window = dom.window;

console.log("Running tests for layerManager...");

assert.ok(Module, "layerManager module failed to load");

for (const fnName of Object.keys(Module)) {
  assert.ok(
    typeof Module[fnName] === "function" || typeof Module[fnName] === "object",
    `Export "${fnName}" is not a function or object`
  );
}

const manager = new Module.LayerManager();
manager.subscribe((layers) => {
  assert.ok(Array.isArray(layers), "notify did not send layers array");
});
const created = manager.createLayer({ name: "Test", src: "placeholder" });
assert.ok(created.id, "Created layer missing id");
assert.strictEqual(manager.activeId, created.id, "Active layer not set");

console.log("layerManager tests passed.");
