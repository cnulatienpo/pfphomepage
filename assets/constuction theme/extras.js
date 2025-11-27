// ---------- tiny helpers ----------
const rect = el => el.getBoundingClientRect();
const center = el => { const r=rect(el); return {x:r.left+r.width/2, y:r.top+r.height/2}; };
const clamp = (n,a,b)=> Math.max(a, Math.min(b,n));

// ---------- 1) Orthogonal auto-router with obstacle avoidance ----------
export function autorouteConnect({
  from, to, svg, grid = 28,
  obstacleSelector = '[data-panel],[data-plate],[data-obstacle]',
  outerClass = 'outer',
  innerClass = 'flow'
}){
  if(!svg) throw new Error('autorouteConnect: missing svg');
  const S = rect(svg);
  const start = center(from), end = center(to);

  // Build grid
  const cols = Math.ceil(S.width / grid) + 1;
  const rows = Math.ceil(S.height / grid) + 1;
  const cell = (x,y)=> ({x, y, key:`${x},${y}`});
  const blocked = new Set();

  // Mark obstacles
  document.querySelectorAll(obstacleSelector).forEach(o=>{
    const r = rect(o);
    // pad a hair so we don't skim edges
    const px = 6;
    const x0 = clamp(Math.floor((r.left - px - S.left)/grid), 0, cols-1);
    const x1 = clamp(Math.ceil((r.right + px - S.left)/grid), 0, cols-1);
    const y0 = clamp(Math.floor((r.top - px - S.top)/grid), 0, rows-1);
    const y1 = clamp(Math.ceil((r.bottom + px - S.top)/grid), 0, rows-1);
    for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) blocked.add(`${x},${y}`);
  });

  const startC = cell(Math.round((start.x - S.left)/grid), Math.round((start.y - S.top)/grid));
  const endC   = cell(Math.round((end.x - S.left)/grid),   Math.round((end.y - S.top)/grid));

  // BFS
  const q=[startC], seen=new Set([startC.key]), prev=new Map();
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  while(q.length){
    const cur=q.shift();
    if(cur.key===endC.key) break;
    for(const [dx,dy] of dirs){
      const nx=cur.x+dx, ny=cur.y+dy;
      if(nx<0||ny<0||nx>=cols||ny>=rows) continue;
      const k=`${nx},${ny}`;
      if(seen.has(k) || blocked.has(k)) continue;
      seen.add(k); prev.set(k, cur); q.push(cell(nx,ny));
    }
  }
  // Reconstruct
  const path=[];
  let k=endC.key, cur=endC;
  if(!prev.has(k) && k!==startC.key){
    // fallback: simple two-segment elbow
    const d = `M ${start.x-S.left} ${start.y-S.top} H ${end.x-S.left} V ${end.y-S.top}`;
    setD(svg, d, outerClass, innerClass);
    return;
  }
  while(cur){ path.push(cur); cur = prev.get(cur.key); if(cur && cur.key===startC.key){ path.push(cur); break; } }
  path.reverse();
  // Simplify collinear segments
  const pts = path.map(p => [p.x*grid, p.y*grid]);
  const simp = [pts[0]];
  for(let i=1;i<pts.length-1;i++){
    const [x0,y0]=simp[simp.length-1], [x1,y1]=pts[i], [x2,y2]=pts[i+1];
    if((x0===x1 && x1===x2) || (y0===y1 && y1===y2)) continue; // middle point collinear
    simp.push([x1,y1]);
  }
  simp.push(pts[pts.length-1]);

  // To SVG path
  const move = (x,y)=>`M ${x} ${y}`;
  const line = (x,y)=>`L ${x} ${y}`;
  const d = simp.map((p,i)=> i? line(p[0],p[1]) : move(p[0],p[1])).join(' ');
  setD(svg, d, outerClass, innerClass);
}

function setD(svg, d, outerClass, innerClass){
  let outer = svg.querySelector(`path.${outerClass}`);
  let inner = svg.querySelector(`path.${innerClass}`);
  if(!outer){ outer = document.createElementNS('http://www.w3.org/2000/svg','path'); outer.setAttribute('class', outerClass); outer.setAttribute('fill','none'); outer.setAttribute('stroke','var(--shape)'); outer.setAttribute('stroke-width','8'); outer.setAttribute('stroke-linecap','round'); svg.appendChild(outer); }
  if(!inner){ inner = document.createElementNS('http://www.w3.org/2000/svg','path'); inner.setAttribute('class', innerClass); inner.setAttribute('fill','none'); inner.setAttribute('stroke','var(--accent)'); inner.setAttribute('stroke-width','4'); inner.setAttribute('stroke-linecap','round'); inner.setAttribute('stroke-dasharray','6 10'); svg.appendChild(inner); }
  outer.setAttribute('d', d); inner.setAttribute('d', d);
  inner.style.animation = 'pipeFlow 2000ms linear infinite';
}

