export const LlamaRagResponses = {
  colors: [
    "Pick one color. Apply it to the active layer. Swap if it looks wrong.",
    "Use the palette chips. Click one and see if contrast stays readable.",
    "Set a base color, then adjust the border and text to match.",
    "Test a darker variant for borders so the shape stays clear.",
  ],
  layout: [
    "Drop a container, then place cards inside. Keep spacing even.",
    "Use rows for horizontal stacks and columns for tall stacks.",
    "Align items to the grid before tweaking padding.",
    "Add header, body, footer in that order. Fill each with simple blocks.",
  ],
  sizing: [
    "Grab the scale slider. Nudge until it fits the grid cells.",
    "Keep widths consistent. Adjust one, copy the number to others.",
    "Resize first, then move into place. Avoid micro nudges.",
  ],
  layers: [
    "Bring the important layer to the top. Hide what you are not editing.",
    "Lock finished layers so drags do not move them.",
    "Group by depth: foreground, mid, background. Move accordingly.",
  ],
  backgrounds: [
    "Choose one background. If it fights the text, lower its brightness.",
    "Try a gradient. Keep start light and end dark for depth.",
    "Add subtle texture only after colors read clearly.",
  ],
  typography: [
    "Pick one font for headings, one for body. Stick to two sizes first.",
    "Increase line height until blocks breathe. Do not overdo bold.",
    "If text disappears on the photo, add a backing or darker color.",
  ],
  motion: [
    "Apply one motion preset. Test another on a different element.",
    "Remove motion from anything critical to read.",
    "Preview the timeline before exporting.",
  ],
  random: [
    "Try a different palette, then undo if it feels off.",
    "Swap the layout orientation. Columns can become rows.",
    "Pick one element and exaggerate it. Check if the theme still holds.",
  ],
  problems: [
    "Simplify. Remove one element and check if the issue fades.",
    "Reset the colors to defaults, then reapply only two accents.",
    "Start from the last action. Undo and redo to isolate the change.",
  ],
  export: [
    "Preview first. Then export the format you need.",
    "Check contrast and motion before saving the final file.",
    "If files look wrong, reload assets and export again.",
  ],
  unknown: [
    "Say what you want: color, layout, text, motion, or export.",
    "Not sure what you need. Give me a topic like colors or layout.",
  ],
};
