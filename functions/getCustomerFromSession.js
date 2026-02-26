import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method Not Allowed"
      };
    }

    const { sessionId } = JSON.parse(event.body || "{}");

    if (!sessionId) {
      return {
        statusCode: 400,
        body: "Missing sessionId"
      };
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        customerId: session.customer
      })
    };

  } catch (err) {
    console.error("getCustomerFromSession error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message
      })
    };
  }
}
