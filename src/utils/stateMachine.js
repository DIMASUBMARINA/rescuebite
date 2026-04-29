const STATES = {
  FRESH: {
    multiplier: 1.0,
    nextState: 'DISCOUNTED',
    threshold: 0.5,      // More than 50% time remaining
    canEdit: true,
  },
  DISCOUNTED: {
    multiplier: 0.5,
    nextState: 'FREE',
    threshold: 0.2,      // 20% to 50% time remaining
    canEdit: false,
  },
  FREE: {
    multiplier: 0.0,
    nextState: 'EXPIRED',
    threshold: 0.0,      // 0% to 20% time remaining
    canEdit: false,
  },
  EXPIRED: {
    multiplier: 0.0,
    nextState: null,
    threshold: -1,       // Time expired
    canEdit: false,
  },
};

function getStateConfig(state) {
  return STATES[state];
}

function canTransition(fromState, toState) {
  return STATES[fromState]?.nextState === toState;
}

function canEdit(state) {
  return STATES[state]?.canEdit || false;
}

module.exports = { STATES, getStateConfig, canTransition, canEdit };