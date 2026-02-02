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

    const { customerId, priceId } = JSON.parse(event.body || "{}");

    if (!priceId) {
      return {
        statusCode: 400,
        body: "Missing priceId",
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer: customerId || undefined,
      success_url: `${process.env.URL}/results.html?checkout=success`,
      cancel_url: `${process.env.URL}/results.html?checkout=cancel`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("Checkout error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to create checkout session",
      }),
    };
  }
}
