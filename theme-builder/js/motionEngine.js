const easings = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => --t * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  elastic: (t) => Math.pow(2, -10 * t) * Math.sin(((t - 0.075) * (2 * Math.PI)) / 0.3) + 1,
  bounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

const animations = new Map();
const timelines = new Map();
let lastUpdate = performance.now();
let ticking = false;

function resolveProperty(target, path) {
  const segments = path.split('.');
  let ref = target;
  for (let i = 0; i < segments.length - 1; i++) {
    ref = ref?.[segments[i]];
  }
  return { object: ref, key: segments[segments.length - 1] };
}

function createAnimation(config) {
  const id = config.id || `anim-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const start = performance.now() + (config.delay || 0);
  const anim = { ...config, id, start, playing: true, elapsed: 0 };
  animations.set(id, anim);
  startLoop();
  return {
    id,
    stop: () => animations.delete(id),
    pause: () => (anim.playing = false),
    play: () => (anim.playing = true),
  };
}

function updateAnimation(anim, delta) {
  if (!anim.playing) return;
  anim.elapsed += delta;
  const t = Math.min(Math.max((performance.now() - anim.start) / anim.duration, 0), 1);
  const eased = (easings[anim.easing] || easings.linear)(t);
  const value = anim.from + (anim.to - anim.from) * eased;
  const { object, key } = resolveProperty(anim.target, anim.property);
  if (object && key in object) {
    object[key] = value;
  }
  anim.onUpdate?.(value);
  if (t >= 1) {
    if (anim.loop) {
      anim.start = performance.now() + (anim.delay || 0);
      if (anim.yoyo) {
        [anim.from, anim.to] = [anim.to, anim.from];
      }
    } else {
      anim.playing = false;
      anim.onComplete?.();
    }
  }
}

function createTimeline(config) {
  const id = config.id || `timeline-${Date.now()}`;
  const tracks = config.tracks || [];
  const handle = {
    id,
    play() {
      tracks.forEach((track) => createAnimation({ ...track, id: `${id}-${track.property}` }));
    },
    pause() {
      tracks.forEach((track) => {
        const existing = animations.get(`${id}-${track.property}`);
        if (existing) existing.playing = false;
      });
    },
    stop() {
      tracks.forEach((track) => animations.delete(`${id}-${track.property}`));
    },
    seek(time) {
      tracks.forEach((track) => {
        const existing = animations.get(`${id}-${track.property}`);
        if (existing) existing.start = performance.now() - time;
      });
    },
  };
  timelines.set(id, handle);
  startLoop();
  return handle;
}

function updateMotion(deltaTime) {
  animations.forEach((anim) => updateAnimation(anim, deltaTime));
}

function startLoop() {
  if (ticking) return;
  ticking = true;
  const tick = () => {
    const now = performance.now();
    const delta = (now - lastUpdate) / 1000;
    lastUpdate = now;
    updateMotion(delta);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export { createAnimation, createTimeline, updateMotion, easings };
