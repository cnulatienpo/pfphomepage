// Fisher-Price Theme Builder - Material Gacha Machine
import MaterialLoader from './materialLoader.js';

const overlayId = 'gacha-overlay';

function ensureStyles() {
  if (document.getElementById('gacha-style')) return;
  const style = document.createElement('style');
  style.id = 'gacha-style';
  style.textContent = `
    #${overlayId} {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9000;
      font-family: 'Comic Sans MS', 'Segoe UI', sans-serif;
    }
    #${overlayId} .gacha-panel {
      background: linear-gradient(135deg, #ffe24a, #ff9bd0);
      border: 4px solid #ff5353;
      border-radius: 16px;
      width: 360px;
      padding: 18px;
      box-shadow: 0 16px 32px rgba(0,0,0,0.35);
      color: #222;
      position: relative;
      overflow: hidden;
    }
    #${overlayId} .gacha-crank {
      width: 120px;
      height: 120px;
      border-radius: 60px;
      background: radial-gradient(circle at 30% 30%, #fffbe6, #ffa43c);
      border: 5px solid #c94b00;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s ease;
      position: relative;
    }
    #${overlayId} .gacha-crank:hover { transform: rotate(-5deg) scale(1.02); }
    #${overlayId} .gacha-crank:active { transform: rotate(8deg) scale(0.98); }
    #${overlayId} .gacha-label {
      text-align: center;
      font-weight: 800;
      margin-top: 12px;
    }
    #${overlayId} .gacha-slot {
      margin-top: 16px;
      height: 140px;
      border: 4px dashed #f54b64;
      border-radius: 12px;
      background: rgba(255,255,255,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    #${overlayId} .gacha-slot img {
      max-width: 100%;
      max-height: 100%;
      display: block;
    }
    #${overlayId} .slot-animate {
      animation: slot-pop 0.5s ease;
    }
    @keyframes slot-pop {
      0% { transform: translateY(40px) scale(0.8); opacity: 0; }
      70% { transform: translateY(-10px) scale(1.05); opacity: 1; }
      100% { transform: translateY(0) scale(1); }
    }
    #${overlayId} .confetti {
      position: absolute;
      width: 8px;
      height: 12px;
      background: #fff;
      top: 50%;
      left: 50%;
      opacity: 0;
      pointer-events: none;
    }
    #${overlayId} .confetti.burst {
      animation: confetti 900ms ease-out forwards;
    }
    @keyframes confetti {
      0% { opacity: 1; transform: translate(-50%, -50%) rotate(0deg); }
      100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(260deg); }
    }
    #${overlayId} .close-btn {
      position: absolute;
      right: 10px;
      top: 10px;
      background: #fff;
      border: 2px solid #ff5353;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      cursor: pointer;
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);
}

async function spin(slotEl, labelEl) {
  await MaterialLoader.init();
  const material = MaterialLoader.getRandomTexture() || MaterialLoader._randomFrom('patterns') || MaterialLoader._materials[0];
  if (!material) return null;
  slotEl.innerHTML = '';
  const img = document.createElement('img');
  img.src = material.preview || material.path;
  img.alt = material.name;
  img.classList.add('slot-animate');
  slotEl.appendChild(img);
  labelEl.textContent = `You got: ${material.name}!`;
  burstConfetti(slotEl);
  document.dispatchEvent(new CustomEvent('gacha:received', { detail: material }));
  return material;
}

function burstConfetti(slotEl) {
  const colors = ['#ff5353', '#3dc8ff', '#ffe24a', '#9d4bff', '#4dff8e'];
  for (let i = 0; i < 18; i++) {
    const c = document.createElement('div');
    c.className = 'confetti burst';
    c.style.background = colors[i % colors.length];
    c.style.setProperty('--dx', `${(Math.random() * 180 - 90)}px`);
    c.style.setProperty('--dy', `${(Math.random() * 120 - 40)}px`);
    slotEl.appendChild(c);
    setTimeout(() => c.remove(), 1000);
  }
}

export function openGacha() {
  ensureStyles();
  let overlay = document.getElementById(overlayId);
  if (overlay) { overlay.style.display = 'flex'; return overlay; }

  overlay = document.createElement('div');
  overlay.id = overlayId;

  const panel = document.createElement('div');
  panel.className = 'gacha-panel';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => closeGacha());

  const crank = document.createElement('div');
  crank.className = 'gacha-crank';
  crank.textContent = 'CRANK!';

  const label = document.createElement('div');
  label.className = 'gacha-label';
  label.textContent = 'Spin for a silly material!';

  const slot = document.createElement('div');
  slot.className = 'gacha-slot';
  slot.textContent = 'Ready to dispense';

  crank.addEventListener('click', () => {
    crank.disabled = true;
    crank.textContent = 'whirr…';
    crank.style.pointerEvents = 'none';
    setTimeout(async () => {
      await spin(slot, label);
      crank.textContent = 'CRANK!';
      crank.style.pointerEvents = 'auto';
    }, 380);
  });

  panel.append(closeBtn, crank, label, slot);
  overlay.appendChild(panel);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeGacha();
  });

  document.body.appendChild(overlay);
  return overlay;
}

export function closeGacha() {
  const overlay = document.getElementById(overlayId);
  if (overlay) overlay.style.display = 'none';
}

export default { openGacha, closeGacha };
