const BALANCE = {
  xp: {
    varianceCeiling: 0.35,
    baseActions: {
      "color-change": { baseXP: 10, variance: 0.18, streakMultiplier: 1.05, fatiguePenalty: 1 },
      "place-element": { baseXP: 12, variance: 0.22, streakMultiplier: 1.1, fatiguePenalty: 1 },
      "drop-header": { baseXP: 20, variance: 0.16, streakMultiplier: 1.12, fatiguePenalty: 1 },
      "background": { baseXP: 8, variance: 0.25, streakMultiplier: 1.02, fatiguePenalty: 0.85 },
      "randomizer": { baseXP: 15, variance: 0.28, streakMultiplier: 1, fatiguePenalty: 0.75 },
      preview: { baseXP: 10, variance: 0.14, streakMultiplier: 1.05, fatiguePenalty: 0.8 },
      export: { baseXP: 50, variance: 0.12, streakMultiplier: 1.2, fatiguePenalty: 0.5 },
    },
  },
  streaks: {
    growth: 0.2,
    max: 2.5,
  },
  fatigue: {
    halfLifeHours: 3,
    maxPenalty: 0.45,
  },
  missions: {
    baseDifficulty: 1,
    curveTightness: 0.35,
    rewardScale: 1.2,
  },
  debug: false,
};

let streakCount = 0;
let fatigueHours = 0;

function getActionConfig(actionName) {
  const defaultConfig = { baseXP: 6, variance: 0.2, streakMultiplier: 1, fatiguePenalty: 1 };
  return BALANCE.xp.baseActions[actionName] || defaultConfig;
}

function randomVariance(variance) {
  const wobble = Math.max(0, Math.min(variance, BALANCE.xp.varianceCeiling));
  const shift = (Math.random() * 2 - 1) * wobble;
  return 1 + shift;
}

export function getStreakMultiplier(count) {
  const { growth, max } = BALANCE.streaks;
  const multiplier = 1 + (max - 1) * (1 - Math.exp(-growth * Math.max(0, count)));
  return multiplier;
}

export function getFatiguePenalty(hoursUsed) {
  const { halfLifeHours, maxPenalty } = BALANCE.fatigue;
  const decay = Math.exp(-Math.max(0, hoursUsed) / halfLifeHours);
  return maxPenalty * (1 - decay);
}

export function getMissionDifficulty(level) {
  const { baseDifficulty, curveTightness } = BALANCE.missions;
  const l = Math.max(0, level);
  const sigmoid = 1 / (1 + Math.exp(-curveTightness * (l - 5)));
  return baseDifficulty + sigmoid;
}

export function getXP(actionName) {
  const action = getActionConfig(actionName);
  const base = action.baseXP;
  const wobble = randomVariance(action.variance);
  const streakBoost = getStreakMultiplier(streakCount) * action.streakMultiplier;
  const fatiguePenalty = getFatiguePenalty(fatigueHours) * action.fatiguePenalty;
  const fatigueFactor = Math.max(0, 1 - fatiguePenalty);
  const xp = base * wobble * streakBoost * fatigueFactor;
  return Math.max(0, Math.round(xp));
}

function scaleReward(reward) {
  if (!reward) return { type: "sticker", value: 1 };
  if (typeof reward === "string") {
    return { type: reward, value: 1 };
  }
  return reward;
}

export const Balance = {
  init(options = {}) {
    streakCount = 0;
    fatigueHours = 0;
    if (options.debug !== undefined) {
      BALANCE.debug = Boolean(options.debug);
    }
    if (options.baseActions) {
      BALANCE.xp.baseActions = { ...BALANCE.xp.baseActions, ...options.baseActions };
    }
    return this;
  },

  evaluateAction(actionName) {
    const xpAwarded = getXP(actionName);
    streakCount += 1;
    if (BALANCE.debug) {
      console.info("[ThemePlay] action", actionName, "xp", xpAwarded, "streak", streakCount);
    }
    return {
      action: actionName,
      xpAwarded,
      streak: streakCount,
      fatigueHours,
    };
  },

  applyFatigue(hours) {
    const delta = Number(hours) || 0;
    fatigueHours = Math.max(0, fatigueHours + delta);
    if (delta < 0) {
      streakCount = Math.max(0, Math.floor(streakCount * 0.5));
    }
    return {
      fatigueHours,
      penalty: getFatiguePenalty(fatigueHours),
    };
  },

  scaleGoal(goal) {
    const { id } = goal;
    const weight = goal.weight ?? 1;
    const difficulty = getMissionDifficulty(goal.level ?? 1);
    const baseTarget = goal.xpTarget ?? 100;
    const adjustedXP = Math.round(baseTarget * weight * difficulty);
    const reward = scaleReward(goal.reward);
    const tunedReward = {
      ...reward,
      value: Math.round((reward.value || 1) * BALANCE.missions.rewardScale * difficulty),
    };
    return {
      id,
      weight,
      xpTarget: adjustedXP,
      difficulty,
      reward: tunedReward,
    };
  },

  getMissionDifficulty(level) {
    return getMissionDifficulty(level);
  },

  debugDump() {
    return {
      streakCount,
      fatigueHours,
      tuning: JSON.parse(JSON.stringify(BALANCE)),
    };
  },
};

export default Balance;
