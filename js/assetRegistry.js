/**
 * Hybrid Asset Registry
 * ---------------------
 * Modern bucket system + Legacy `assetRegistry` object
 * so existing UI imports DO NOT BREAK.
 */

let INDEX = null;

// Master buckets the UI panels expect
const BUCKETS = {
  backgrounds: [],
  textures: [],
  scratches: [],
  stickers: [],
  shapes: [],
  photos: [],
  misc: []
};

// Rules for categorizing files
const RULES = [
  { bucket: "backgrounds", re: /(background|paper|wall|backdrop|sky|flat)/i },
  { bucket: "textures",    re: /(texture|grain|fabric|metal|wood|surface|material|pattern)/i },
  { bucket: "scratches",   re: /(scratch|dust|dirt|grunge|damage)/i },
  { bucket: "stickers",    re: /(sticker|glyph|label|badge|mark|scribble)/i },
  { bucket: "shapes",      re: /(shape|frame|border|box|circle|rect|panel)/i },
  { bucket: "photos",      re: /(photo|scan|camera|jpeg|jpg)/i }
];

const THUMB_CACHE = new Map();

/**
 * Load assets-index.json (created by Node indexer)
 */
async function loadAssets() {
  if (INDEX) return INDEX;

  try {
    const res = await fetch("/assets-index.json");
    INDEX = await res.json();
  } catch (err) {
    console.error("❌ Could not load assets-index.json", err);
    INDEX = { assets: [] };
  }

  categorize();
  window.dispatchEvent(new CustomEvent("assets:ready"));
  return INDEX;
}

/**
 * Bucket everything
 */
function categorize() {
  // reset buckets
  for (const k of Object.keys(BUCKETS)) BUCKETS[k] = [];

  for (const file of INDEX.assets) {
    let placed = false;

    for (const rule of RULES) {
      if (rule.re.test(file)) {
        BUCKETS[rule.bucket].push(file);
        placed = true;
        break;
      }
    }

    if (!placed) BUCKETS.misc.push(file);
  }
}

/**
 * Thumbnail loader
 */
async function getThumbnail(url) {
  if (THUMB_CACHE.has(url)) return THUMB_CACHE.get(url);

  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectURL = URL.createObjectURL(blob);
    THUMB_CACHE.set(url, objectURL);
    return objectURL;
  } catch (e) {
    console.warn("⚠️ Thumbnail failed:", url, e);
    return null;
  }
}

/**
 * Summary helper
 */
function summarizeBuckets() {
  const out = {};
  for (const k of Object.keys(BUCKETS)) {
    out[k] = BUCKETS[k].length;
  }
  return out;
}

/**
 * 🔥 LEGACY-COMPATIBLE WRAPPER OBJECT
 * This object matches the old API the UI imports.
 */
export const assetRegistry = {
  load: loadAssets,
  getAll: () => INDEX?.assets || [],
  getByCategory: cat => BUCKETS[cat] || [],
  getThumbnail,
  getSummary: summarizeBuckets,
  buckets: BUCKETS,
};

/**
 * Also export modern API for new code
 */
export {
  loadAssets,
  getThumbnail,
  summarizeBuckets,
  BUCKETS,
};

// Auto-initialize in browser, but defer to let listeners register first
if (typeof window !== "undefined") {
  // Wait until DOMContentLoaded to ensure all event listeners are registered
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      loadAssets();
    });
  } else {
    // DOM already loaded, load immediately
    loadAssets();
  }
}
