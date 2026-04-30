const STATES = {
  FRESH: {
    multiplier: 1.0,
    nextState: 'DISCOUNTED',
    threshold: 0.5,    
    canEdit: true,
  },
  DISCOUNTED: {
    multiplier: 0.5,
    nextState: 'FREE',
    threshold: 0.2,   
    canEdit: false,
  },
  FREE: {
    multiplier: 0.0,
    nextState: 'EXPIRED',
    threshold: 0.0,     
    canEdit: false,
  },
  EXPIRED: {
    multiplier: 0.0,
    nextState: null,
    threshold: -1,    
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