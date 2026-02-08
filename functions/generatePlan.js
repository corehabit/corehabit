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

    // TEMP: premium flag comes from caller (until Stripe anchoring is finalized)
    const isPremium = body.isPremium === true;

   const systemPrompt =
  "You are CoreHabit, an elite personalized fitness and nutrition engine. " +
  "You MUST return valid JSON only. " +
  "Plans must be deeply personalized using the user's age, sex, weight, height, goal, training days, diet preference, allergies, grocery budget, and target muscle groups if provided. " +
  "Macro targets must be calculated realistically using bodyweight and goal. " +
  "Workouts must reflect training location and selected muscle priorities. " +
  "Meal plans must respect diet preference and allergies. " +
  "Premium plans must feel advanced, specific, and tailored — not generic.";

    const baseSchema =
  "{\n" +
  '  "overview": string,\n' +
  '  "weekly_workout_split": string[],\n' +
  '  "sample_workout": string[],\n' +
  '  "daily_nutrition_guidelines": string[],\n' +
  '  "sample_day_of_eating": string[],\n' +
  '  "weekly_focus_tip": string\n' +
  "}";

const premiumSchema =
  "{\n" +
  '  "overview": string,\n' +
  '  "macro_targets": {\n' +
  '    "calories": number,\n' +
  '    "protein": number,\n' +
  '    "carbs": number,\n' +
  '    "fats": number\n' +
  '  },\n' +
  '  "weekly_workout_split": string[],\n' +
  '  "sample_workout": string[],\n' +
  '  "daily_nutrition_guidelines": string[],\n' +
  '  "sample_day_of_eating": string[],\n' +
  '  "weekly_focus_tip": string,\n' +
  '  "seven_day_meal_plan": string[],\n' +
  '  "grocery_list": string[],\n' +
  '  "weekly_check_in": string,\n' +
  '  "advanced_training_notes": string\n' +
  "}";

const userPrompt =
  "Using the onboarding data below, return a JSON object with EXACTLY this structure:\n\n" +
  (isPremium ? premiumSchema : baseSchema) +
  "\n\nInstructions:\n" +
  (isPremium
    ? "- First calculate estimated TDEE based on age, sex, height, weight, and training days.\n" +
"- For fat loss: subtract 300–500 calories.\n" +
"- For muscle gain: add 300–500 calories.\n" +
"- For maintenance: use calculated TDEE.\n" +
"- Protein MUST be calculated first at 0.8–1.0g per pound of bodyweight for fat loss.\n" +
"- For muscle gain, protein should be 0.7–0.9g per pound of bodyweight.\n" +
"- Protein grams must NOT be below 0.7g per pound under any circumstance.\n" +
"- After setting protein, calculate fat at 20–30% of total calories.\n" +
"- Carbohydrates must fill the remaining calories after protein and fat are calculated.\n" +
"- Set fat at 20–30% of total calories (9 calories per gram).\n" +
"- Allocate remaining calories to carbohydrates (4 calories per gram).\n" +
"- Ensure macro percentages align with common evidence-based ranges:\n" +
"  Fat Loss: 40–50% carbs, 25–35% protein, 20–30% fat.\n" +
"  Muscle Gain: 40–50% carbs, 30–35% protein, 20–25% fat.\n" +
"  Maintenance: 40–50% carbs, 20–30% protein, 30% fat.\n" +
      "- Protein should scale appropriately for fat loss or muscle gain.\n" +
      "- Calorie targets must align with goal (deficit for fat loss, surplus for muscle gain).\n" +
      "- Weekly workout split must reflect selected training days.\n" +
      "- If muscle groups are selected, bias volume toward those.\n" +
      "- Respect diet preference and remove any allergic foods.\n" +
   "- The seven_day_meal_plan must include 7 days.\n" +
"- Each day must include clearly labeled Breakfast, Lunch, and Dinner.\n" +
"- Meals must align with macro targets.\n" +
      "- Grocery list must align with meal plan.\n" +
      "- Weekly check-in should give measurable progress targets.\n" +
      "- Advanced training notes should provide progression strategy.\n"
    : "- Keep plan beginner-friendly and simple.\n") +
  "\nOnboarding data:\n" +
  JSON.stringify(onboarding, null, 2);

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.4,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      }
    );

    const data = await response.json();

    if (!data.choices || !data.choices[0]) {
      throw new Error("Invalid OpenAI response");
    }

    let plan;
    try {
      plan = JSON.parse(data.choices[0].message.content);
    } catch {
      throw new Error("AI returned invalid JSON");
    }
// ===== Add Macro Targets (Premium Only) =====
if (isPremium) {
  const weightRaw = onboarding.weight || "";
  const weightMatch = weightRaw.match(/\d+/);
  const weight = weightMatch ? parseFloat(weightMatch[0]) : 0;

  const goal = onboarding.goal || "General health";

  let calories;

  if (goal === "Lose fat") {
    calories = weight * 11;
  } else if (goal === "Build muscle") {
    calories = weight * 15;
  } else {
    calories = weight * 13;
  }

  const protein = weight * 0.8;
  const fats = (calories * 0.25) / 9;
  const carbs = (calories - (protein * 4 + fats * 9)) / 4;

  plan.macro_targets = {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fats: Math.round(fats)
  };
}
    return {
      statusCode: 200,
      body: JSON.stringify({
        isPremium,
        plan
      })
    };

  } catch (err) {
    console.error("generatePlan error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
