const BIN_DATA = [
  {
    id: "big-boxes",
    title: "Big Boxes",
    subtitle: "Big shapes everything sits inside.",
    tooltip: "Drop these when you want big areas.",
    items: [
      { id: "big-box", label: "Big Box", tooltip: "Drop a big box you can fill with stuff." },
      { id: "row-of-stuff", label: "Row Of Stuff", tooltip: "Drop a line of things side-by-side." },
      { id: "stack-of-stuff", label: "Stack Of Stuff", tooltip: "Drop a pile of things one on top of another." },
      { id: "header-bar", label: "Header Bar", tooltip: "Drop a bar for a title at the top." },
      { id: "side-bar", label: "Side Bar", tooltip: "Drop a skinny box on the side for extra stuff." },
      { id: "card", label: "Card", tooltip: "Drop a small box for a little thought or item." }
    ]
  },
  {
    id: "words",
    title: "Words",
    subtitle: "Boxes that hold letters.",
    tooltip: "Drop these in when you want to write on the page.",
    items: [
      { id: "big-title-words", label: "Big Title Words", tooltip: "Use this for loud, big words at the top." },
      { id: "normal-reading-words", label: "Normal Reading Words", tooltip: "Use this for the main text people read." },
      { id: "tiny-helper-words", label: "Tiny Helper Words", tooltip: "Use this for labels and little hints." }
    ]
  },
  {
    id: "stickers",
    title: "Stickers",
    subtitle: "Pictures that sit on top.",
    tooltip: "These are like stickers you can move around.",
    items: [
      { id: "arrow-sticker", label: "Arrow Sticker", tooltip: "Points at something." },
      { id: "warning-sign", label: "Warning Sign", tooltip: "Makes this spot look important or dangerous." },
      { id: "scratch-mark", label: "Scratch Mark", tooltip: "Adds a rough scrape on top." }
    ]
  },
  {
    id: "backgrounds",
    title: "Backgrounds",
    subtitle: "Pictures behind everything.",
    tooltip: "These fill the floor and the walls.",
    items: [
      { id: "concrete-floor", label: "Concrete Floor", tooltip: "Flat grey floor behind everything." },
      { id: "yard-map", label: "Yard Map", tooltip: "Lines and labels behind everything." },
      { id: "dark-wall", label: "Dark Wall", tooltip: "Makes the board feel like a room." }
    ]
  },
  {
    id: "dust-scratches",
    title: "Dust & Scratches",
    subtitle: "Dirt, grain, and damage.",
    tooltip: "Makes things look old and used.",
    items: [
      { id: "dust", label: "Dust", tooltip: "Adds tiny dots like an old photo." },
      { id: "scratches", label: "Scratches", tooltip: "Adds lines like something scraped it." },
      { id: "blur-edges", label: "Blur Edges", tooltip: "Makes the edges softer, like fog." }
    ]
  }
];

function createItemElement(item, container) {
  const element = document.createElement("div");
  element.className = "sidebar-item";
  element.textContent = item.label;
  element.title = item.tooltip;
  element.setAttribute("draggable", "true");
  element.dataset.itemId = item.id;

  element.addEventListener("dragstart", (event) => {
    element.classList.add("dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("text/plain", item.id);
    }
    const detail = { type: item.id, id: item.id };
    container.dispatchEvent(new CustomEvent("ui:paletteDragStart", { detail }));
  });

  element.addEventListener("dragend", (event) => {
    element.classList.remove("dragging");
    const dropEffect = event.dataTransfer ? event.dataTransfer.dropEffect : "none";
    if (dropEffect === "none") {
      const detail = { type: item.id, id: item.id };
      container.dispatchEvent(new CustomEvent("ui:paletteDragCancel", { detail }));
    }
  });

  return element;
}

function createBinElement(bin, container) {
  const binEl = document.createElement("section");
  binEl.className = "sidebar-bin";

  const header = document.createElement("header");
  header.className = "bin-header";
  header.title = bin.tooltip;

  const titleRow = document.createElement("div");
  titleRow.className = "bin-title-row";

  const toggleBtn = document.createElement("button");
  toggleBtn.className = "bin-toggle";
  toggleBtn.type = "button";
  toggleBtn.setAttribute("aria-expanded", "true");
  toggleBtn.setAttribute("aria-label", `Toggle ${bin.title}`);
  toggleBtn.textContent = "▾";

  const title = document.createElement("div");
  title.className = "bin-title";
  title.textContent = bin.title;

  titleRow.appendChild(toggleBtn);
  titleRow.appendChild(title);

  const subtitle = document.createElement("div");
  subtitle.className = "bin-subtitle";
  subtitle.textContent = bin.subtitle;

  header.appendChild(titleRow);
  header.appendChild(subtitle);

  const itemsContainer = document.createElement("div");
  itemsContainer.className = "bin-items";

  bin.items.forEach((item) => {
    const itemEl = createItemElement(item, container);
    itemsContainer.appendChild(itemEl);
  });

  toggleBtn.addEventListener("click", () => {
    const isCollapsed = itemsContainer.classList.toggle("collapsed");
    toggleBtn.textContent = isCollapsed ? "▸" : "▾";
    toggleBtn.setAttribute("aria-expanded", (!isCollapsed).toString());
  });

  header.addEventListener("click", (event) => {
    if (event.target === toggleBtn) return;
    toggleBtn.click();
  });

  binEl.appendChild(header);
  binEl.appendChild(itemsContainer);

  return binEl;
}

export function initLeftSidebar(containerElement) {
  if (!containerElement) return null;
  containerElement.innerHTML = "";
  containerElement.classList.add("left-sidebar");

  const list = document.createElement("div");
  list.className = "sidebar-bins";

  BIN_DATA.forEach((bin) => {
    const binEl = createBinElement(bin, containerElement);
    list.appendChild(binEl);
  });

  containerElement.appendChild(list);
  return containerElement;
}

export default initLeftSidebar;
