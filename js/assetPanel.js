/**
 * AssetPanel.js
 * Displays visual materials in the left drawer.
 * Works with the hybrid assetRegistry.
 */

import { assetRegistry } from "./assetRegistry.js";

export class AssetPanel {
  constructor(containerSelector = "#asset-panel") {
    this.container = document.querySelector(containerSelector);
    this.categories = [
      { name: "Backgrounds", key: "backgrounds" },
      { name: "Textures", key: "textures" },
      { name: "Scratches", key: "scratches" },
      { name: "Stickers", key: "stickers" },
      { name: "Shapes", key: "shapes" },
      { name: "Photos", key: "photos" },
      { name: "Misc", key: "misc" },
    ];

    this.renderEmpty();
    window.addEventListener("assets:ready", () => this.render());
  }

  /**
   * Initial placeholder UI before assets load
   */
  renderEmpty() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="asset-panel-loading">
        <p>Loading materials…</p>
      </div>
    `;
  }

  /**
   * Render categories + thumbnails
   */
  async render() {
    if (!this.container) return;

    const summary = assetRegistry.getSummary();
    const htmlParts = [];

    for (const cat of this.categories) {
      const items = assetRegistry.getByCategory(cat.key);

      htmlParts.push(`
        <div class="asset-group">
          <div class="asset-group-title">${cat.name} (${items.length})</div>
          <div class="asset-grid" data-bucket="${cat.key}">
            ${await this.renderThumbnails(items)}
          </div>
        </div>
      `);
    }

    this.container.innerHTML = htmlParts.join("");

    this.enableDragging();
  }

  /**
   * Render thumbnails for one category
   */
  async renderThumbnails(items) {
    const chunks = [];

    for (const item of items) {
      const thumb = await assetRegistry.getThumbnail(item);

      chunks.push(`
        <div class="asset-thumb"
             draggable="true"
             data-url="${item}"
             style="background-image:url('${thumb}');">
        </div>
      `);
    }

    return chunks.join("");
  }

  /**
   * Make thumbnails draggable into the Play Area
   */
  enableDragging() {
    const thumbs = this.container.querySelectorAll(".asset-thumb");

    thumbs.forEach(el => {
      el.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text/plain", el.dataset.url);
        e.dataTransfer.dropEffect = "copy";
      });
    });
  }
}

// Auto-initialize if used directly in browser
if (typeof window !== "undefined") {
  window.AssetPanel = AssetPanel;
}
export default AssetPanel;
