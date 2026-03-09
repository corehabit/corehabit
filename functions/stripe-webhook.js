import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handler(event) {

  const signature = event.headers["stripe-signature"];

  let rawBody = event.body;

  // Netlify sends base64 encoded payloads sometimes
  if (event.isBase64Encoded) {
    rawBody = Buffer.from(event.body, "base64").toString("utf8");
  }

  let stripeEvent;

  try {

    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

  } catch (err) {

    console.error("❌ Signature verification failed:", err.message);

    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`
    };

  }

  try {

    switch (stripeEvent.type) {

      case "checkout.session.completed": {

        const session = stripeEvent.data.object;

        console.log("✅ CHECKOUT COMPLETED");

        console.log({
          email: session.customer_details?.email,
          customer: session.customer,
          subscription: session.subscription
        });

        break;
      }

      case "customer.subscription.updated": {

        console.log("🔄 SUBSCRIPTION UPDATED");

        break;
      }

      case "customer.subscription.deleted": {

        console.log("⛔ SUBSCRIPTION CANCELLED");

        break;
      }

      default:
        console.log("ℹ️ Unhandled event:", stripeEvent.type);

    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (err) {

    console.error("🔥 Webhook handler error:", err);

    return {
      statusCode: 500,
      body: "Webhook handler failed"
    };

  }

}
