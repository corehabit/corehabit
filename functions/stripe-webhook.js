import Stripe from "stripe";
import { markPremium } from "./premiumStore"; // ✅ NEW

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Normalize subscription data so all events
 * produce the same shape of record.
 */
function normalizeSubscription({
  email,
  customerId,
  subscriptionId,
  plan,
  status,
}) {
  return {
    email,
    customerId,
    subscriptionId,
    plan,
    status,
    updatedAt: new Date().toISOString(),
  };
}

export async function handler(event) {
  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  try {
    switch (stripeEvent.type) {

      /**
       * Fired when a user completes checkout successfully
       * (monthly or annual).
       */
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;

        // ✅ NEW: mark this checkout session as premium
        markPremium(session.id);

        // Fetch line items to determine which price was purchased
        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id,
          { limit: 1 }
        );

        const priceId = lineItems.data[0]?.price?.id;

        const plan =
          priceId === process.env.STRIPE_PRICE_MONTHLY
            ? "monthly"
            : priceId === process.env.STRIPE_PRICE_ANNUAL
            ? "annual"
            : "unknown";

        const record = normalizeSubscription({
          email: session.customer_details?.email || null,
          customerId: session.customer,
          subscriptionId: session.subscription,
          plan,
          status: "active",
        });

        console.log("✅ PREMIUM ACTIVATED:", record);

        // 🔜 Later: persist record to database / KV store
        break;
      }

      /**
       * Fired when a subscription changes state
       * (active, past_due, unpaid, paused, etc.)
       */
      case "customer.subscription.updated": {
        const subscription = stripeEvent.data.object;

        const priceId = subscription.items.data[0]?.price?.id;

        const plan =
          priceId === process.env.STRIPE_PRICE_MONTHLY
            ? "monthly"
            : priceId === process.env.STRIPE_PRICE_ANNUAL
            ? "annual"
            : "unknown";

        const record = normalizeSubscription({
          email: null, // Stripe does not always include email here
          customerId: subscription.customer,
          subscriptionId: subscription.id,
          plan,
          status: subscription.status,
        });

        console.log("🔄 SUBSCRIPTION UPDATED:", record);

        // 🔜 Later: update stored subscription status
        break;
      }

      /**
       * Fired when a subscription is canceled or expires
       */
      case "customer.subscription.deleted": {
        const subscription = stripeEvent.data.object;

        const record = normalizeSubscription({
          email: null,
          customerId: subscription.customer,
          subscriptionId: subscription.id,
          plan: null,
          status: "canceled",
        });

        console.log("⛔ PREMIUM CANCELED:", record);

        // 🔜 Later: revoke premium access
        break;
      }

      default:
        console.log("ℹ️ Unhandled event type:", stripeEvent.type);
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
