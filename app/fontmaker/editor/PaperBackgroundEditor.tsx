// PaperBackgroundEditor.tsx
// Simple background-texture editor for your scanned notebook pages.
// Lets you crop, blur, brighten, tint, and export as a base64 image.

import React, { useRef, useState, useEffect } from "react";

export default function PaperBackgroundEditor({ onSave }) {
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const [img, setImg] = useState(null);

  const [crop, setCrop] = useState({ x: 0, y: 0, w: 400, h: 400 });
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [blur, setBlur] = useState(0);
  const [tint, setTint] = useState("rgba(0,0,0,0)");

  useEffect(() => {
    redraw();
  }, [img, crop, brightness, contrast, blur, tint]);

  function loadFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const image = new Image();
      image.onload = () => {
        setImg(image);
        setCrop({
          x: 0,
          y: 0,
          w: image.width,
          h: image.height
        });
      };
      image.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");

    canvas.width = crop.w;
    canvas.height = crop.h;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.filter = `brightness(${brightness}) contrast(${contrast}) blur(${blur}px)`;

    ctx.drawImage(
      img,
      crop.x,
      crop.y,
      crop.w,
      crop.h,
      0,
      0,
      crop.w,
      crop.h
    );

    if (tint !== "rgba(0,0,0,0)") {
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const data = canvas.toDataURL("image/png");
    if (onSave) onSave(data);
  }

  return (
    <div
      style={{
        marginTop: "1rem",
        padding: "1rem",
        border: "1px solid #ccc",
        borderRadius: "6px",
        background: "#fafafa",
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}
    >
      <h3 style={{ margin: 0 }}>Edit background texture</h3>

      <button onClick={() => fileInputRef.current?.click()}>
        load image
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={loadFile}
      />

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          border: "1px solid #aaa",
          borderRadius: "6px",
          background: "#fff"
        }}
      />

      {/* CROP */}
      <div>
        <label>Crop x</label>
        <input
          type="number"
          value={crop.x}
          onChange={e => setCrop({ ...crop, x: parseInt(e.target.value) })}
        />
        <label>y</label>
        <input
          type="number"
          value={crop.y}
          onChange={e => setCrop({ ...crop, y: parseInt(e.target.value) })}
        />
        <label>w</label>
        <input
          type="number"
          value={crop.w}
          onChange={e => setCrop({ ...crop, w: parseInt(e.target.value) })}
        />
        <label>h</label>
        <input
          type="number"
          value={crop.h}
          onChange={e => setCrop({ ...crop, h: parseInt(e.target.value) })}
        />
      </div>

      {/* FILTERS */}
      <div>
        <label>Brightness</label>
        <input
          type="range"
          min="0.2"
          max="2"
          step="0.1"
          value={brightness}
          onChange={e => setBrightness(parseFloat(e.target.value))}
        />

        <label>Contrast</label>
        <input
          type="range"
          min="0.2"
          max="2"
          step="0.1"
          value={contrast}
          onChange={e => setContrast(parseFloat(e.target.value))}
        />

        <label>Blur</label>
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={blur}
          onChange={e => setBlur(parseInt(e.target.value))}
        />

        <label>Tint overlay</label>
        <input
          type="color"
          onChange={e => {
            const hex = e.target.value;
            setTint(hex + "55"); // semi-transparent
          }}
        />
      </div>

      {/* SAVE */}
      <button
        onClick={save}
        style={{
          padding: "0.5rem 1rem",
          fontWeight: 700
        }}
      >
        save as background
      </button>
    </div>
  );
}
