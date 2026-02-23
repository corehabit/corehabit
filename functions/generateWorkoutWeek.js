export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const onboarding = body.onboarding;
     // 🔒 Sanitize height to prevent JSON-breaking apostrophes
if (onboarding?.height) {
  onboarding.height = onboarding.height.replace(/'/g, " ft ");
}
    if (!onboarding) return { statusCode: 400, body: "Missing onboarding data" };

    const systemPrompt =
      "Return VALID JSON ONLY. No markdown. No extra text. " +
      "You create structured workout plans.";

    const userPrompt =
      "Create JSON with ONLY this key:\n" +
      `"full_week_workout_plan"\n\n` +
      "Rules:\n" +
      "- 7 days total.\n" +
      "- If user trains < 7 days, include rest/recovery days.\n" +
      "- Training days: 5–6 exercises each.\n" +
      "- Each exercise line MUST include sets x reps and an intensity hint.\n" +
      "- Reflect training location (Gym vs Home).\n\n" +
      `Onboarding:\n${JSON.stringify(onboarding, null, 2)}`;

    

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { statusCode: 500, body: JSON.stringify({ error: "No AI content" }) };

    const parsed = JSON.parse(content);

    return {
      statusCode: 200,
      body: JSON.stringify(parsed)
    };

  } catch (err) {
    console.error("generateWorkoutWeek error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
