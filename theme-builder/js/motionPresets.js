import { createAnimation, createTimeline, easings } from './motionEngine.js';

const presets = [
  {
    id: 'soft-pop',
    name: 'Soft Pop',
    description: 'Scales from 0.9 to 1.0 with a gentle overshoot.',
    applyTo(target, options = {}) {
      return createAnimation({
        target,
        property: options.property || 'transform.scale',
        from: 0.9,
        to: 1.0,
        duration: options.duration || 600,
        easing: 'easeOutCubic',
        onUpdate: (v) => {
          if (target.style) target.style.transform = `scale(${v})`;
          if (target.transform) target.transform.scale = v;
          options.onUpdate?.(v);
        },
      });
    },
  },
  {
    id: 'card-hover-lift',
    name: 'Card Hover Lift',
    description: 'Y-translate plus shadow change for layers.',
    applyTo(target, options = {}) {
      const startY = options.startY ?? 0;
      return createAnimation({
        target,
        property: options.property || 'transform.y',
        from: startY,
        to: options.to ?? -10,
        duration: options.duration || 500,
        easing: 'easeOutQuad',
        onUpdate: (v) => {
          if (target.style) target.style.transform = `translateY(${v}px)`;
          if (target.transform) target.transform.y = v;
          if (target.shadowNode) target.shadowNode.style.filter = `drop-shadow(0 ${-v / 2}px 12px rgba(0,0,0,0.3))`;
          options.onUpdate?.(v);
        },
      });
    },
  },
  {
    id: 'fade-through-color',
    name: 'Fade Through Color',
    description: 'Fades opacity while tinting CSS color variables.',
    applyTo(target, options = {}) {
      const from = options.from ?? 0;
      const to = options.to ?? 1;
      return createAnimation({
        target,
        property: options.property || 'filter.opacity',
        from,
        to,
        duration: options.duration || 700,
        easing: 'easeInOutQuad',
        onUpdate: (v) => {
          if (target.style) target.style.opacity = v;
          if (target.filter) target.filter.opacity = Math.round(v * 100);
          if (options.colorVar) document.documentElement.style.setProperty(options.colorVar, `rgba(255, 206, 0, ${v})`);
          options.onUpdate?.(v);
        },
      });
    },
  },
  {
    id: 'slide-in-from-edge',
    name: 'Slide In',
    description: 'Slides content in from an edge with overshoot.',
    applyTo(target, options = {}) {
      const axis = options.axis || 'x';
      const distance = options.distance || 80;
      return createAnimation({
        target,
        property: options.property || `transform.${axis}`,
        from: axis === 'x' ? -distance : distance,
        to: 0,
        duration: options.duration || 650,
        easing: 'easeOutCubic',
        onUpdate: (v) => {
          if (target.style) target.style.transform = axis === 'x' ? `translateX(${v}px)` : `translateY(${v}px)`;
          if (target.transform) target.transform[axis] = v;
          options.onUpdate?.(v);
        },
      });
    },
  },
  {
    id: 'looping-orbit',
    name: 'Looping Orbit',
    description: 'Keeps icons moving in a circular path.',
    applyTo(target, options = {}) {
      const radius = options.radius || 14;
      const duration = options.duration || 3000;
      return createTimeline({
        id: `orbit-${Date.now()}`,
        label: 'orbit',
        tracks: [
          {
            target,
            property: options.property || 'transform.x',
            from: 0,
            to: Math.PI * 2,
            duration,
            easing: 'linear',
            loop: true,
            onUpdate: (angle) => {
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              if (target.style) target.style.transform = `translate(${x}px, ${y}px)`;
              if (target.transform) {
                target.transform.x = x;
                target.transform.y = y;
              }
              options.onUpdate?.(angle);
            },
          },
        ],
      });
    },
  },
  {
    id: 'breathing',
    name: 'Breathing',
    description: 'Subtle scale pulsing for calm UI pieces.',
    applyTo(target, options = {}) {
      return createAnimation({
        target,
        property: options.property || 'style.transform',
        from: 0.96,
        to: 1.04,
        duration: options.duration || 1400,
        easing: 'easeInOutQuad',
        loop: true,
        yoyo: true,
        onUpdate: (v) => {
          if (target.style) target.style.transform = `scale(${v})`;
          if (target.transform) target.transform.scale = v;
          options.onUpdate?.(v);
        },
      });
    },
  },
];

function listMotionPresets() {
  return presets;
}

function applyPreset(presetId, target, options = {}) {
  const preset = presets.find((p) => p.id === presetId);
  if (!preset) return null;
  return preset.applyTo(target, options);
}

export { listMotionPresets, applyPreset };
