// Fisher-Price Theme Builder Right Properties Panel
// Text is written to feel like "explain like I'm five".

let currentSelection = null;
let panelRoot = null;
const controlRegistry = new Map();

function createDrawer(title, subtitle) {
  const drawer = document.createElement("section");
  drawer.className = "fp-drawer";

  const header = document.createElement("button");
  header.type = "button";
  header.className = "fp-drawer__header";
  header.innerHTML = `
    <div class="fp-drawer__titles">
      <div class="fp-drawer__title">${title}</div>
      <div class="fp-drawer__subtitle">${subtitle}</div>
    </div>
    <span class="fp-drawer__chevron" aria-hidden="true">▼</span>
  `;

  const body = document.createElement("div");
  body.className = "fp-drawer__body";

  header.addEventListener("click", () => {
    drawer.classList.toggle("is-collapsed");
    const chevron = header.querySelector(".fp-drawer__chevron");
    chevron.textContent = drawer.classList.contains("is-collapsed") ? "▶" : "▼";
  });

  drawer.append(header, body);
  return { drawer, body };
}

function dispatchPropertyChange(property, value) {
  if (!currentSelection || !panelRoot) return;
  const detail = { id: currentSelection.id, property, value };
  const event = new CustomEvent("ui:propertyChanged", { detail });
  panelRoot.dispatchEvent(event);
}

function buildSlider(label, tooltip, property, options = {}) {
  const wrapper = document.createElement("label");
  wrapper.className = "fp-control fp-control--slider";
  wrapper.title = tooltip;

  const text = document.createElement("div");
  text.className = "fp-control__label";
  text.textContent = label;

  const input = document.createElement("input");
  input.type = "range";
  input.className = "fp-control__input";
  input.min = options.min ?? 0;
  input.max = options.max ?? 100;
  input.step = options.step ?? 1;
  input.value = options.defaultValue ?? input.min;
  input.dataset.property = property;

  const hints = document.createElement("div");
  hints.className = "fp-control__hints";
  hints.textContent = options.rangeLabel ?? "";

  input.addEventListener("input", () => {
    dispatchPropertyChange(property, parseFloat(input.value));
  });

  controlRegistry.set(property, input);
  wrapper.append(text, input, hints);
  return wrapper;
}

function buildToggle(label, tooltip, property) {
  const wrapper = document.createElement("label");
  wrapper.className = "fp-control fp-control--toggle";
  wrapper.title = tooltip;

  const text = document.createElement("div");
  text.className = "fp-control__label";
  text.textContent = label;

  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.className = "fp-control__toggle";
  toggle.dataset.property = property;

  toggle.addEventListener("change", () => {
    dispatchPropertyChange(property, toggle.checked);
  });

  controlRegistry.set(property, toggle);
  wrapper.append(text, toggle);
  return wrapper;
}

function buildColor(label, tooltip, property, defaultValue = "#cccccc") {
  const wrapper = document.createElement("label");
  wrapper.className = "fp-control fp-control--color";
  wrapper.title = tooltip;

  const text = document.createElement("div");
  text.className = "fp-control__label";
  text.textContent = label;

  const input = document.createElement("input");
  input.type = "color";
  input.className = "fp-control__color";
  input.value = defaultValue;
  input.dataset.property = property;

  input.addEventListener("input", () => {
    dispatchPropertyChange(property, input.value);
  });

  controlRegistry.set(property, input);
  wrapper.append(text, input);
  return wrapper;
}

function buildSelect(label, tooltip, property, options) {
  const wrapper = document.createElement("label");
  wrapper.className = "fp-control fp-control--select";
  wrapper.title = tooltip;

  const text = document.createElement("div");
  text.className = "fp-control__label";
  text.textContent = label;

  const select = document.createElement("select");
  select.className = "fp-control__select";
  select.dataset.property = property;

  options.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    dispatchPropertyChange(property, select.value);
  });

  controlRegistry.set(property, select);
  wrapper.append(text, select);
  return wrapper;
}

function buildButton(label, tooltip, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "fp-button";
  button.textContent = label;
  button.title = tooltip;
  button.addEventListener("click", onClick);
  return button;
}

