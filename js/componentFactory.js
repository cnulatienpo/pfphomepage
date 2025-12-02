export function createComponent(type, props) {
  const el = document.createElement(type);
  Object.assign(el, props);
  return el;
}
