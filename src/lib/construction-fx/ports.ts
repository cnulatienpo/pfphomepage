/** Rotate a port’s gap to face target */
export function aimPort(portEl: HTMLElement, targetEl: HTMLElement) {
  const a = portEl.getBoundingClientRect();
  const b = targetEl.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  const bx = b.left + b.width / 2;
  const by = b.top + b.height / 2;
  const deg = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
  portEl.style.setProperty("--gap-angle", (deg + 90) + "deg");
}

/** Change seam opening length on a panel */
export function setSeam(el: HTMLElement, px: number) {
  el.style.setProperty("--gap-len", px + "px");
}

/** Draw an elbow pipe between two ports inside a given SVG */
export function connectPorts(from: HTMLElement, to: HTMLElement, svg: SVGSVGElement) {
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const s = svg.getBoundingClientRect();
  const P = { x: a.left + a.width / 2 - s.left, y: a.top + a.height / 2 - s.top };
  const Q = { x: b.left + b.width / 2 - s.left, y: b.top + b.height / 2 - s.top };
  const elbow = 24;
  const d = `M ${P.x} ${P.y} h ${elbow} V ${Q.y} H ${Q.x}`;
  const outer = svg.querySelector<SVGPathElement>(".outer");
  const inner = svg.querySelector<SVGPathElement>(".flow");
  if (outer) outer.setAttribute("d", d);
  if (inner) inner.setAttribute("d", d);
}

/** Keep connections correct when layout changes */
export function watchConnections(
  pairs: Array<{ from: HTMLElement; to: HTMLElement; svg: SVGSVGElement; }>,
  reroute: (p: { from: HTMLElement; to: HTMLElement; svg: SVGSVGElement; }) => void = ({ from, to, svg }) => connectPorts(from, to, svg)
) {
  const ro = new ResizeObserver(() => pairs.forEach(reroute));
  pairs.forEach(({ from, to, svg }) => {
    ro.observe(document.body);
    ro.observe(svg);
    ro.observe(from);
    ro.observe(to);
  });
  return () => ro.disconnect();
}
