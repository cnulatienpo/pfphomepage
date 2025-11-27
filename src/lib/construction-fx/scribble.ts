export type ScribbleOptions = {
  type?: "underline" | "bracket" | "circle";
  color?: string;
  stroke?: number;
  roughness?: number;
  padding?: number;
};

/** Create an SVG scribble overlay on an element */
export function scribble(el: HTMLElement, opts: ScribbleOptions = {}) {
  const { type = "underline", color = "white", stroke = 3, roughness = .6, padding = 6 } = opts;
  const r = el.getBoundingClientRect();
  const w = Math.max(40, r.width);
  const h = type === "underline" ? Math.max(16, padding * 3) : Math.max(r.height + padding * 2, 60);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  Object.assign(svg.style, { position: "absolute", pointerEvents: "none", mixBlendMode: "screen" });
  if (type === "underline") {
    svg.style.left = "0";
    svg.style.right = "0";
    svg.style.bottom = `-${padding}px`;
  } else {
    svg.style.left = "0";
    svg.style.top = `-${padding}px`;
    svg.style.right = "0";
    svg.style.bottom = `-${padding}px`;
  }

  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", String(stroke));
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  function jitter(y: number, amp: number) { return y + (Math.random() * 2 - 1) * amp; }
  if (type === "underline") {
    const y = h - stroke;
    const steps = Math.max(6, Math.floor(w / 40));
    const amp = roughness * 6;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      const yj = jitter(y, amp);
      d += (i ? " L" : "M") + ` ${x.toFixed(1)} ${yj.toFixed(1)}`;
    }
    path.setAttribute("d", d);
  } else if (type === "bracket") {
    const inset = 6;
    const d = `M ${inset} ${inset} L ${inset} ${h - inset} M ${w - inset} ${inset} L ${w - inset} ${h - inset}`;
    path.setAttribute("d", d);
  } else {
    const cx = w / 2, cy = h / 2, rx = w / 2 - 4, ry = h / 2 - 4;
    const d = `M ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy}`;
    path.setAttribute("d", d);
  }
  svg.appendChild(path);
  const hostPos = getComputedStyle(el).position;
  if (hostPos === "static") el.style.position = "relative";
  el.appendChild(svg);
  return svg;
}
