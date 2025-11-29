import { addMapping, removeMapping } from './touchDesignerMappings.js';

const scenes = new Map();
const activeSceneMappings = new Map();

function registerScene(scene) {
  scenes.set(scene.id, scene);
}

export function initTouchDesignerScenes() {
  registerScene({
    id: 'audioReactiveMode',
    name: 'Audio Reactive Mode',
    description: 'Bass and highs drive colors, pulses, and scene changes.',
    mappings: [
      {
        direction: 'td→theme',
        source: 'bassEnergy',
        target: 'theme.colors.saturation',
        mode: 'range',
        inRange: [0, 1],
        outRange: [0.4, 1],
        smoothing: 0.2,
      },
      {
        direction: 'td→theme',
        source: 'highsEnergy',
        target: 'theme.colors.hueShift',
        mode: 'curve',
        curve: 'easeInOut',
        inRange: [0, 1],
        outRange: [0, 1],
        smoothing: 0.15,
      },
      {
        direction: 'td→theme',
        source: 'beat',
        target: 'theme.motion.pulse',
        mode: 'toggle',
        threshold: 0.5,
      },
      {
        direction: 'td→theme',
        source: 'sceneIndex',
        target: 'theme.scene.index',
        mode: 'step',
        outRange: [0, 1, 2, 3],
      },
    ],
  });

  registerScene({
    id: 'cameraMotionMode',
    name: 'Camera Motion Mode',
    description: 'Motion and noise controls adjust spacing and depth fog.',
    mappings: [
      {
        direction: 'td→theme',
        source: 'motion',
        target: 'theme.layout.spacing',
        inRange: [0, 1],
        outRange: [0, 1],
        smoothing: 0.25,
      },
      {
        direction: 'td→theme',
        source: 'noiseControl',
        target: 'theme.depth.fog',
        inRange: [0, 1],
        outRange: [0, 1],
        smoothing: 0.25,
      },
    ],
  });
}

export function enableTouchDesignerScene(sceneId) {
  const scene = scenes.get(sceneId);
  if (!scene) return;
  const ids = scene.mappings.map((cfg) => addMapping({ ...cfg, id: `${sceneId}-${cfg.source}-${cfg.target}` }));
  activeSceneMappings.set(sceneId, ids);
}

export function disableTouchDesignerScene(sceneId) {
  const ids = activeSceneMappings.get(sceneId) || [];
  ids.forEach((id) => removeMapping(id));
  activeSceneMappings.delete(sceneId);
}

export function listTouchDesignerScenes() {
  return Array.from(scenes.values());
}

export function getEnabledScenes() {
  return Array.from(activeSceneMappings.keys());
}

export function setEnabledScenes(ids = []) {
  activeSceneMappings.forEach((_, sceneId) => disableTouchDesignerScene(sceneId));
  ids.forEach((id) => enableTouchDesignerScene(id));
}
