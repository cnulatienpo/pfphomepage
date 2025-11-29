// /tests/test-typeBlocks.js
import assert from "assert";
import { JSDOM } from "jsdom";
import * as Module from "../js/typeBlocks.js";

const dom = new JSDOM(`<!DOCTYPE html><div id="root"></div>`);
global.document = dom.window.document;
global.window = dom.window;

console.log("Running tests for typeBlocks...");

assert.ok(Module, "typeBlocks module failed to load");

for (const fnName of Object.keys(Module)) {
  assert.ok(
    typeof Module[fnName] === "function" || typeof Module[fnName] === "object",
    `Export "${fnName}" is not a function or object`
  );
}

const container = document.createElement("div");
Module.renderTypeBlocks(container);
assert.ok(container.children.length > 0, "renderTypeBlocks should create type cards");

console.log("typeBlocks tests passed.");
