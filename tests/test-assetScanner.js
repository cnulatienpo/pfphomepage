// /tests/test-assetScanner.js
import assert from "assert";
import { JSDOM } from "jsdom";
import * as Module from "../js/assetScanner.js";

const dom = new JSDOM(`<!DOCTYPE html><div id="root"></div>`);
global.document = dom.window.document;
global.window = dom.window;

console.log("Running tests for assetScanner...");

assert.ok(Module, "assetScanner module failed to load");

for (const fnName of Object.keys(Module)) {
  assert.ok(
    typeof Module[fnName] === "function" || typeof Module[fnName] === "object",
    `Export "${fnName}" is not a function or object`
  );
}

global.fetch = async () => ({ ok: false, json: async () => ({}) });
const assets = await Module.loadAssets();
assert.ok(Array.isArray(assets), "loadAssets did not return an array");
assert.ok(assets.length > 0, "loadAssets should provide placeholder assets when map is missing");

const badge = Module.placeholderBadge("OK", "#fff");
assert.ok(badge.includes("svg"), "placeholderBadge should return inline SVG content");

console.log("assetScanner tests passed.");
