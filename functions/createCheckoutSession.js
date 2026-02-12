const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { priceId } = JSON.parse(event.body);

    const origin =
      event.headers.origin ||
      `https://${event.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${origin}/results.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/premium.html`
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };

  } catch (err) {
  console.error("Stripe FULL error:", err);
  return {
    statusCode: 500,
    body: JSON.stringify({
      error: err.message,
      stack: err.stack
    })
  };
}

