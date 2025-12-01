import { initTopBar } from "./topBar.js";
import initLeftSidebar from "./leftSidebar.js";
import { initRightPanel, updateRightPanelForSelection } from "./rightPanel.js";
import {
  attachThemePlayUI,
  toggleThemePlayPanel,
} from "./themeplay-ui.js";
import { attachLlamaRag } from "./llama-rag-ui.js";
import * as themeplay from "./themeplay.js";
import { randomizeColors, randomizeLayout, randomizeMotion } from "./randomizers.js";
import { exportCSS } from "./exportTools.js";

const placedBlocks = new Map();
let selectedBlock = null;

function applyTransforms(block) {
  const props = block._properties?.properties || {};
  const tx = `${props.positionX || 0}px`;
  const ty = `${props.positionY || 0}px`;
  const rot = `${props.rotation || 0}deg`;
  block.style.setProperty("--tx", tx);
  block.style.setProperty("--ty", ty);
  block.style.setProperty("--rot", rot);
  block.style.transform = `translate(${tx}, ${ty}) rotate(${rot})`;
}

function buildCenterArea() {
  const center = document.createElement("main");
  center.className = "center-area";

  const title = document.createElement("div");
  title.className = "area-title";
  title.textContent = "Play Area";

  const help = document.createElement("div");
  help.className = "area-help";
  help.textContent = "This is the page. You drop things here.";

  const dropHint = document.createElement("div");
  dropHint.className = "drop-hint";
  dropHint.textContent = "Drag blocks from the left. Drag them around. Snap lines will appear.";

  const snapX = document.createElement("div");
  snapX.className = "snap-line snap-line--x";
  const snapY = document.createElement("div");
  snapY.className = "snap-line snap-line--y";

  center.appendChild(title);
  center.appendChild(help);
  center.appendChild(dropHint);
  center.appendChild(snapX);
  center.appendChild(snapY);

  return center;
}

function tickPulse(target) {
  target.classList.remove("tick-pulse");
  void target.offsetWidth;
  target.classList.add("tick-pulse");
}

function makeBlockDraggable(block, centerArea) {
  let pointerId = null;
  let offsetX = 0;
  let offsetY = 0;
  const startDrag = (event) => {
    pointerId = event.pointerId;
    block.setPointerCapture(pointerId);
    const rect = block.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    centerArea.classList.add("show-snaps");
  };

  const moveDrag = (event) => {
    if (pointerId !== event.pointerId) return;
    const parentRect = centerArea.getBoundingClientRect();
    const x = event.clientX - parentRect.left - offsetX;
    const y = event.clientY - parentRect.top - offsetY;
    positionBlock(block, x, y);
    const snapXLine = centerArea.querySelector(".snap-line--x");
    const snapYLine = centerArea.querySelector(".snap-line--y");
    const centerX = parentRect.width / 2 - block.offsetWidth / 2;
    const centerY = parentRect.height / 2 - block.offsetHeight / 2;
    if (Math.abs(x - centerX) < 16) {
      snapYLine.style.left = `${centerX + block.offsetWidth / 2}px`;
      snapYLine.classList.add("is-visible");
    } else {
      snapYLine.classList.remove("is-visible");
    }
    if (Math.abs(y - centerY) < 16) {
      snapXLine.style.top = `${centerY + block.offsetHeight / 2}px`;
      snapXLine.classList.add("is-visible");
    } else {
      snapXLine.classList.remove("is-visible");
    }
  };

  const endDrag = (event) => {
    if (pointerId !== event.pointerId) return;
    centerArea.classList.remove("show-snaps");
    centerArea.querySelectorAll(".snap-line").forEach((line) => line.classList.remove("is-visible"));
    block.releasePointerCapture(pointerId);
    tickPulse(block);
    pointerId = null;
  };

  block.addEventListener("pointerdown", startDrag);
  block.addEventListener("pointermove", moveDrag);
  block.addEventListener("pointerup", endDrag);
  block.addEventListener("pointercancel", endDrag);
}

