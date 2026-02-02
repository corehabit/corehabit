import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method Not Allowed",
      };
    }

    const { customerId } = JSON.parse(event.body || "{}");

    if (!customerId) {
      return {
        statusCode: 400,
        body: "Missing customerId",
      };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.URL}/results.html`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("Portal error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to create portal session",
      }),
    };
  }
}
