// Fisher-Price Theme Builder - Material Loader
// Loads creative-material/asset-map.json and exposes categorized material utilities.

const defaultCategories = [
  'textures',
  'marks',
  'shapes',
  'patterns',
  'warped',
  'collage',
  'styles'
];

const categoryAliases = {
  texture: 'textures',
  mark: 'marks',
  shape: 'shapes',
  pattern: 'patterns',
  warp: 'warped',
  warped: 'warped',
  collage: 'collage',
  style: 'styles',
  procedural: 'textures',
  variations: 'textures'
};

function inferCategory(entry = {}) {
  const tagged = entry.category || entry.type || entry.kind;
  if (tagged && categoryAliases[tagged]) return categoryAliases[tagged];
  const path = entry.path || entry.preview || '';
  const lowered = path.toLowerCase();
  const guess = Object.keys(categoryAliases).find(key => lowered.includes(key));
  if (guess) return categoryAliases[guess];
  return 'textures';
}

function normalizeEntry(entry = {}) {
  const category = inferCategory(entry);
  const id = entry.id || `${category}-${entry.name || entry.path || Math.random().toString(36).slice(2)}`;
  const preview = entry.preview || entry.thumbnail || entry.path;
  const src = entry.path || entry.src || preview;
  return {
    id,
    name: entry.name || id,
    category,
    tags: entry.tags || [],
    path: src,
    preview,
    meta: entry.meta || {},
    variation: entry.variation || entry.variant || null
  };
}

class MaterialLoader {
  static _materials = [];
  static _byCategory = {};
  static _byId = new Map();
  static _preloaded = new Map();
  static _ready = false;

  static async init(assetMapUrl = 'creative-material/asset-map.json') {
    if (MaterialLoader._ready) return;
    const res = await fetch(assetMapUrl);
    if (!res.ok) throw new Error(`Failed to load asset map: ${res.status}`);
    const raw = await res.json();
    const entries = Array.isArray(raw.assets) ? raw.assets : Array.isArray(raw) ? raw : [];
    MaterialLoader._materials = entries.map(normalizeEntry);

    defaultCategories.forEach(cat => {
      MaterialLoader._byCategory[cat] = [];
    });

    MaterialLoader._materials.forEach(mat => {
      if (!MaterialLoader._byCategory[mat.category]) {
        MaterialLoader._byCategory[mat.category] = [];
      }
      MaterialLoader._byCategory[mat.category].push(mat);
      MaterialLoader._byId.set(mat.id, mat);
    });

    // Preload previews for snappy UI
    const preloadPromises = MaterialLoader._materials
      .filter(mat => mat.preview)
      .map(mat => MaterialLoader._preload(mat.preview));
    await Promise.allSettled(preloadPromises);
    MaterialLoader._ready = true;
  }

  static async _preload(url) {
    if (!url || MaterialLoader._preloaded.has(url)) return;
    const img = new Image();
    const loaded = new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
    });
    img.src = url;
    MaterialLoader._preloaded.set(url, img);
    return loaded;
  }

  static _randomFrom(category) {
    const list = MaterialLoader._byCategory[category] || [];
    if (!list.length) return null;
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
  }

  static getRandomTexture() {
    return MaterialLoader._randomFrom('textures');
  }

  static getRandomPattern() {
    return MaterialLoader._randomFrom('patterns');
  }

  static getAll(type) {
    return MaterialLoader._byCategory[type] ? [...MaterialLoader._byCategory[type]] : [];
  }

  static findById(id) {
    return MaterialLoader._byId.get(id) || null;
  }

  static getPreviewUrl(id) {
    const mat = MaterialLoader.findById(id);
    return mat ? mat.preview || mat.path : null;
  }
}

export default MaterialLoader;
