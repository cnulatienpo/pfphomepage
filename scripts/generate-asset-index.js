#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ASSET_DIRS = [
  'shapes',
  'visual-assets',
  'assets',
  'textures',
  'cursive letters',
  'samples of cursive',
  'thats texture'
];

const EXTENSIONS = /\.(png|jpg|jpeg|webp|svg)$/i;

function scanDir(dir) {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    entries.forEach(entry => {
      if (entry.isFile() && EXTENSIONS.test(entry.name)) {
        const url = `/${dir}/${entry.name}`;
        files.push(url);
      }
    });
  } catch (e) {
    console.warn(`⚠️  Could not scan ${dir}:`, e.message);
  }
  
  return files;
}

const index = {
  generated: new Date().toISOString(),
  assets: []
};

// Scan all directories
ASSET_DIRS.forEach(dir => {
  const found = scanDir(dir);
  console.log(`📁 ${dir}: ${found.length} assets`);
  index.assets.push(...found);
});

// Remove duplicates
index.assets = [...new Set(index.assets)];

console.log(`✅ Total unique assets: ${index.assets.length}`);

// Write to public root so it's served at /assets-index.json
const output = path.join(__dirname, '..', 'assets-index.json');
fs.writeFileSync(output, JSON.stringify(index, null, 2));

console.log(`✓ Wrote ${output}`);
