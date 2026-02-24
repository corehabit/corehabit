export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const onboarding = body.onboarding;
    const isPremium = body.isPremium === true;

    if (!onboarding) {
      return { statusCode: 400, body: "Missing onboarding data" };
    }

    // ===============================
    // 🔒 Deterministic Macro Calculator
    // ===============================
    function calculateMacros(onboarding) {
      const weightLbs = parseFloat(onboarding.weight);
      const age = parseInt(onboarding.age);
      const sex = onboarding.sex;
      const goal = onboarding.goal || "";

      if (!weightLbs || !age) return null;

      // Clean height safely (handles 6'0, 6'0", 6' 0)
      let heightInches = 70;
      if (onboarding.height) {
        const numbers = onboarding.height.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
          heightInches = parseInt(numbers[0]) * 12 + parseInt(numbers[1]);
        }
      }

      const weightKg = weightLbs * 0.4536;
      const heightCm = heightInches * 2.54;

      let bmr =
        sex === "Male"
          ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
          : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

      const activityMultiplier = 1.55;
      let tdee = bmr * activityMultiplier;

      if (goal.includes("Lose")) tdee -= 400;
      if (goal.includes("Build")) tdee += 350;

      const calories = Math.round(tdee);

      const proteinPerLb = goal.includes("Build") ? 1.0 : 0.9;
      const protein = Math.round(weightLbs * proteinPerLb);

      const fatCalories = calories * 0.25;
      const fats = Math.round(fatCalories / 9);

      const proteinCalories = protein * 4;
      const remainingCalories = calories - proteinCalories - fats * 9;
      const carbs = Math.round(remainingCalories / 4);

      return { calories, protein, carbs, fats };
    }

    const macros = isPremium ? calculateMacros(onboarding) : null;

    // ===============================
    // 🔒 JSON Schemas (Strict)
    // ===============================

    const baseSchema = {
      name: "base_plan",
      schema: {
        type: "object",
        additionalProperties: false,
        required: [
          "overview",
          "weekly_workout_split",
          "sample_workout",
          "daily_nutrition_guidelines",
          "sample_day_of_eating",
          "weekly_focus_tip"
        ],
        properties: {
          overview: { type: "string" },
          weekly_workout_split: { type: "array", items: { type: "string" } },
          sample_workout: { type: "array", items: { type: "string" } },
          daily_nutrition_guidelines: { type: "array", items: { type: "string" } },
          sample_day_of_eating: { type: "array", items: { type: "string" } },
          weekly_focus_tip: { type: "string" }
        }
      }
    };

    const premiumSchema = {
      name: "premium_plan",
      schema: {
        type: "object",
        additionalProperties: false,
        required: [
          "overview",
          "macro_targets",
          "weekly_workout_split",
          "volume_targets",
          "sample_workout",
          "progression_strategy",
          "daily_nutrition_guidelines",
          "sample_day_of_eating",
          "weekly_focus_tip",
          "seven_day_meal_plan",
          "grocery_list",
          "weekly_check_in",
          "advanced_training_notes",
          "full_week_workout_plan"
        ],
        properties: {
          overview: { type: "string" },
          macro_targets: {
            type: "object",
            additionalProperties: false,
            required: ["calories", "protein", "carbs", "fats"],
            properties: {
              calories: { type: "number" },
              protein: { type: "number" },
              carbs: { type: "number" },
              fats: { type: "number" }
            }
          },
          weekly_workout_split: { type: "array", items: { type: "string" } },
          volume_targets: { type: "array", items: { type: "string" } },
          sample_workout: { type: "array", items: { type: "string" } },
          progression_strategy: { type: "string" },
          daily_nutrition_guidelines: { type: "array", items: { type: "string" } },
          sample_day_of_eating: { type: "array", items: { type: "string" } },
          weekly_focus_tip: { type: "string" },
          seven_day_meal_plan: {
            type: "array",
            items: { type: "string" },
            minItems: 7,
            maxItems: 7
          },
          grocery_list: { type: "array", items: { type: "string" } },
          weekly_check_in: { type: "string" },
          advanced_training_notes: { type: "string" },
          full_week_workout_plan: {
            type: "object",
            additionalProperties: false,
            required: ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"],
            properties: {
              "Day 1": { type: "array", items: { type: "string" } },
              "Day 2": { type: "array", items: { type: "string" } },
              "Day 3": { type: "array", items: { type: "string" } },
              "Day 4": { type: "array", items: { type: "string" } },
              "Day 5": { type: "array", items: { type: "string" } },
              "Day 6": { type: "array", items: { type: "string" } },
              "Day 7": { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    };

    // ===============================
    // 🔒 Structured OpenAI Call
    // ===============================

    async function callOpenAI() {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0,
          input: [
            {
              role: "system",
              content:
                "You are CoreHabit, an elite evidence-based fitness and nutrition engine. Be precise and structured."
            },
            {
              role: "user",
              content:
                (isPremium
                  ? `Use these macro targets EXACTLY: ${JSON.stringify(macros)}\n`
                  : "") +
                `Build a fully personalized plan using this onboarding data:\n` +
                JSON.stringify(onboarding, null, 2)
            }
          ],
          text: {
            format: {
              type: "json_schema",
              name: isPremium ? premiumSchema.name : baseSchema.name,
              schema: isPremium ? premiumSchema.schema : baseSchema.schema,
              strict: true
            }
          }
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }

      const data = await response.json();

if (!data.output || !data.output.length) {
  throw new Error("No output returned from OpenAI");
}

const firstOutput = data.output[0];

if (!firstOutput.content || !firstOutput.content.length) {
  throw new Error("No content returned from OpenAI");
}

const firstContent = firstOutput.content[0];

// Structured outputs may return parsed JSON directly
if (firstContent.json) {
  return firstContent.json;
}

// Or as text that needs parsing
if (firstContent.text) {
  return JSON.parse(firstContent.text);
}

throw new Error("OpenAI did not return JSON content");
    }

    // One retry for resilience
    let plan;
    try {
      plan = await callOpenAI();
    } catch (err) {
      console.error("Retrying OpenAI call...");
      plan = await callOpenAI();
    }

    if (isPremium && macros) {
      plan.macro_targets = macros;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ isPremium, plan })
    };

  } catch (err) {
    console.error("generatePlan fatal error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Plan generation failed" })
    };
  }
}
