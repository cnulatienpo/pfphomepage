import { initTopBar } from "./topBar.js";
import { notifyThemePlayAction } from "./themeplay.js";

function buildSidebar(className, headingText, helpText) {
  const sidebar = document.createElement("aside");
  sidebar.className = `sidebar ${className}`;

  const heading = document.createElement("h2");
  heading.className = "panel-heading";
  heading.textContent = headingText;

  sidebar.appendChild(heading);

  if (helpText) {
    const helper = document.createElement("p");
    helper.className = "placeholder-text";
    helper.textContent = helpText;
    sidebar.appendChild(helper);
  }

  return sidebar;
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

  const themeplayStatus = document.createElement("div");
  themeplayStatus.id = "themeplay-status";
  themeplayStatus.textContent = "ThemePlay will cheer each move you make.";

  center.appendChild(title);
  center.appendChild(help);
  center.appendChild(themeplayStatus);

  return center;
}

function createThemePlayButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "top-button themeplay-launch";
  button.textContent = "Open ThemePlay";
  button.title = "Open the ThemePlay helper window.";
  button.addEventListener("click", () => {
    window.open("themeplay-window.html", "_blank", "width=520,height=700");
    notifyThemePlayAction("open-themeplay");
  });
  return button;
}

function updateThemePlayStatus(message) {
  const status = document.getElementById("themeplay-status");
  if (!status) return;
  status.textContent = message;
}

function attachThemePlayBridge(shell) {
  const actionEvents = {
    "ui:modeChanged": "mode-change",
    "ui:paletteDragStart": "palette-drag",
    "ui:propertyChanged": "property-change",
    "ui:testMotion": "motion-test",
  };

  Object.entries(actionEvents).forEach(([eventName, action]) => {
    shell.addEventListener(eventName, () => notifyThemePlayAction(action));
  });

  window.addEventListener("themeplay:randomize", () => {
    updateThemePlayStatus("ThemePlay asked for a random shake.");
  });

  window.addEventListener("themeplay:preview", () => {
    updateThemePlayStatus("ThemePlay is peeking at Preview Mode.");
    notifyThemePlayAction("preview");
  });

  window.addEventListener("themeplay:export", () => {
    updateThemePlayStatus("ThemePlay wants an export.");
    notifyThemePlayAction("export");
  });

  window.addEventListener("themeplay:action", (event) => {
    if (event.detail === "open-themeplay") {
      updateThemePlayStatus("ThemePlay window is open. Play away!");
    }
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

  const topBarActions = document.createElement("div");
  topBarActions.className = "top-bar-actions";
  topBarActions.appendChild(createThemePlayButton());
  topBarContainer.appendChild(topBarActions);

  const workspace = document.createElement("div");
  workspace.className = "workspace";

  const leftSidebar = buildSidebar("left-sidebar", "Put Stuff Here Later", "Waiting for bins.");
  const centerArea = buildCenterArea();
  const rightSidebar = buildSidebar(
    "right-sidebar",
    "Change This Thing",
    "Pick something and its bits will show here."
  );

  const bottomBar = document.createElement("footer");
  bottomBar.className = "bottom-bar";
  const bottomHeading = document.createElement("h2");
  bottomHeading.className = "panel-heading";
  bottomHeading.textContent = "Stack Of Things";
  bottomBar.appendChild(bottomHeading);

  workspace.appendChild(leftSidebar);
  workspace.appendChild(centerArea);
  workspace.appendChild(rightSidebar);
  workspace.appendChild(bottomBar);

  shell.appendChild(topBarContainer);
  shell.appendChild(workspace);

  app.appendChild(shell);

  attachThemePlayBridge(shell);
}

window.onload = initLayoutShell;
