// Minimal interactivity for one or more frames marked [data-live]
const DWELL_MS = 200;
const HIDE_MS = 120;

const liveFrames = [...document.querySelectorAll('.pf-warp[data-live]')];
const allPopups = [];

function hideAllPopups() {
  allPopups.forEach(p => p.hidden = true);
}

liveFrames.forEach(warp => {
  const frame = warp.querySelector('.pf-frame');
  const content = frame.querySelector('.pf-content');

  // Build the popup only once
  const popup = document.createElement('button');
  popup.className = 'pf-popup';
  popup.type = 'button';
  popup.textContent = warp.dataset.label || 'Open';
  popup.hidden = true;
  content.appendChild(popup);
  allPopups.push(popup);

  const href = warp.dataset.href || '#';
  let dwellTimer = null;
  let hideTimer = null;
  let over = false;

  const show = () => { hideAllPopups(); popup.hidden = false; };
  const hide = () => { popup.hidden = true; };

  warp.addEventListener('pointerenter', () => {
    over = true;
    warp.classList.add('is-hot');
    clearTimeout(hideTimer);
    dwellTimer = setTimeout(show, DWELL_MS);
  });

  warp.addEventListener('pointerleave', () => {
    over = false;
    warp.classList.remove('is-hot');
    clearTimeout(dwellTimer);
    hideTimer = setTimeout(hide, HIDE_MS);
  });

  // Click anywhere inside the live frame to follow the link
  warp.addEventListener('click', (e) => {
    // Allow right-click / modifier clicks
    if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      window.location.href = href;
    }
  });
});
