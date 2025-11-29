// /tests/test-spacingBlocks.js
import assert from "assert";
import { JSDOM } from "jsdom";
import * as Module from "../js/spacingBlocks.js";

const dom = new JSDOM(`<!DOCTYPE html><div id="root"></div>`);
global.document = dom.window.document;
global.window = dom.window;

console.log("Running tests for spacingBlocks...");

assert.ok(Module, "spacingBlocks module failed to load");

for (const fnName of Object.keys(Module)) {
  assert.ok(
    typeof Module[fnName] === "function" || typeof Module[fnName] === "object",
    `Export "${fnName}" is not a function or object`
  );
}

const container = document.createElement("div");
Module.renderSpacingPreview(container);
assert.strictEqual(container.children.length, 12, "renderSpacingPreview should create 12 spacing cells");

console.log("spacingBlocks tests passed.");
