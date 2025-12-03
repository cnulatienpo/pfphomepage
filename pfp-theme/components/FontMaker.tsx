// FontMaker.tsx
// Main React UI for the Font Maker tool.
// Integrates all editor panels, persistence, and theme hand-off.

import React, { useEffect, useMemo, useRef, useState } from "react";
import GlyphGrid from "@components/GlyphGrid";
import GlyphControls from "@fontmaker/controls/GlyphControls";
import BatchActions from "@fontmaker/controls/BatchActions";
import GlyphTagEditor from "@fontmaker/editor/GlyphTagEditor";
import HistoryPanel from "@fontmaker/editor/HistoryPanel";
import PaperBackgroundEditor from "@fontmaker/editor/PaperBackgroundEditor";
import FontPreviewCanvas from "@fontmaker/editor/FontPreviewCanvas";
import FontMetadataForm from "@components/FontMetadataForm";
import { loadSvg } from "@engine/loadSvg";
import { buildFont } from "@engine/buildFont";
import { loadFontIntoPage } from "@engine/FontLoader";
import { SettingsStore } from "@engine/SettingsStore";
import { UndoStack } from "@engine/UndoStack";
import { buildFontPackage } from "@engine/FontPackager";
import { setupPaper } from "@engine/paperSetup";

const DEFAULT_METADATA = {
  fontName: "NotebookFont",
  styleName: "Regular",
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  padding: 50,
};

function serializeGlyphs(glyphs) {
  const out = {};
  const paper = setupPaper();
  Object.entries(glyphs || {}).forEach(([char, shape]) => {
    if (shape && typeof shape.exportJSON === "function") {
      out[char] = shape.exportJSON({ asString: true });
    }
  });
  return out;
}

function deserializeGlyphs(data) {
  const paper = setupPaper();
  const out = {};
  Object.entries(data || {}).forEach(([char, json]) => {
    try {
      const imported = paper.project.importJSON(json);
      out[char] = imported;
    } catch (err) {
      console.warn("Could not restore glyph", char, err);
    }
  });
  return out;
}

