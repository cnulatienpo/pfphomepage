import { onAction } from "./themeplay.js";

function shimmer(targets) {
  targets.forEach((el) => {
    if (!el) return;
    el.classList.remove("shimmer-once");
    void el.offsetWidth;
    el.classList.add("shimmer-once");
  });
}

function randomColor() {
  const r = Math.floor(Math.random() * 200 + 30);
  const g = Math.floor(Math.random() * 200 + 30);
  const b = Math.floor(Math.random() * 200 + 30);
  return `rgb(${r}, ${g}, ${b})`;
}

export function randomizeColors(targetRoot = document) {
  const palette = Array.from({ length: 3 }, () => randomColor());
  const targets = targetRoot.querySelectorAll(
    ".placed-block, .center-area, .fp-control__color, .fp-button"
  );
  targets.forEach((target, idx) => {
    const color = palette[idx % palette.length];
    if (target.classList.contains("center-area")) {
      target.style.background = `radial-gradient(circle at 20% 20%, ${palette[0]}, transparent 40%), linear-gradient(135deg, ${palette[0]}, ${palette[1]})`;
    } else if (target.classList.contains("fp-control__color")) {
      target.value = palette[idx % palette.length];
      target.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      target.style.backgroundColor = color;
    }
  });
  shimmer(targetRoot.querySelectorAll(".placed-block"));
  onAction("randomizer");
}

export function randomizeLayout(targetRoot = document) {
  const blocks = Array.from(targetRoot.querySelectorAll(".placed-block"));
  blocks.forEach((block, index) => {
    const offsetX = (index % 3) * 60 + Math.random() * 40;
    const offsetY = Math.random() * 120;
    block.style.setProperty("--tx", `${offsetX}px`);
    block.style.setProperty("--ty", `${offsetY}px`);
    const rot = block.style.getPropertyValue("--rot") || "0deg";
    block.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${rot})`;
  });
  shimmer(blocks);
  onAction("randomizer");
}

export function randomizeMotion(targetRoot = document) {
  const blocks = Array.from(targetRoot.querySelectorAll(".placed-block"));
  const motions = ["float", "bounce", "pulse", "slide"];
  blocks.forEach((block) => {
    const motion = motions[Math.floor(Math.random() * motions.length)];
    block.dataset.motion = motion;
    block.classList.remove("motion-float", "motion-bounce", "motion-pulse", "motion-slide");
    block.classList.add(`motion-${motion}`);
  });
  shimmer(blocks);
  onAction("randomizer");
}
