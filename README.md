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

## Python environment setup

Use the provided virtual environment helpers to keep Python from switching interpreters in your Codespace.

1. Run the setup script from the repository root:
   ```bash
   ./setup_env.sh
   ```
   The script is idempotent and will reuse the existing `env` virtual environment if it already exists.
2. Activate the environment before running any Python script:
   ```bash
   source env/bin/activate
   ```
3. Verify the environment is active by checking the Python executable path:
   ```bash
   python -c "import sys; print(sys.executable)"
   ```
   The output should end with `/env/bin/python`.
4. If a Codespace opens without activation, simply run `source env/bin/activate` in the terminal before executing scripts. Add the `add_env_guard.py` snippet to scripts to enforce activation, and use `import_guard.py` to confirm required packages are installed.

