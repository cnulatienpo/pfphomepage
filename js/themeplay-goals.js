export const ThemePlayGoals = [
  { id: "start-drag-one", text: "Drag one thing onto the page", group: "Start Playing" },
  { id: "start-drag-three", text: "Drag three different elements onto the page", group: "Start Playing" },
  { id: "start-resize", text: "Resize one element", group: "Start Playing" },
  { id: "start-move", text: "Move one element to a new place", group: "Start Playing" },
  { id: "start-delete", text: "Delete something you added", group: "Start Playing" },
  { id: "start-undo", text: "Undo something", group: "Start Playing" },
  { id: "start-redo", text: "Redo something", group: "Start Playing" },
  { id: "start-snap", text: "Try snapping an element into alignment", group: "Start Playing" },

  { id: "colors-fill", text: "Change a fill color", group: "Colors & Palettes" },
  { id: "colors-text", text: "Change text color", group: "Colors & Palettes" },
  { id: "colors-border", text: "Change border color", group: "Colors & Palettes" },
  { id: "colors-harmony", text: "Apply three colors that belong together", group: "Colors & Palettes" },
  { id: "colors-random-palette", text: "Try one random palette", group: "Colors & Palettes" },
  { id: "colors-favorite", text: "Save a palette as favorite", group: "Colors & Palettes" },
  { id: "colors-contrast", text: "Use readable contrast", group: "Colors & Palettes" },
  { id: "colors-global-variable", text: "Adjust one global color variable", group: "Colors & Palettes" },

  { id: "layout-header", text: "Create a header section", group: "Layout Play" },
  { id: "layout-content", text: "Create a content section", group: "Layout Play" },
  { id: "layout-footer", text: "Create a footer section", group: "Layout Play" },
  { id: "layout-row-column", text: "Use a row or column block", group: "Layout Play" },
  { id: "layout-even-spacing", text: "Place elements evenly spaced", group: "Layout Play" },
  { id: "layout-stack-cards", text: "Stack three cards", group: "Layout Play" },
  { id: "layout-spacing-controls", text: "Use padding or margin sliders", group: "Layout Play" },
  { id: "layout-two-column", text: "Create a two-column layout", group: "Layout Play" },

  { id: "type-change-font", text: "Change a font", group: "Typography Play" },
  { id: "type-change-size", text: "Change font size", group: "Typography Play" },
  { id: "type-hierarchy", text: "Create hierarchy: title > heading > body", group: "Typography Play" },
  { id: "type-weight", text: "Try a different letter weight", group: "Typography Play" },
  { id: "type-pairing", text: "Use one consistent font pairing", group: "Typography Play" },
  { id: "type-readability", text: "Fix readability over a background", group: "Typography Play" },

  { id: "background-choose", text: "Choose a background", group: "Backgrounds & Texture" },
  { id: "background-gradient", text: "Add a gradient", group: "Backgrounds & Texture" },
  { id: "background-texture", text: "Add a soft texture", group: "Backgrounds & Texture" },
  { id: "background-random", text: "Try a random background", group: "Backgrounds & Texture" },
  { id: "background-brightness", text: "Adjust background brightness", group: "Backgrounds & Texture" },

  { id: "motion-preset-one", text: "Add a motion preset to one element", group: "Motion & Movement" },
  { id: "motion-preset-two", text: "Add a different motion preset to another", group: "Motion & Movement" },
  { id: "motion-remove", text: "Remove motion from something", group: "Motion & Movement" },
  { id: "motion-action", text: "Make something bounce, float, slide, or fade", group: "Motion & Movement" },
  { id: "motion-preview", text: "Preview motion in Preview Mode", group: "Motion & Movement" },
];

export function getThemePlayGoalById(id) {
  return ThemePlayGoals.find((goal) => goal.id === id);
}

export function getThemePlayGoalsByGroup(group) {
  return ThemePlayGoals.filter((goal) => goal.group === group);
}
