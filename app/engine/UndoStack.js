// UndoStack.js
// Simple undo/redo stack system for glyph shape edits.
// Stores cloned shapes per letter so state always stays consistent.

import { setupPaper } from "./paperSetup";

export class UndoStack {
  constructor() {
    this.history = [];      // [{ char, prevShape, newShape }]
    this.position = -1;     // current pointer
  }

  push(char, prevShape, newShape) {
    const paper = setupPaper();

    const prevClone = prevShape ? prevShape.clone() : null;
    const newClone = newShape ? newShape.clone() : null;

    // Remove anything ahead of the pointer (standard undo behavior)
    if (this.position < this.history.length - 1) {
      this.history = this.history.slice(0, this.position + 1);
    }

    this.history.push({ char, prevShape: prevClone, newShape: newClone });
    this.position = this.history.length - 1;
  }

  canUndo() {
    return this.position >= 0;
  }

  canRedo() {
    return this.position < this.history.length - 1;
  }

  undo(glyphs) {
    if (!this.canUndo()) return glyphs;

    const paper = setupPaper();
    const record = this.history[this.position];
    this.position--;

    const out = { ...glyphs };
    if (record.prevShape) {
      out[record.char] = record.prevShape.clone();
    } else {
      delete out[record.char];
    }

    return out;
  }

  redo(glyphs) {
    if (!this.canRedo()) return glyphs;

    this.position++;
    const paper = setupPaper();
    const record = this.history[this.position];

    const out = { ...glyphs };
    if (record.newShape) {
      out[record.char] = record.newShape.clone();
    } else {
      delete out[record.char];
    }

    return out;
  }
}
