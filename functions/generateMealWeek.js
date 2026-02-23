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
    const macro_targets = body.macro_targets; // send deterministic macros from Phase 1

    if (!onboarding) return { statusCode: 400, body: "Missing onboarding data" };
    if (!macro_targets) return { statusCode: 400, body: "Missing macro_targets" };

    const systemPrompt =
      "Return VALID JSON ONLY. No markdown. No extra text. " +
      "You create meal plans aligned to macros.";

    const userPrompt =
      "Create JSON with ONLY these keys:\n" +
      `"seven_day_meal_plan", "grocery_list"\n\n` +
      "Rules:\n" +
      "- seven_day_meal_plan MUST have 7 entries.\n" +
      "- Each day must have Breakfast, Lunch, Dinner clearly labeled.\n" +
      "- Meals should align with macro_targets (high protein).\n" +
      "- grocery_list should be consolidated (no duplicates if possible).\n\n" +
      `macro_targets:\n${JSON.stringify(macro_targets, null, 2)}\n\n` +
      `onboarding:\n${JSON.stringify(onboarding, null, 2)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
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

    clearTimeout(timeout);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { statusCode: 500, body: JSON.stringify({ error: "No AI content" }) };

    const parsed = JSON.parse(content);

    return {
      statusCode: 200,
      body: JSON.stringify(parsed)
    };

  } catch (err) {
    console.error("generateMealWeek error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
