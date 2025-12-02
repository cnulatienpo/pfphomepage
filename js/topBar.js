const modes = [
  {
    id: "add-things",
    label: "Put Stuff On The Page",
    tooltip: "Pick boxes, words, and pictures to drop on the page.",
  },
  {
    id: "paint-colors",
    label: "Paint The Colors",
    tooltip: "Change what color the stuff is.",
  },
  {
    id: "add-dirt",
    label: "Add Dirt And Scratches",
    tooltip: "Put grime, rust, and scratches on things so they look used.",
  },
  {
    id: "make-move",
    label: "Make It Move",
    tooltip: "Tell things how to wiggle, slide, or breathe.",
  },
  {
    id: "depth-layers",
    label: "Depth And Layers",
    tooltip:
      "Tell the computer what is in front, what is behind, and how far away things are.",
  },
  {
    id: "sound-motion",
    label: "Sound Makes It Move",
    tooltip: "Let sound and music push things around.",
  },
  {
    id: "control-room",
    label: "Big Control Room",
    tooltip: "Hook up the weird machines and let them steer the picture.",
  },
  {
    id: "save-export",
    label: "Save And Take Out",
    tooltip: "Save what you made or get a file you can use somewhere else.",
  },
];

function createButton(mode, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "top-button";
  button.textContent = mode.label;
  button.title = mode.tooltip;
  button.dataset.mode = mode.id;
  button.addEventListener("click", () => onClick(mode.id));
  return button;
}

export function initTopBar(rootElement) {
  const bar = document.createElement("div");
  bar.className = "top-bar";

  const handleClick = (modeId) => {
    const event = new CustomEvent("ui:modeChanged", {
      detail: { mode: modeId },
      bubbles: true,
    });
    rootElement.dispatchEvent(event);
  };

  modes.forEach((mode) => {
    const button = createButton(mode, handleClick);
    bar.appendChild(button);
  });

  const themePlayBtn = document.createElement("button");
  themePlayBtn.type = "button";
  themePlayBtn.className = "top-button top-button--themeplay";
  themePlayBtn.textContent = "ThemePlay Mode";
  themePlayBtn.title = "Open the playful checklist and helper.";
  themePlayBtn.addEventListener("click", () => {
    const event = new CustomEvent("ui:openThemePlay", { bubbles: true });
    rootElement.dispatchEvent(event);
  });

  bar.appendChild(themePlayBtn);

  rootElement.appendChild(bar);
  return bar;
}
