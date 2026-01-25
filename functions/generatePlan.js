exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method Not Allowed"
      };
    }

    const body = JSON.parse(event.body || "{}");
    const onboarding = body.onboarding;

    if (!onboarding) {
      return {
        statusCode: 400,
        body: "Missing onboarding data"
      };
    }

    const systemPrompt =
      "You are CoreHabit, a beginner-focused fitness and nutrition coach. " +
      "Your goal is to create simple, realistic plans. " +
      "Avoid extremes. Focus on consistency. " +
      "Use a calm, practical tone.";

    const userPrompt =
      "User onboarding data:\n" +
      JSON.stringify(onboarding, null, 2);

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

    if (!data.choices || !data.choices[0]) {
      throw new Error("Invalid OpenAI response");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        plan: data.choices[0].message.content
      })
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
