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
      "You are CoreHabit, a fitness and nutrition coaching engine. " +
      "You MUST respond with valid JSON only.";

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
  "\n\nOnboarding data:\n" +
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
