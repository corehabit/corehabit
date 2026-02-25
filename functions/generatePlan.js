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
    // Deterministic Macro Calculator
    // ===============================
    function calculateMacros(data) {
      const weightLbs = parseFloat(data.weight);
      const age = parseInt(data.age);
      const sex = data.sex;
      const goal = data.goal || "";

      if (!weightLbs || !age) return null;

      let heightInches = 70;
      if (data.height) {
        const nums = data.height.match(/\d+/g);
        if (nums && nums.length >= 2) {
          heightInches = parseInt(nums[0]) * 12 + parseInt(nums[1]);
        }
      }

      const weightKg = weightLbs * 0.4536;
      const heightCm = heightInches * 2.54;

      const bmr =
        sex === "Male"
          ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
          : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

      const tdee = bmr * 1.55;

      let calories = tdee;
      if (goal.includes("Lose")) calories -= 400;
      if (goal.includes("Build")) calories += 350;

      calories = Math.round(calories);

      const protein = Math.round(
        weightLbs * (goal.includes("Build") ? 1.0 : 0.9)
      );

      const fats = Math.round((calories * 0.25) / 9);

      const carbs = Math.round(
        (calories - protein * 4 - fats * 9) / 4
      );

      return { calories, protein, carbs, fats };
    }

    const macros = isPremium ? calculateMacros(onboarding) : null;

    // ===============================
    // Schemas
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
            minItems: 7,
            maxItems: 7,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["day", "breakfast", "lunch", "dinner", "extra_meals"],
              properties: {
                day: { type: "string" },
                breakfast: { type: "string" },
                lunch: { type: "string" },
                dinner: { type: "string" },
                extra_meals: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },

          grocery_list: { type: "array", items: { type: "string" } },
          weekly_check_in: { type: "string" },
          advanced_training_notes: { type: "string" },

          full_week_workout_plan: {
            type: "object",
            additionalProperties: false,
            required: [
              "Day 1",
              "Day 2",
              "Day 3",
              "Day 4",
              "Day 5",
              "Day 6",
              "Day 7"
            ],
            properties: {
              "Day 1": { type: "array", minItems: 6, maxItems: 8, items: { type: "string" } },
              "Day 2": { type: "array", minItems: 6, maxItems: 8, items: { type: "string" } },
              "Day 3": { type: "array", minItems: 6, maxItems: 8, items: { type: "string" } },
              "Day 4": { type: "array", minItems: 6, maxItems: 8, items: { type: "string" } },
              "Day 5": { type: "array", minItems: 6, maxItems: 8, items: { type: "string" } },
              "Day 6": { type: "array", minItems: 6, maxItems: 8, items: { type: "string" } },
              "Day 7": { type: "array", minItems: 6, maxItems: 8, items: { type: "string" } }
            }
          }
        }
      }
    };

    // ===============================
    // OpenAI Call
    // ===============================

    async function callOpenAI() {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0,
          max_output_tokens: 2500,
          input: [
            {
              role: "system",
              content:
                "You are CoreHabit, an elite evidence-based fitness and nutrition engine. Be structured and precise."
            },
            {
              role: "user",
              content:
                (isPremium
                  ? `Use these macro targets EXACTLY: ${JSON.stringify(macros)}\n`
                  : "") +
                `Build a fully personalized advanced plan.

Workout requirements:
- 6–8 exercises per training day.
- Include sets, reps, rest time.
- Include compound + accessory lifts.
- Rest days must include recovery guidance.

Nutrition requirements:
- User selected ${onboarding.meals_per_day || 3} meals per day.
- Breakfast, Lunch, Dinner mandatory.
- Additional meals go inside extra_meals array.
- Align meals with macro targets.

Onboarding Data:
` +
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
        throw new Error(await response.text());
      }

      const data = await response.json();

      const content = data.output?.[0]?.content?.[0];
      if (!content) throw new Error("Invalid OpenAI response");

      if (content.json) return content.json;
      if (content.text) return JSON.parse(content.text);

      throw new Error("No valid JSON returned");
    }

    let plan = await callOpenAI();

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
