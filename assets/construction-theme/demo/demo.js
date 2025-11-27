const gate = document.getElementById("gate");
const pageOut = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--dur-page-out")) || 220;

function activateGateTransitions() {
  if (!gate) return;
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target?.closest?.("a[href]");
      if (!a || a.target || a.hasAttribute("download") || a.origin !== location.origin) return;
      e.preventDefault();
      gate.classList.remove("gate-out");
      gate.classList.add("gate-in");
      setTimeout(() => {
        location.href = a.href;
      }, pageOut);
    },
    true
  );

  window.addEventListener("pageshow", () => {
    gate.classList.remove("gate-in");
    gate.classList.add("gate-out");
  });
}

function luminance([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const f = (t) => (t <= 0.03928 ? t / 12.92 : Math.pow((t + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function hexToRgb(hex) {
  const m = hex.replace("#", "");
  const n = m.length === 3 ? m.split("").map((x) => x + x).join("") : m;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

function contrastRatio(fg, bg) {
  const L1 = luminance(hexToRgb(fg));
  const L2 = luminance(hexToRgb(bg));
  const light = Math.max(L1, L2);
  const dark = Math.min(L1, L2);
  return ((light + 0.05) / (dark + 0.05)).toFixed(2);
}

function installMotionToggle() {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const stopJSAnimations = () => {
    document.documentElement.classList.toggle("reduce-motion", mq.matches);
  };
  mq.addEventListener?.("change", stopJSAnimations);
  stopJSAnimations();
}

function makeScribblePath(w, h, seed = 1, amp = 6, steps = 6) {
  const rng = (() => {
    let t = seed;
    return () => (t = Math.imul(48271, t) % 2147483647) / 2147483647;
  })();
  const pts = [];
  const y = h * 0.75;
  for (let i = 0; i <= steps; i++) {
    const x = (w / steps) * i;
    const dy = (rng() - 0.5) * amp * (1 + (i % 2 ? 0.6 : 1));
    pts.push([x, y + dy]);
  }
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    d += ` Q ${cx} ${py} ${x} ${y}`;
  }
  return d;
}

function attachScribble(el, { stroke = "rgba(255,255,255,.8)", width = 3, seed = 7 } = {}) {
  const r = el.getBoundingClientRect();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
  svg.setAttribute("width", `${r.width}`);
  svg.setAttribute("height", `${r.height}`);
  svg.style.position = "absolute";
  svg.style.inset = "0";
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "1";

  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", makeScribblePath(r.width, r.height, seed));
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", `${width}`);
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  svg.appendChild(path);
  const pos = getComputedStyle(el).position;
  if (pos === "static") el.style.position = "relative";
  el.appendChild(svg);
  return svg;
}

function renderScribbleHeading() {
  const heading = document.querySelector("h2.scribble");
  if (!heading) return;
  const svg = attachScribble(heading, { seed: 7 });
  heading.addEventListener("remove", () => svg?.remove?.());
}

activateGateTransitions();
installMotionToggle();
renderScribbleHeading();

console.info("Text on surface contrast", contrastRatio("#e6e8ec", "#3a2d61"));