function createPlacedBlock(type, label) {
  const block = document.createElement("div");
  block.className = "placed-block";
  block.draggable = true;
  const id = `block-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  block.dataset.id = id;
  block.dataset.type = type;
  block.textContent = label || type;
  block._properties = {
    id,
    properties: {
      positionX: 0,
      positionY: 0,
      width: 160,
      height: 120,
      rotation: 0,
      fillColor: "#ffe29f",
      borderColor: "#c38b1e",
      textColor: "#2c2c38",
    },
  };
  block.style.width = `${block._properties.properties.width}px`;
  block.style.height = `${block._properties.properties.height}px`;
  applyTransforms(block);
  placedBlocks.set(id, block);
  return block;
}

function positionBlock(block, x, y) {
  block._properties.properties.positionX = x;
  block._properties.properties.positionY = y;
  applyTransforms(block);
}

function selectBlock(block, rightPanel) {
  if (selectedBlock) {
    selectedBlock.classList.remove("is-selected");
  }
  selectedBlock = block;
  block.classList.add("is-selected");
  updateRightPanelForSelection(block._properties);
}

function handlePropertyChange(event) {
  const { id, property, value } = event.detail || {};
  const block = placedBlocks.get(id);
  if (!block) return;
  block._properties.properties[property] = value;
  if (property === "fillColor") {
    block.style.background = value;
    themeplay.onAction("color-change");
  }
  if (property === "borderColor") {
    block.style.borderColor = value;
    themeplay.onAction("color-change");
  }
  if (property === "textColor") {
    block.style.color = value;
    themeplay.onAction("color-change");
  }
  if (property === "width") {
    block.style.width = `${value}px`;
  }
  if (property === "height") {
    block.style.height = `${value}px`;
  }
  if (property === "rotation") {
    applyTransforms(block);
  }
  if (property === "positionX" || property === "positionY") {
    applyTransforms(block);
    tickPulse(block);
  }
  if (property.includes("motion")) {
    block.dataset.motion = "custom";
    themeplay.onAction("motion-change");
  }
}

function handleDrop(centerArea, data) {
  const label = data || "Dropped Item";
  const block = createPlacedBlock(data, label.replace(/-/g, " "));
  block.style.position = "absolute";
  positionBlock(block, 60 + Math.random() * 120, 120 + Math.random() * 120);
  centerArea.appendChild(block);
  tickPulse(block);
  makeBlockDraggable(block, centerArea);
  block.addEventListener("click", () => selectBlock(block));
  block.addEventListener("dragstart", () => {
    block.classList.add("dragging-block");
    centerArea.classList.add("show-snaps");
  });
  block.addEventListener("dragend", () => {
    block.classList.remove("dragging-block");
    centerArea.classList.remove("show-snaps");
    tickPulse(block);
  });
  if (data?.includes("header")) {
    themeplay.onAction("drop-header");
  }
  if (data?.includes("title")) {
    themeplay.onAction("place-title");
  }
  if (data?.includes("card")) {
    block.classList.add("card-look");
    themeplay.onAction("card-styled");
  }
  themeplay.onAction("place-element");
  selectBlock(block);
}

function hookDrops(centerArea) {
  centerArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    centerArea.classList.add("show-snaps");
  });
  centerArea.addEventListener("dragleave", () => {
    centerArea.classList.remove("show-snaps");
  });
  centerArea.addEventListener("drop", (event) => {
    event.preventDefault();
    centerArea.classList.remove("show-snaps");
    const data = event.dataTransfer?.getData("text/plain") || "drop";
    if (data.includes("background")) {
      centerArea.style.background = "linear-gradient(135deg, #d7e7ff, #fef7e0)";
      themeplay.onAction("background");
      return;
    }
    handleDrop(centerArea, data);
  });
}

function bindTopBarInteractions(topBarContainer) {
  topBarContainer.addEventListener("ui:openThemePlay", toggleThemePlayPanel);
}

function buildBottomBar() {
  const bottomBar = document.createElement("footer");
  bottomBar.className = "bottom-bar";
  const bottomHeading = document.createElement("h2");
  bottomHeading.className = "panel-heading";
  bottomHeading.textContent = "Stack Of Things";
  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.className = "themeplay-btn";
  exportButton.textContent = "Make My Theme";
  exportButton.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("ui:exportTheme"));
    themeplay.onAction("export");
  });
  const randomRow = document.createElement("div");
  randomRow.className = "bottom-actions";
  const randomizeButton = document.createElement("button");
  randomizeButton.type = "button";
  randomizeButton.className = "themeplay-btn";
  randomizeButton.textContent = "Randomize Something";
  randomizeButton.addEventListener("click", () => {
    randomizeColors(document);
  });
  const motionButton = document.createElement("button");
  motionButton.type = "button";
  motionButton.className = "themeplay-btn";
  motionButton.textContent = "Randomize Motion";
  motionButton.addEventListener("click", () => randomizeMotion(document));
  randomRow.append(randomizeButton, motionButton);
  bottomBar.append(bottomHeading, exportButton, randomRow);
  return bottomBar;
}

function attachExportHandler() {
  document.addEventListener("ui:exportTheme", () => {
    const themeState = {
      palette: ["#ffcc66", "#f5e2ff", "#7cd1ff"],
      spacingScale: [4, 8, 12, 16, 24],
      radiusScale: [8, 12, 16],
      typography: { heading: "'Arial Rounded MT Bold', sans-serif", body: "'Fredoka', sans-serif" },
    };
    exportCSS(themeState);
  });
}

export function initLayoutShell() {
  const app = document.getElementById("app");
  if (!app) return;

  app.textContent = "";

  const shell = document.createElement("div");
  shell.className = "layout-shell";

  const topBarContainer = document.createElement("header");
  topBarContainer.className = "top-bar-container";
  initTopBar(topBarContainer);
  bindTopBarInteractions(topBarContainer);

  const workspace = document.createElement("div");
  workspace.className = "workspace";

  const leftSidebar = document.createElement("aside");
  initLeftSidebar(leftSidebar);
  const centerArea = buildCenterArea();
  const rightSidebar = document.createElement("aside");
  initRightPanel(rightSidebar);

  hookDrops(centerArea);

  const bottomBar = buildBottomBar();

  workspace.appendChild(leftSidebar);
  workspace.appendChild(centerArea);
  workspace.appendChild(rightSidebar);
  workspace.appendChild(bottomBar);

  shell.appendChild(topBarContainer);
  shell.appendChild(workspace);

  app.appendChild(shell);

  document.addEventListener("ui:propertyChanged", handlePropertyChange);
  document.addEventListener("ui:testMotion", () => themeplay.onAction("motion-test"));

  attachThemePlayUI();
  attachLlamaRag();
  attachExportHandler();

  randomizeLayout(document);
}

window.onload = initLayoutShell;
