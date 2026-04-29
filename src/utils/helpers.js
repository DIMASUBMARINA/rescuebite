function isExpired(expiresAt) {
  return new Date() >= new Date(expiresAt);
}

function timeRemaining(expiresAt, now = new Date()) {
  const ms = new Date(expiresAt) - now;
  return Math.max(0, ms);
}

function formatDate(date) {
  return new Date(date).toISOString();
}

function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

module.exports = { isExpired, timeRemaining, formatDate, minutesFromNow };