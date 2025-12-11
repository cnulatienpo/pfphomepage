// HistoryPanel.tsx
// Tiny UI for undo/redo actions. Plug directly into your UndoStack instance.

import React from "react";

export default function HistoryPanel({ undoStack, glyphs, onChange }) {
  function handleUndo() {
    if (!undoStack.canUndo()) return;
    const updated = undoStack.undo(glyphs);
    onChange(updated);
  }

  function handleRedo() {
    if (!undoStack.canRedo()) return;
    const updated = undoStack.redo(glyphs);
    onChange(updated);
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        marginTop: "1rem",
        padding: "0.5rem",
        background: "#f2f2f2",
        border: "1px solid #ccc",
        borderRadius: "6px",
        width: "fit-content"
      }}
    >
      <button
        onClick={handleUndo}
        disabled={!undoStack.canUndo()}
        style={{
          padding: "0.4rem 0.8rem",
          fontWeight: 700,
          opacity: undoStack.canUndo() ? 1 : 0.5
        }}
      >
        undo
      </button>

      <button
        onClick={handleRedo}
        disabled={!undoStack.canRedo()}
        style={{
          padding: "0.4rem 0.8rem",
          fontWeight: 700,
          opacity: undoStack.canRedo() ? 1 : 0.5
        }}
      >
        redo
      </button>
    </div>
  );
}