// ---------- 2) Laser-level overlay ----------
export function enableLaserLevel({key='l'} = {}){
  let el = document.getElementById('laser-level');
  if(!el){ el = document.createElement('div'); el.id='laser-level'; document.body.appendChild(el); }
  let on = false, tilt = 0;

  function set(val){ el.style.setProperty('--rot', `${val}deg`); }
  function toggle(){ on=!on; el.style.setProperty('--alpha', on? '1':'0'); }

  window.addEventListener('keydown', e=>{ if(e.key.toLowerCase()===key){ toggle(); }});
  window.addEventListener('mousemove', e=>{ if(on){ const pct=(e.clientY/window.innerHeight)-.5; tilt = pct*10; set(tilt);} }, {passive:true});
  window.addEventListener('deviceorientation', e=>{ if(on && typeof e.gamma==='number'){ set(clamp(e.gamma,-45,45)); } });
  return { toggle, set };
}

// ---------- 3) Field notebook: draw, save, export ----------
export function enableNotebook({key='n', stroke=3, color='rgba(255,255,255,.9)'} = {}){
  let canvas = document.getElementById('fx-notebook');
  if(!canvas){
    canvas = document.createElement('canvas'); canvas.id='fx-notebook';
    Object.assign(canvas.style,{ position:'fixed', inset:0, zIndex:2147483001, pointerEvents:'none' });
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');
  const fit = ()=>{ canvas.width=innerWidth; canvas.height=innerHeight; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle=color; ctx.lineWidth=stroke; };
  fit(); addEventListener('resize', fit, {passive:true});

  let on=false, drawing=false, strokes=[];
  function toggle(){ on=!on; canvas.style.pointerEvents = on? 'auto':'none'; canvas.style.opacity = on? '1':'0'; if(on) redraw(); }
  function down(e){ if(!on) return; drawing=true; const {x,y}=pos(e); strokes.push([{x,y}]); }
  function move(e){ if(!on||!drawing) return; const {x,y}=pos(e); const cur=strokes[strokes.length-1]; cur.push({x,y}); drawSegment(cur[cur.length-2], {x,y}); }
  function up(){ drawing=false; save(); }
  function pos(e){ const t=('touches' in e && e.touches[0])||e; return {x:t.clientX, y:t.clientY}; }
  function drawSegment(a,b){ ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
  function redraw(){ ctx.clearRect(0,0,canvas.width,canvas.height); strokes.forEach(s=>{ for(let i=1;i<s.length;i++) drawSegment(s[i-1], s[i]); }); }
  function save(){ localStorage.setItem('fx-notebook', JSON.stringify(strokes)); }
  function load(){ const raw=localStorage.getItem('fx-notebook'); if(raw){ strokes=JSON.parse(raw); redraw(); } }
  function clear(){ strokes=[]; redraw(); save(); }
  function exportSVG(){
    const path = strokes.map(seg => seg.map((p,i)=> `${i?'L':'M'} ${p.x} ${p.y}`).join(' ')).join(' ');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${innerWidth}" height="${innerHeight}" viewBox="0 0 ${innerWidth} ${innerHeight}">
      <path d="${path}" fill="none" stroke="white" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const blob = new Blob([svg], {type:'image/svg+xml'}); const url = URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='notebook.svg'; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  window.addEventListener('keydown', e=>{
    if(e.key.toLowerCase()===key){ toggle(); }
    if(!on) return;
    if(e.key==='Escape') clear();
    if(e.key.toLowerCase()==='s' && (e.ctrlKey||e.metaKey)){ e.preventDefault(); exportSVG(); }
  });
  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move, {passive:true});
  window.addEventListener('pointerup', up, {passive:true});
  load();

  return { toggle, clear, exportSVG, load };
}

// ---------- 4) Tolerance tags ----------
export function addToleranceTag({from, to, container=document.body, text}){
  const fa = rect(from), fb = rect(to);
  const dx = Math.abs((fa.left+fa.width/2) - (fb.left+fb.width/2));
  const dy = Math.abs((fa.top+fa.height/2) - (fb.top+fb.height/2));
  const msg = text ?? `±${(Math.hypot(dx,dy)).toFixed(1)}px`;
  const tag = document.createElement('span');
  tag.className = 'tol'; tag.textContent = msg;
  Object.assign(tag.style, { left: `${(fa.right + fb.left)/2}px`, top: `${Math.min(fa.bottom, fb.bottom)+8}px` });
  container.appendChild(tag);
  return tag;
}
