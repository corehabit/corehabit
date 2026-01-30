// /netlify/utils/premiumStore.js

// Simple in-memory store for premium sessions
// ⚠️ Temporary: resets on cold starts / redeploys
// Later: replace with DB or Netlify KV

const premiumSessions = new Set();

export function markPremium(sessionId) {
  if (!sessionId) return;
  premiumSessions.add(sessionId);
}

export function isPremium(sessionId) {
  if (!sessionId) return false;
  return premiumSessions.has(sessionId);
}
