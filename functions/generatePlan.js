export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const onboarding = body.onboarding;

    if (!onboarding) {
      return { statusCode: 400, body: "Missing onboarding data" };
    }

    const isPremium = body.isPremium === true;

    // ===============================
    // Deterministic Macro Calculator
    // ===============================
    function calculateMacros(onboarding) {
      const weightLbs = parseFloat(onboarding.weight);
      const age = parseInt(onboarding.age);
      const sex = onboarding.sex;
      const goal = onboarding.goal || "";

      if (!weightLbs || !age) return null;

      let heightInches = 70;
      if (onboarding.height && onboarding.height.includes("'")) {
        const parts = onboarding.height.split("'");
        const feet = parseInt(parts[0]);
        const inches = parseInt(parts[1]);
        if (!Number.isNaN(feet) && !Number.isNaN(inches)) {
          heightInches = feet * 12 + inches;
        }
      }

      const weightKg = weightLbs * 0.4536;
      const heightCm = heightInches * 2.54;

      let bmr;
      if (sex === "Male") bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
      else bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

      const activityMultiplier = 1.55;
      let tdee = bmr * activityMultiplier;

      if (goal.includes("Lose")) tdee -= 400;
      else if (goal.includes("Build")) tdee += 350;

      const calories = Math.round(tdee);

      const proteinPerLb = goal.includes("Build") ? 1.0 : 0.9;
      const protein = Math.round(weightLbs * proteinPerLb);

      const fatCalories = calories * 0.25;
      const fats = Math.round(fatCalories / 9);

      const proteinCalories = protein * 4;
      const remainingCalories = calories - proteinCalories - fats * 9;
      const carbs = Math.max(0, Math.round(remainingCalories / 4));

      return { calories, protein, carbs, fats };
    }

    const macros = calculateMacros(onboarding);

    // ✅ Core schema ONLY (fast)
    const coreSchema = {
      overview: "string",
      weekly_workout_split: ["string"],
      volume_targets: ["string"],
      sample_workout: ["string"],
      progression_strategy: "string",
      daily_nutrition_guidelines: ["string"],
      sample_day_of_eating: ["string"],
      weekly_focus_tip: "string",
      weekly_check_in: "string"
    };

    const systemPrompt =
      "You are CoreHabit, an evidence-based fitness and nutrition coach. " +
      "Return VALID JSON ONLY, no markdown, no extra text. Keep it concise and actionable.";

    const userPrompt =
      `Using the onboarding data below, return a JSON object with these keys ONLY:\n` +
      `${Object.keys(coreSchema).join(", ")}\n\n` +
      `Rules:\n` +
      `- Make it personalized to age, weight, height, goal, training days, and location.\n` +
      `- weekly_workout_split must match training days.\n` +
      `- volume_targets must be short bullets like "Chest: 12–16 sets/week".\n` +
      `- sample_workout should be 6–8 lines max.\n` +
      `- progression_strategy should be 3–5 sentences.\n` +
      `- daily_nutrition_guidelines should be 6–10 bullets.\n` +
      `- weekly_check_in should be measurable.\n\n` +
      `Onboarding:\n${JSON.stringify(onboarding, null, 2)}`;


    const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    temperature: 0.4,
    max_output_tokens: 600,
    text: { format: { type: "json_object" } },  // ✅ FIXED
    input: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userPrompt
      }
    ]
  })
});
    

   const data = await response.json();

if (!data.output || !data.output[0] || !data.output[0].content) {
  console.error("Invalid OpenAI response:", data);
  throw new Error("Invalid AI response structure");
}

const rawText = data.output[0].content
  .filter(item => item.type === "output_text")
  .map(item => item.text)
  .join("");

let plan;

try {
  plan = JSON.parse(rawText);
} catch (err) {
  console.error("JSON parse error:", err);
  console.error("Raw text:", rawText);
  throw new Error("Malformed JSON");
}

    // Force macro_targets onto premium output (deterministic)
    if (isPremium && macros) {
      plan.macro_targets = macros;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ isPremium, plan })
    };

  } catch (err) {
    console.error("generatePlan error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Unknown error" })
    };
  }
}
