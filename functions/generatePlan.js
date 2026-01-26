exports.handler = async function (event) {
  try {
    // Only allow POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method Not Allowed"
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || "{}");
    const onboarding = body.onboarding;

    if (!onboarding) {
      return {
        statusCode: 400,
        body: "Missing onboarding data"
      };
    }

    // ---- PREMIUM DATA (SAFE DEFAULT) ----
    const focusMuscle = onboarding.focus_muscle || "none";

    // --- STRICT STRUCTURED PROMPT ---
    const systemPrompt =
      "You are CoreHabit, a fitness and nutrition coaching engine. " +
      "You MUST respond with valid JSON only. " +
      "Do NOT include markdown, explanations, or extra text.";

    const userPrompt =
      "Using the onboarding data below, return a JSON object with EXACTLY this structure:\n\n" +
      "{\n" +
      '  "overview": string,\n' +
      '  "weekly_workout_split": string[],\n' +
      '  "sample_workout": string[],\n' +
      '  "daily_nutrition_guidelines": string[],\n' +
      '  "sample_day_of_eating": string[],\n' +
      '  "weekly_focus_tip": string\n' +
      "}\n\n" +

      // ---- PREMIUM MUSCLE FOCUS INSTRUCTIONS ----
      "Muscle focus rules:\n" +
      "- Selected muscle: \"" + focusMuscle + "\"\n" +
      "- If the selected muscle is \"none\", create a fully balanced beginner program.\n" +
      "- If a muscle is selected, SLIGHTLY prioritize it while maintaining full-body balance.\n" +
      "- Do NOT dramatically increase volume.\n" +
      "- Keep everything beginner-safe and sustainable.\n" +
      "- Use gym or home exercises based on the user's training location.\n\n" +

      "Onboarding data:\n" +
      JSON.stringify(onboarding, null, 2);

    // --- OPENAI CALL ---
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
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

    // --- PASS THROUGH OPENAI ERRORS ---
    if (data.error) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          openaiError: data.error
        })
      };
    }

    if (!data.choices || !data.choices[0]) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          rawOpenAIResponse: data
        })
      };
    }

    // --- PARSE AI JSON SAFELY ---
    let parsedPlan;
    try {
      parsedPlan = JSON.parse(data.choices[0].message.content);
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "AI did not return valid JSON",
          raw: data.choices[0].message.content
        })
      };
    }

    // --- RETURN CLEAN STRUCTURED DATA ---
    return {
      statusCode: 200,
      body: JSON.stringify(parsedPlan)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
