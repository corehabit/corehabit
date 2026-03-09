import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Stripe Webhook Handler
 * Handles subscription events from Stripe Checkout
 */
export async function handler(event) {

  const sig = event.headers["stripe-signature"];

  let body = event.body;

  // Netlify sometimes sends the body base64 encoded
  if (event.isBase64Encoded) {
    body = Buffer.from(event.body, "base64").toString("utf8");
  }

  let stripeEvent;

  try {

    stripeEvent = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

  } catch (err) {

    console.error("❌ Stripe webhook signature verification failed:", err.message);

    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };

  }

  try {

    switch (stripeEvent.type) {

      /**
       * Checkout completed (user successfully paid)
       */
      case "checkout.session.completed": {

        const session = stripeEvent.data.object;

        console.log("✅ CHECKOUT SESSION COMPLETED");

        console.log({
          email: session.customer_details?.email,
          customer: session.customer,
          subscription: session.subscription
        });

        break;
      }

      /**
       * Subscription updated (plan change, renewal, etc.)
       */
      case "customer.subscription.updated": {

        const subscription = stripeEvent.data.object;

        console.log("🔄 SUBSCRIPTION UPDATED");

        console.log({
          subscriptionId: subscription.id,
          status: subscription.status,
          customer: subscription.customer
        });

        break;
      }

      /**
       * Subscription cancelled
       */
      case "customer.subscription.deleted": {

        const subscription = stripeEvent.data.object;

        console.log("⛔ SUBSCRIPTION CANCELLED");

        console.log({
          subscriptionId: subscription.id,
          customer: subscription.customer
        });

        break;
      }

      default:
        console.log("ℹ️ Unhandled Stripe event:", stripeEvent.type);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };

  } catch (err) {

    console.error("🔥 Webhook handler error:", err);

    return {
      statusCode: 500,
      body: "Webhook handler failed",
    };

  }

}
