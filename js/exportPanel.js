const STATUS_MAP = {
  saved: {
    label: "Saved.",
    tooltip: "Your settings are written down.",
  },
  ready: {
    label: "Download Ready.",
    tooltip: "Your file is made. Browser will ask where to put it.",
  },
  error: {
    label: "Something Went Wrong.",
    tooltip: "Saving failed. Try again.",
  },
};

function createButton(label, tooltip, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `export-panel__button ${className}`;
  button.textContent = label;
  button.title = tooltip;
  button.addEventListener("click", () => {
    if (typeof onClick === "function") {
      onClick();
    }
  });
  return button;
}

export function initExportPanel(containerElement, callbacks = {}) {
  if (!containerElement) {
    throw new Error("initExportPanel requires a container element");
  }

  containerElement.classList.add("export-panel");
  containerElement.innerHTML = "";

  const header = document.createElement("div");
  header.className = "export-panel__header";

  const title = document.createElement("h2");
  title.className = "export-panel__title";
  title.textContent = "Take It Out";

  const subtitle = document.createElement("p");
  subtitle.className = "export-panel__subtitle";
  subtitle.textContent = "Save this or get a file you can use.";

  header.append(title, subtitle);

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "export-panel__actions";

  const statusLabel = document.createElement("div");
  statusLabel.className = "export-panel__status";
  statusLabel.textContent = "";

  const dispatchAndRun = (eventName, handler) => () => {
    const event = new CustomEvent(eventName, { bubbles: true });
    containerElement.dispatchEvent(event);
    if (typeof handler === "function") {
      handler();
    }
  };

  const saveProjectButton = createButton(
    "Save Project",
    "Save this as a project so you can open and change it later.",
    "export-panel__button--save",
    dispatchAndRun("ui:saveProject", callbacks.onSaveProject)
  );

  const exportHtmlButton = createButton(
    "Get Web Page Files",
    "Download files that a website can use.",
    "export-panel__button--html",
    dispatchAndRun("ui:exportHTML", callbacks.onExportHTML)
  );

  const exportPngButton = createButton(
    "Get Picture Of This",
    "Download one flat picture of what you see right now.",
    "export-panel__button--png",
    dispatchAndRun("ui:exportPNG", callbacks.onExportPNG)
  );

  const exportJsonButton = createButton(
    "Get Settings Only",
    "Download a tiny file that remembers how you set things up.",
    "export-panel__button--json",
    dispatchAndRun("ui:exportJSON", callbacks.onExportJSON)
  );

  buttonGroup.append(
    saveProjectButton,
    exportHtmlButton,
    exportPngButton,
    exportJsonButton
  );

  containerElement.append(header, buttonGroup, statusLabel);

  function showStatus(statusId) {
    const status = STATUS_MAP[statusId];
    if (status) {
      statusLabel.textContent = status.label;
      statusLabel.title = status.tooltip;
      statusLabel.classList.add("export-panel__status--visible");
    } else {
      statusLabel.textContent = "";
      statusLabel.title = "";
      statusLabel.classList.remove("export-panel__status--visible");
    }
  }

  return { showStatus };
}

export function showStatus(statusId) {
  const panel = document.querySelector(".export-panel");
  if (!panel) return;
  const statusLabel = panel.querySelector(".export-panel__status");
  if (!statusLabel) return;
  const status = STATUS_MAP[statusId];
  if (status) {
    statusLabel.textContent = status.label;
    statusLabel.title = status.tooltip;
    statusLabel.classList.add("export-panel__status--visible");
  } else {
    statusLabel.textContent = "";
    statusLabel.title = "";
    statusLabel.classList.remove("export-panel__status--visible");
  }
}