function buildSizeSpotSection(body) {
  body.append(
    buildSlider("Move Left / Right", "Slide to push this thing sideways.", "positionX", { min: -100, max: 100, defaultValue: 0 }),
    buildSlider("Move Up / Down", "Slide to push this thing up or down.", "positionY", { min: -100, max: 100, defaultValue: 0 }),
    buildSlider("Make It Wider", "Stretch it left and right.", "width", { min: 10, max: 400, defaultValue: 100 }),
    buildSlider("Make It Taller", "Stretch it up and down.", "height", { min: 10, max: 400, defaultValue: 100 }),
    buildSlider("Turn It", "Spin this thing like a sign on a hook.", "rotation", { min: -180, max: 180, defaultValue: 0, step: 1, rangeLabel: "Degrees" }),
    buildSlider("In Front / Behind", "Move this in front of or behind other things.", "layer", { min: -10, max: 10, defaultValue: 0, rangeLabel: "Behind ↔ In Front" }),
    buildToggle("Lock It", "Freeze this thing so you don’t grab it by mistake.", "locked")
  );
}

function buildLookColorSection(body) {
  body.append(
    buildColor("Fill Color", "Paint inside this thing.", "fillColor", "#ffcc66"),
    buildColor("Border Color", "Paint the edge.", "borderColor", "#666666"),
    buildColor("Words Color", "Paint the letters.", "textColor", "#000000"),
    buildSlider("Light Or Dark", "Slide left to fade. Slide right to make it stronger.", "lightness", { min: 0, max: 100, defaultValue: 50 }),
    buildSlider("Sharp Or Blurry", "Slide left to blur. Slide right to make it crisp.", "sharpness", { min: 0, max: 100, defaultValue: 50 }),
    buildSlider("Add Dirt", "Turn this up to make it look older and more used.", "grunge", { min: 0, max: 100, defaultValue: 0 }),
    buildToggle("Add Lines In Background", "Turn this on to show faint lines behind this thing.", "backgroundLines")
  );
}

function buildMoveByItselfSection(body) {
  body.append(
    buildSelect("How it moves by itself", "Pick how this thing moves all by itself.", "motionPreset", [
      { label: "No Movement", value: "none" },
      { label: "Slow Float", value: "float" },
      { label: "Soft Bounce", value: "bounce" },
      { label: "Quick Pop", value: "pop" },
      { label: "Slide In", value: "slide" },
    ]),
    buildSlider("How Much", "Slide to make the movement small or big.", "motionAmount", { min: 0, max: 100, defaultValue: 50 }),
    buildSlider("How Fast", "Slide to make the movement slow or fast.", "motionSpeed", { min: 0, max: 100, defaultValue: 50 }),
    buildToggle("Repeat", "Make this movement happen again and again.", "motionRepeat"),
    buildButton("Test Move", "Play the motion once so you can see it.", () => {
      if (!currentSelection) return;
      const event = new CustomEvent("ui:testMotion", { detail: { id: currentSelection.id } });
      panelRoot?.dispatchEvent(event);
    })
  );
}

export function initRightPanel(containerElement) {
  panelRoot = containerElement;
  panelRoot.classList.add("fp-right-panel");
  panelRoot.innerHTML = "";
  controlRegistry.clear();

  const intro = document.createElement("div");
  intro.className = "fp-intro";
  intro.textContent = "Pick a thing, then slide and tap to change it.";
  panelRoot.appendChild(intro);

  const sizeDrawer = createDrawer("Size & Spot", "Where it sits and how big it is.");
  buildSizeSpotSection(sizeDrawer.body);
  panelRoot.appendChild(sizeDrawer.drawer);

  const lookDrawer = createDrawer("Look & Color", "How it looks.");
  buildLookColorSection(lookDrawer.body);
  panelRoot.appendChild(lookDrawer.drawer);

  const moveDrawer = createDrawer("Move By Itself", "How it moves without you.");
  buildMoveByItselfSection(moveDrawer.body);
  panelRoot.appendChild(moveDrawer.drawer);
}

export function updateRightPanelForSelection(selectedObject) {
  currentSelection = selectedObject;
  if (!selectedObject) return;

  controlRegistry.forEach((input, property) => {
    const value = selectedObject.properties?.[property];
    if (input instanceof HTMLInputElement) {
      if (input.type === "checkbox") {
        input.checked = Boolean(value);
      } else if (input.type === "color") {
        if (typeof value === "string") {
          input.value = value;
        }
      } else {
        if (typeof value === "number") {
          input.value = value;
        }
      }
    }
    if (input instanceof HTMLSelectElement && typeof value === "string") {
      input.value = value;
    }
  });
}
