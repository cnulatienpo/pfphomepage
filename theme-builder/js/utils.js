export function uid() {
  return `lyr-${Math.random().toString(16).slice(2, 8)}`;
}

export function buildInlineIcon(color) {
  const svg = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="16" height="16" rx="4" fill="${color}"/><circle cx="10" cy="10" r="4" fill="white"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function placeholderSVG(label, colors) {
  const [a, b] = colors;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'><defs><pattern id='p' width='24' height='24' patternUnits='userSpaceOnUse'><rect width='24' height='24' fill='${a}'/><circle cx='12' cy='12' r='6' fill='${b}'/></pattern></defs><rect width='300' height='200' fill='url(#p)'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#fff' font-family='Inter, sans-serif' font-size='22' font-weight='800' letter-spacing='2'>${label}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
