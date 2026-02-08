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
    // ===============================
// 🔥 Deterministic Macro Calculator
// ===============================

function calculateMacros(onboarding) {
  const weightLbs = parseFloat(onboarding.weight);
  const age = parseInt(onboarding.age);
  const sex = onboarding.sex;
  const goal = onboarding.goal;

  if (!weightLbs || !age) return null;

  // Rough height handling (basic — assumes 6'0 format)
  let heightInches = 70;
  if (onboarding.height && onboarding.height.includes("'")) {
    const parts = onboarding.height.split("'");
    const feet = parseInt(parts[0]);
    const inches = parseInt(parts[1]);
    heightInches = feet * 12 + inches;
  }

  // Convert to metric
  const weightKg = weightLbs * 0.4536;
  const heightCm = heightInches * 2.54;

  // Mifflin-St Jeor BMR
  let bmr;
  if (sex === "Male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  // Activity multiplier (basic assumption gym 3–5 days)
  const activityMultiplier = 1.55;
  let tdee = bmr * activityMultiplier;

  // Goal adjustment
  if (goal.includes("Lose")) {
    tdee -= 400;
  } else if (goal.includes("Build muscle")) {
    tdee += 350;
  }

  const calories = Math.round(tdee);

  // Protein: 0.95g per lb for muscle gain, 0.9 otherwise
  let proteinPerLb = goal.includes("Build muscle") ? 1.0 : 0.9;
  const protein = Math.round(weightLbs * proteinPerLb);

  // Fat: 25% calories
  const fatCalories = calories * 0.25;
  const fats = Math.round(fatCalories / 9);

  // Carbs = remainder
  const proteinCalories = protein * 4;
  const remainingCalories = calories - proteinCalories - (fats * 9);
  const carbs = Math.round(remainingCalories / 4);

  return {
    calories,
    protein,
    carbs,
    fats
  };
}

   const systemPrompt =
  "You are CoreHabit, an elite evidence-based fitness and nutrition coaching engine. " +
  "You MUST return valid JSON only. " +
  "All plans must be deeply personalized and reference the user's specific age, weight, height, goal, and training days directly in explanations. " +
  "Premium plans must feel like they were engineered for this exact individual — not generic advice. " +
  "Workout programming must include weekly structure, volume targets, rep ranges, and progression guidance. " +
  "Nutrition must align precisely with calculated macro targets. " +
  "Meal plans must distribute protein evenly across meals and support the user's goal. " +
  "If muscle groups are selected, bias weekly training volume toward those groups while maintaining balance. " +
  "Avoid vague language. Be specific, structured, and strategic.";

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
  '  "volume_targets": string[],\n' +
  '  "sample_workout": string[],\n' +
  '  "progression_strategy": string,\n' +
  '  "daily_nutrition_guidelines": string[],\n' +
  '  "sample_day_of_eating": string[],\n' +
  '  "weekly_focus_tip": string,\n' +
  '  "seven_day_meal_plan": string[],\n' +
  '  "grocery_list": string[],\n' +
  '  "weekly_check_in": string,\n' +
  '  "advanced_training_notes": string,\n' +
'  "full_week_workout_plan": {\n' +
'    "Day 1": string[],\n' +
'    "Day 2": string[],\n' +
'    "Day 3": string[],\n' +
'    "Day 4": string[],\n' +
'    "Day 5": string[],\n' +
'    "Day 6": string[],\n' +
'    "Day 7": string[]\n' +
'  }\n' +
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
   "- Include weekly volume targets per major muscle group (sets per week).\n" +
"- If muscle focus groups are selected, increase their weekly set volume by 20–30%.\n" +
"- Include recommended rep ranges tied to the user's goal.\n" +
"- Provide a clear progressive overload strategy in progression_strategy.\n" +
"- Volume should align with evidence-based hypertrophy ranges (10–20 sets per muscle per week).\n" +
  "- Create a fully detailed 7-day workout plan.\n" +
"- Each training day must include 5–6 exercises.\n" +
"- Include sets, reps, and intensity guidance.\n" +
"- Align exercises with the user's goal and selected muscle priorities.\n" +
"- If user trains fewer than 7 days, include structured rest/recovery days.\n" +
"- Workouts must reflect training location (Gym vs Home).\n" +
"- Volume should support hypertrophy or fat loss depending on goal.\n" +
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
      // Override macro targets with deterministic calculation
if (isPremium) {
  const macros = calculateMacros(onboarding);
  if (macros) {
    plan.macro_targets = macros;
  }
}
    } catch {
      throw new Error("AI returned invalid JSON");
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
