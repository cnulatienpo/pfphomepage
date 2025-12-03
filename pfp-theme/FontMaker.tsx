// FontMaker.tsx
// Main React UI for the Font Maker tool.
// Uses playful workshop language and pipes into engine scripts.

import React, { useState, useRef } from "react";
import { loadSvg } from "@engine/loadSvg";
import { buildFont } from "@engine/buildFont";
import { exportFont } from "@engine/exportFont";
import { download } from "@engine/download";
import {
  makeThicker,
  makeThinner,
  stretchTaller,
  squishShorter,
  nudge,
  applySpacing,
  autoKerning
} from "@engine/shapeTools";
import {
  makeChunky,
  makeSkinny,
  makeOutlineVersion,
  makeShadowVersion,
  makeCrumpleVersion
} from "@engine/variants";

export default function FontMaker() {
  const [glyphs, setGlyphs] = useState({});
  const [previewText, setPreviewText] = useState("Type something!");
  const [spacing, setSpacing] = useState(0);
  const [taller, setTaller] = useState(0);
  const [thicker, setThicker] = useState(0);
  const [autoKern, setAutoKern] = useState(false);
  const [userAllowsOverlap, setUserAllowsOverlap] = useState(true);
  const [paperBackground, setPaperBackground] = useState(null);

  const [makeChunkyV, setMakeChunkyV] = useState(false);
  const [makeSkinnyV, setMakeSkinnyV] = useState(false);
  const [makeOutlineV, setMakeOutlineV] = useState(false);
  const [makeShadowV, setMakeShadowV] = useState(false);
  const [makeCrumpleV, setMakeCrumpleV] = useState(false);

  const fileInputRef = useRef(null);
  const paperInputRef = useRef(null);

  async function handleSvgUpload(e) {
    const files = Array.from(e.target.files);
    const newGlyphs = { ...glyphs };

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async ev => {
        const charName = file.name.replace(".svg", "");
        const char = charName.length === 1 ? charName : null;
        if (!char) return;

        try {
          const shape = await loadSvg(ev.target.result);
          newGlyphs[char] = shape;
          setGlyphs({ ...newGlyphs });
        } catch {
          console.error("Could not load:", file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function applyAllEdits(g) {
    let finalGlyphs = { ...g };

    if (taller !== 0) {
      const factor = 1 + taller / 100;
      for (const k in finalGlyphs) {
        finalGlyphs[k] = stretchTaller(finalGlyphs[k], factor);
      }
    }

    if (thicker !== 0) {
      for (const k in finalGlyphs) {
        if (thicker > 0) finalGlyphs[k] = makeThicker(finalGlyphs[k], thicker);
        if (thicker < 0) finalGlyphs[k] = makeThinner(finalGlyphs[k], Math.abs(thicker));
      }
    }

    if (spacing !== 0) {
      finalGlyphs = applySpacing(finalGlyphs, spacing);
    }

    if (autoKern && !userAllowsOverlap) {
      finalGlyphs = autoKerning(finalGlyphs);
    }

    return finalGlyphs;
  }

  function buildAllFonts() {
    const base = applyAllEdits(glyphs);
    const outputs = [];

    // Regular always generated
    const regularFont = buildFont(base, { fontName: "MyFont", styleName: "Regular" });
    outputs.push({ name: "MyFont-Regular.ttf", font: regularFont });

    if (makeChunkyV) {
      const chunky = makeChunky(base);
      const chunkyFont = buildFont(chunky, { fontName: "MyFont", styleName: "Chunky" });
      outputs.push({ name: "MyFont-Chunky.ttf", font: chunkyFont });
    }

    if (makeSkinnyV) {
      const skinny = makeSkinny(base);
      const skinnyFont = buildFont(skinny, { fontName: "MyFont", styleName: "Skinny" });
      outputs.push({ name: "MyFont-Skinny.ttf", font: skinnyFont });
    }

    if (makeOutlineV) {
      const outline = makeOutlineVersion(base);
      const outlineFont = buildFont(outline, { fontName: "MyFont", styleName: "Outline" });
      outputs.push({ name: "MyFont-Outline.ttf", font: outlineFont });
    }

    if (makeShadowV) {
      const sh = makeShadowVersion(base);
      const shFont = buildFont(sh, { fontName: "MyFont", styleName: "ShadowTwin" });
      outputs.push({ name: "MyFont-Shadow.ttf", font: shFont });
    }

    if (makeCrumpleV) {
      const cr = makeCrumpleVersion(base);
      const crFont = buildFont(cr, { fontName: "MyFont", styleName: "Crumpled" });
      outputs.push({ name: "MyFont-Crumple.ttf", font: crFont });
    }

    for (const out of outputs) {
      const buffer = out.font.toArrayBuffer();
      download(buffer, out.name);
    }
  }

  function handlePaperUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      setPaperBackground(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  const letters = Object.keys(glyphs).sort();

  return (
    <div style={{ padding: "1rem", width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2.2rem", fontWeight: 900 }}>Font Maker</h1>

      {/* SVG Upload */}
      <div
        className="fontmaker-dropzone"
        onClick={() => fileInputRef.current?.click()}
      >
        <p>Drop your letters here (SVG only)</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg"
          multiple
          style={{ display: "none" }}
          onChange={handleSvgUpload}
        />
      </div>

      {/* Live Preview */}
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontWeight: 700 }}>Preview</h2>
        <input
          type="text"
          value={previewText}
          onChange={e => setPreviewText(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem",
            margin: "0.5rem 0",
            fontSize: "1.1rem"
          }}
        />
        <div
          style={{
            minHeight: "80px",
            padding: "1rem",
            background: paperBackground ? `url(${paperBackground})` : "#eee"
          }}
        >
          {previewText}
        </div>

        <button
          style={{ marginTop: "1rem" }}
          onClick={() => paperInputRef.current?.click()}
        >
          Try it on paper
        </button>

        <input
          ref={paperInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handlePaperUpload}
        />
      </div>

      {/* Controls */}
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontWeight: 700 }}>Workshop Controls</h2>

        <label>Give the letters some breathing room / squeeze them together</label>
        <input
          type="range"
          min="-100"
          max="100"
          value={spacing}
          onChange={e => setSpacing(parseInt(e.target.value))}
          style={{ width: "100%" }}
        />

        <label>Stretch everything taller / squish everything shorter</label>
        <input
          type="range"
          min="-50"
          max="50"
          value={taller}
          onChange={e => setTaller(parseInt(e.target.value))}
          style={{ width: "100%" }}
        />

        <label>Pump the lines up / drain the lines down</label>
        <input
          type="range"
          min="-20"
          max="20"
          value={thicker}
          onChange={e => setThicker(parseInt(e.target.value))}
          style={{ width: "100%" }}
        />

        <div style={{ marginTop: "1rem" }}>
          <label>
            <input
              type="checkbox"
              checked={userAllowsOverlap}
              onChange={e => setUserAllowsOverlap(e.target.checked)}
            />
            Let the letters bump if they want to
          </label>

          <br />

          <label>
            <input
              type="checkbox"
              checked={autoKern}
              onChange={e => setAutoKern(e.target.checked)}
            />
            Keep letters from elbowing each other (auto spacing)
          </label>
        </div>
      </div>

      {/* Variants */}
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontWeight: 700 }}>Style Versions</h2>

        <label>
          <input
            type="checkbox"
            checked={makeChunkyV}
            onChange={e => setMakeChunkyV(e.target.checked)}
          />
          Make a chunky version
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={makeSkinnyV}
            onChange={e => setMakeSkinnyV(e.target.checked)}
          />
          Make a skinny version
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={makeOutlineV}
            onChange={e => setMakeOutlineV(e.target.checked)}
          />
          Trace around it
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={makeShadowV}
            onChange={e => setMakeShadowV(e.target.checked)}
          />
          Add a shadow twin
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            checked={makeCrumpleV}
            onChange={e => setMakeCrumpleV(e.target.checked)}
          />
          Crumple it like the paper
        </label>
      </div>

      {/* Glyph Grid */}
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontWeight: 700 }}>Your Letters</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, 60px)",
            gap: "0.5rem"
          }}
        >
          {letters.map(l => (
            <div
              key={l}
              style={{
                width: "60px",
                height: "60px",
                border: "2px solid #aaa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
                background: "#fafafa"
              }}
            >
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* Build Button */}
      <button
        style={{
          marginTop: "3rem",
          width: "100%",
          padding: "1rem",
          fontSize: "1.2rem",
          fontWeight: 700
        }}
        onClick={buildAllFonts}
      >
        Make My Font
      </button>
    </div>
  );
}
