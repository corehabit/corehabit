import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handler(event) {
  try {
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
      body: "Failed to create portal session",
    };
  }
}
