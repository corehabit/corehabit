exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method Not Allowed"
      };
    }

    const { onboarding } = JSON.parse(event.body);

    if (!onboarding) {
      return {
        statusCode: 400,
        body: "Missing onboarding data"
      };
    }

    const systemPrompt = `
You are CoreHabit, a beginner-focused habit, nutrition, and fitness coach.

Rules:
- Consistency over intensity
- Beginner-friendly
- No extreme dieting or training
- Clear structure
- Calm, supportive tone

Create a personalized fitness and nutrition plan.
`;

    const userPrompt = `
User onboarding data:
${JSON.stringify(onboarding, null, 2)}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${process.env.OPENAI_API_KEY}\`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

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
      body: JSON.stringify({ error: error.message })
    };
  }
};
