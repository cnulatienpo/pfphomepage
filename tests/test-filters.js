// /tests/test-filters.js
import assert from "assert";
import { JSDOM } from "jsdom";
import * as Module from "../js/filters.js";

const dom = new JSDOM(`<!DOCTYPE html><div id="root"></div>`);
global.document = dom.window.document;
global.window = dom.window;

console.log("Running tests for filters...");

assert.ok(Module, "filters module failed to load");

for (const fnName of Object.keys(Module)) {
  assert.ok(
    typeof Module[fnName] === "function" || typeof Module[fnName] === "object",
    `Export "${fnName}" is not a function or object`
  );
}

const container = document.createElement("div");
const layerManager = {
  activeId: "a1",
  layers: [
    { id: "a1", filter: { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, opacity: 100 } },
  ],
  updateLayer(id, payload) {
    this.lastUpdate = { id, payload };
  },
};
Module.buildFiltersUI(container, layerManager, () => {});
assert.strictEqual(container.children.length, Module.filterDefs.length, "Filter UI should render inputs for each definition");

const mockCtx = {};
Module.applyFilters(mockCtx, layerManager.layers[0].filter);
assert.ok(typeof mockCtx.filter === "string", "applyFilters should set ctx.filter string");

console.log("filters tests passed.");
