# Visual Assets Output

This directory is populated by `generate-visual-assets.js`. The script scans the `assets/construction-theme` and `assets/constuction-theme` directories, converts CSS rules and images into visual assets, and deposits them into the subfolders below.

The subdirectories are pre-created as placeholders so the tree is ready for script output:

- `borders/`
- `boxes/`
- `colors/`
- `grids/`
- `spacing/`
- `marks/`
- `textures/`
- `shapes/`
- `components/`
- `glyphs/`

Running the script will also refresh `asset-map.json` alongside this README.

## Usage

1. Install dependencies so the canvas renderer and CSS parser are available:

   ```bash
   npm install
   ```

2. Generate the assets into the prepared subdirectories:

   ```bash
   node generate-visual-assets.js
   ```

3. Load the resulting PNG or SVG files directly into your theme builder, or ingest the metadata in `asset-map.json`.

If you want to start fresh, delete the contents of the subfolders (leave the folders intact) and rerun the script.
