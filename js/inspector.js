export function inspectElement(element) {
  return {
    tag: element.tagName,
    classes: element.className,
    styles: window.getComputedStyle(element)
  };
}