export default function FontMaker({ onApplyFont }) {
  const [glyphs, setGlyphs] = useState({});
  const [tags, setTags] = useState({});
  const [metadata, setMetadata] = useState(DEFAULT_METADATA);
  const [previewText, setPreviewText] = useState("Type something!");
  const [paperBackground, setPaperBackground] = useState(null);
  const [fontObj, setFontObj] = useState(null);
  const [lastUsedFontName, setLastUsedFontName] = useState("NotebookFont");

  const undoStack = useRef(new UndoStack());
  const fileInputRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const letters = useMemo(() => Object.keys(glyphs).sort(), [glyphs]);

  useEffect(() => {
    const saved = SettingsStore.load();
    if (saved.glyphs) {
      setGlyphs(deserializeGlyphs(saved.glyphs));
    }
    if (saved.tags) setTags(saved.tags);
    if (saved.metadata) setMetadata({ ...DEFAULT_METADATA, ...saved.metadata });
    if (saved.background) setPaperBackground(saved.background);
    if (saved.lastUsedFontName) setLastUsedFontName(saved.lastUsedFontName);
  }, []);

  useEffect(() => {
    SettingsStore.save({
      glyphs: serializeGlyphs(glyphs),
      tags,
      metadata,
      background: paperBackground,
      lastUsedFontName,
    });
  }, [glyphs, tags, metadata, paperBackground, lastUsedFontName]);

  useEffect(() => {
    if (Object.keys(glyphs).length === 0) {
      setFontObj(null);
      return;
    }
    const previewFont = buildFont(glyphs, metadata);
    setFontObj(previewFont);
  }, [glyphs, metadata]);

  async function handleSvgUpload(e) {
    const files = Array.from(e.target.files || []);
    const newGlyphs = { ...glyphs };

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const charName = file.name.replace(".svg", "");
        const char = charName.length === 1 ? charName : null;
        if (!char) return;

        try {
          const svgData = typeof ev.target?.result === "string" ? ev.target.result : "";
          const shape = await loadSvg(svgData);
          const prev = newGlyphs[char] || null;
          newGlyphs[char] = shape;
          undoStack.current.push(char, prev, shape);
          setGlyphs({ ...newGlyphs });
        } catch (err) {
          console.error("Could not load:", file.name, err);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function updateGlyph(char, newShape) {
    const prev = glyphs[char] || null;
    const updated = { ...glyphs };
    if (newShape) {
      updated[char] = newShape;
    } else {
      delete updated[char];
    }
    undoStack.current.push(char, prev, newShape || null);
    setGlyphs(updated);
  }

  function handleGridUpdate(updated, char, newShape) {
    if (char) {
      undoStack.current.push(char, glyphs[char] || null, newShape || null);
    }
    setGlyphs(updated);
  }

  function deleteGlyph(char) {
    updateGlyph(char, null);
  }

  function changeTags(char, newTags) {
    setTags({ ...tags, [char]: newTags });
  }

  function applyBatch(updatedGlyphs) {
    const snapshot = { ...glyphs };
    Object.entries(updatedGlyphs).forEach(([char, shape]) => {
      undoStack.current.push(char, snapshot[char] || null, shape || null);
    });
    setGlyphs(updatedGlyphs);
  }

  async function buildAndUseFont() {
    if (!Object.keys(glyphs).length) return;

    const font = fontObj || buildFont(glyphs, metadata);
    setFontObj(font);

    const fontName =
      loadFontIntoPage(font, metadata.fontName || lastUsedFontName) ||
      metadata.fontName;

    setLastUsedFontName(fontName || metadata.fontName);
    if (onApplyFont) onApplyFont(fontName || metadata.fontName);

    const pkg = await buildFontPackage({
      fontObj: font,
      metadata,
      tags,
      glyphs,
      previewCanvas: previewCanvasRef.current,
    });
    SettingsStore.save({ lastPackage: pkg, lastUsedFontName: fontName });
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 900, margin: 0 }}>
            Font Maker
          </h1>
          <p style={{ marginTop: "0.25rem", color: "#666" }}>
            Upload SVG glyphs, sculpt them, and stream the finished font into your theme.
          </p>
        </div>
        <div style={{ alignSelf: "center" }}>
          <button
            style={{ padding: "0.8rem 1rem", fontWeight: 700 }}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload SVG letters
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg"
            multiple
            style={{ display: "none" }}
            onChange={handleSvgUpload}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <h2 style={{ marginBottom: "0.5rem" }}>Your Letters</h2>
            <GlyphGrid glyphs={glyphs} onUpdate={handleGridUpdate} />
          </div>

          <BatchActions glyphs={glyphs} onChange={applyBatch} />
          <HistoryPanel
            undoStack={undoStack.current}
            glyphs={glyphs}
            onChange={(g) => setGlyphs(g)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <FontMetadataForm metadata={metadata} onChange={setMetadata} />
          <div>
            <label style={{ fontWeight: 700 }}>Preview text</label>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </div>
          <FontPreviewCanvas
            fontObj={fontObj}
            previewText={previewText}
            onUse={buildAndUseFont}
            canvasRef={previewCanvasRef}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          padding: "1rem",
          border: "1px solid #ddd",
          borderRadius: "8px",
          background: paperBackground ? `url(${paperBackground})` : "#f9f9f9",
        }}
      >
        {letters.map((char) => (
          <div
            key={char}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              alignItems: "center",
              padding: "0.5rem",
              background: "rgba(255,255,255,0.9)",
              border: "1px solid #eee",
              borderRadius: "8px",
            }}
          >
            <GlyphControls
              char={char}
              shape={glyphs[char]}
              onChange={updateGlyph}
              onDelete={deleteGlyph}
            />
            <GlyphTagEditor char={char} tags={tags} onChange={changeTags} />
          </div>
        ))}
      </div>

      <PaperBackgroundEditor onSave={(data) => setPaperBackground(data)} />

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={buildAndUseFont}
          style={{ padding: "0.9rem 1.2rem", fontSize: "1rem", fontWeight: 800 }}
          disabled={!Object.keys(glyphs).length}
        >
          Use in the theme
        </button>
      </div>
    </div>
  );
}
