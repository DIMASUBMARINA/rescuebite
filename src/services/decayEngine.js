const { STATES } = require('../utils/stateMachine');

function calculateState(item, now = new Date()) {
  const totalTime = new Date(item.expiresAt) - new Date(item.createdAt);
  const remainingTime = new Date(item.expiresAt) - now;
  
  if (remainingTime <= 0) return 'EXPIRED';
  
  const pctRemaining = remainingTime / totalTime;
  
  if (pctRemaining > STATES.FRESH.threshold) return 'FRESH';
  if (pctRemaining > STATES.DISCOUNTED.threshold) return 'DISCOUNTED';
  return 'FREE';
}

function calculatePrice(item, state) {
  const multiplier = STATES[state]?.multiplier ?? 0;
  return Math.floor(Number(item.originalPrice) * multiplier);
}

function getTimeInfo(item, now = new Date()) {
  const totalTime = new Date(item.expiresAt) - new Date(item.createdAt);
  const remainingTime = new Date(item.expiresAt) - now;
  const elapsedTime = totalTime - remainingTime;
  
  return {
    totalMinutes: Math.floor(totalTime / 60000),
    remainingMinutes: Math.floor(remainingTime / 60000),
    elapsedMinutes: Math.floor(elapsedTime / 60000),
    percentRemaining: Math.max(0, remainingTime / totalTime),
  };
}

module.exports = { calculateState, calculatePrice, getTimeInfo };