// registerFontMakerRoute.js
// Small helper for Codex to wire into your router or menu.

export function registerFontMakerRoute(app) {
  app.addRoute({
    path: "/font-maker",
    label: "Fonts",
    element: "<FontMakerRoute />"
  });
}
