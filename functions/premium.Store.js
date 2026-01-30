const premiumSessions = new Set();

export function markPremium(sessionId) {
  premiumSessions.add(sessionId);
}

export function isPremium(sessionId) {
  return premiumSessions.has(sessionId);
}
