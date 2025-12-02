export function exportCSS() {
  const styles = document.querySelector('style')?.textContent || '';
  const html = document.querySelector('main')?.outerHTML || '';
  return {
    css: styles,
    html: html,
    timestamp: new Date().toISOString()
  };
}
