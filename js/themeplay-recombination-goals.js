// ThemePlay recombination goals

export const recombinationGoals = [
  { id: 'recombination:first-gacha', label: 'First Gacha pull', action: 'gacha:received', target: 1 },
  { id: 'recombination:webgl-remix', label: 'Remix 3 materials in WebGL', action: 'webgl:render', target: 3 },
  { id: 'recombination:patterns', label: 'Apply 5 patterns', action: 'pattern:applied', target: 5 },
  { id: 'recombination:collage', label: 'Create 2 collage layers', action: 'collage:layer', target: 2 },
  { id: 'recombination:export', label: 'Export a recombined material', action: 'webgl:export', target: 1 },
  { id: 'recombination:td', label: 'Use TouchDesigner once', action: 'td:event', target: 1 },
  { id: 'recombination:pd', label: 'Use PureData panel once', action: 'pd:energy', target: 1 },
  { id: 'recombination:warp', label: 'Warp or distort 3 assets', action: 'warp:applied', target: 3 }
];

export function registerRecombinationGoals(themeplay) {
  const progress = new Map();

  recombinationGoals.forEach(goal => {
    progress.set(goal.id, 0);
    if (themeplay && themeplay.registerGoal) {
      themeplay.registerGoal(goal.id, goal.label, goal.target);
    }
  });

  const handler = (actionId) => {
    recombinationGoals.forEach(goal => {
      if (actionId === goal.action) {
        const next = Math.min(goal.target, (progress.get(goal.id) || 0) + 1);
        progress.set(goal.id, next);
        if (themeplay && themeplay.updateGoal) {
          themeplay.updateGoal(goal.id, next);
        }
        if (next >= goal.target) {
          document.dispatchEvent(new CustomEvent('themeplay:achievement', { detail: goal }));
        }
      }
    });
  };

  if (themeplay && themeplay.onAction) {
    themeplay.onAction('*', handler);
  } else {
    document.addEventListener('themeplay:action', (e) => handler(e.detail));
  }

  return handler;
}

export default { recombinationGoals, registerRecombinationGoals };
