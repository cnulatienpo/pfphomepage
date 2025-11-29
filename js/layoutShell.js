import { initTopBar } from "./topBar.js";

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

  center.appendChild(title);
  center.appendChild(help);

  return center;
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
}

window.onload = initLayoutShell;
