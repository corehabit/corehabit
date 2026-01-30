// /netlify/functions/checkPremium.js

import { isPremium } from "../utils/premiumStore";

export async function handler(event) {
  try {
    const { sessionId } = JSON.parse(event.body || "{}");

    const premium = isPremium(sessionId);

    return {
      statusCode: 200,
      body: JSON.stringify({ isPremium: premium }),
    };
  } catch (err) {
    console.error("checkPremium error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ isPremium: false }),
    };
  }
}
