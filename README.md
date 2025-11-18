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

