#!/usr/bin/env bash
set -euo pipefail

# bootstrap.sh
# Bootstraps a static site project that shows a single full-screen .webp photo as the homepage.
# Works well in a brand-new GitHub Codespace or local machine.

IMG_SRC="${1:-}"
PROJECT_NAME="${PROJECT_NAME:-projects-from-the-projects}"
NODE_VERSION="${NODE_VERSION:-lts/*}"

# ---- helpers ---------------------------------------------------------------
say() { printf "\n\033[1;36m%s\033[0m\n" "$*"; }
warn() { printf "\n\033[1;33m%s\033[0m\n" "$*"; }
die() { printf "\n\033[1;31mERROR:\033[0m %s\n" "$*" ; exit 1; }

# ---- sanity checks ---------------------------------------------------------
[ -z "${IMG_SRC}" ] && die "Provide the path to your .webp image:  bash $0 path/to/photo.webp"
[ ! -f "${IMG_SRC}" ] && die "Image not found: ${IMG_SRC}"
case "${IMG_SRC##*.}" in
  webp|WEBP) ;; 
  *) warn "Provided file is not .webp; continuing anyway." ;;
esac

# ---- ensure git repo -------------------------------------------------------
if [ ! -d .git ]; then
  say "Initializing git repository..."
  git init
fi

# ---- ensure NVM + Node LTS -------------------------------------------------
export NVM_DIR="$HOME/.nvm"

if ! command -v nvm >/dev/null 2>&1; then
  say "Installing nvm..."
  # Temporarily disable strict mode for nvm installation
  set +euo pipefail
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  # shellcheck disable=SC1090
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  set -euo pipefail
else
  # shellcheck disable=SC1090
  set +u
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  set -u
fi

say "Installing Node (${NODE_VERSION})..."
set +u
nvm install "${NODE_VERSION}"
nvm use "${NODE_VERSION}"
set -u

# ---- npm + vite ------------------------------------------------------------
if [ ! -f package.json ]; then
  say "Creating package.json..."
  npm init -y >/dev/null
  npm pkg set name="${PROJECT_NAME}" >/dev/null
  npm pkg set private=true >/dev/null
  npm pkg set type="module" >/dev/null
fi

say "Adding dev tools (vite)..."
npm i -D vite >/dev/null

# Optional: install three for later steps (3D work). Safe to remove if you want super-minimal.
say "Installing 'three' (optional, for future 3D steps)..."
npm i three >/dev/null || warn "Could not install 'three' (continuing)."

# Add scripts
say "Configuring npm scripts..."
npm pkg set scripts.dev="vite"
npm pkg set scripts.build="vite build"
npm pkg set scripts.preview="vite preview"

# ---- project structure -----------------------------------------------------
say "Creating folders..."
mkdir -p assets fonts src

TARGET_IMG="assets/front-page.webp"
say "Copying image → ${TARGET_IMG}"
cp -f "${IMG_SRC}" "${TARGET_IMG}"

# ---- index.html ------------------------------------------------------------
say "Writing index.html (full-screen photo)..."
cat > index.html <<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title></title>
  <meta name="description" content="A single photograph fills the entire page." />
  <link rel="preload" as="image" href="/assets/front-page.webp">
  <style>
    /* Fill the window; no scrollbars or gutters */
    html, body { height: 100%; margin: 0; background: #000; }
    .stage { position: fixed; inset: 0; overflow: hidden; }
    #hero {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;        /* cover = fill + crop */
      object-position: center;  /* crop from center */
      image-rendering: auto;
      display: block;
      /* If you want upside-down, uncomment the next line */
      /* transform: rotate(180deg); */
    }
  </style>
</head>
<body>
  <div class="stage">
    <img
      id="hero"
      src="/assets/front-page.webp"
      alt="A full-screen photograph fills the page."
      decoding="async"
      fetchpriority="high"
    />
  </div>
</body>
</html>
HTML

# ---- vite config (optional but nice to have) -------------------------------
say "Writing vite.config.js..."
cat > vite.config.js <<'JS'
import { defineConfig } from 'vite'
export default defineConfig({
  server: { host: true, port: 5173, strictPort: false },
  preview: { host: true, port: 4173 },
  build: { outDir: 'dist', assetsDir: 'assets' }
})
JS

# ---- README ---------------------------------------------------------------
say "Writing README.md..."
cat > README.md <<'MD'
# Photo-Only Homepage

This site renders a single full-screen photograph as the entire homepage.  
Built as a static site suitable for Render Static Sites.

## Commands

- `npm run dev` — start local dev server (Vite)
- `npm run build` — build to `dist/`
- `npm run preview` — preview the production build locally

## Files

- `index.html` — displays `/assets/front-page.webp` full-screen
- `assets/front-page.webp` — your photograph
- `vite.config.js` — Vite config (build → `dist/`)

## Deploy to Render (Static Site)

1. Push this repo to GitHub/GitLab.
2. In Render: **New → Static Site → connect this repo**.
3. **Build Command:** `npm run build`
4. **Publish Directory:** `dist`
5. Deploy. (Render auto-redeploys on push.)

## Notes

- To show the image upside-down, open `index.html` and **uncomment** the CSS line:
  `transform: rotate(180deg);`

MD

# ---- gitignore -------------------------------------------------------------
say "Writing .gitignore..."
cat > .gitignore <<'GIT'
node_modules
dist
.DS_Store
.vscode
GIT

# ---- initial commit --------------------------------------------------------
if git rev-parse --git-dir >/dev/null 2>&1; then
  say "Creating initial commit..."
  git add .
  git commit -m "Bootstrap static photo homepage (Vite + full-screen .webp)"
fi

say "Done. Next steps:"
echo "  1) npm run dev       # start local server (Codespace forwards port)"
echo "  2) Open the forwarded port in the browser to see the photo"
echo "  3) npm run build     # produce dist/ for Render"
echo "  4) Connect repo to Render Static Site (publish dir = dist)"
