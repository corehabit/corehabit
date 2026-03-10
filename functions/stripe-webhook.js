import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Connect to Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function handler(event) {

  const signature = event.headers["stripe-signature"];

  let rawBody = event.body;

  // Netlify sometimes sends body as base64
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

    console.error("❌ Stripe signature verification failed:", err.message);

    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`
    };

  }

  try {

    switch (stripeEvent.type) {

      /**
       * USER COMPLETES CHECKOUT
       */
      case "checkout.session.completed": {

        const session = stripeEvent.data.object;

        const email = session.customer_details?.email;

        console.log("✅ CHECKOUT COMPLETED:", email);

        // Update Supabase profile
        const { error } = await supabase
          .from("profiles")
          .update({ premium_status: true })
          .eq("email", email);

        if (error) {

          console.error("❌ Supabase update error:", error);

        } else {

          console.log("🔥 Premium activated for:", email);

        }

        break;
      }

      /**
       * SUBSCRIPTION UPDATED
       */
      case "customer.subscription.updated": {

        const subscription = stripeEvent.data.object;

        console.log("🔄 Subscription updated:", subscription.id);

        break;
      }

      /**
       * SUBSCRIPTION CANCELLED
       */
      case "customer.subscription.deleted": {

        const subscription = stripeEvent.data.object;

        console.log("⛔ Subscription cancelled:", subscription.id);

        break;
      }

      default:
        console.log("ℹ️ Unhandled Stripe event:", stripeEvent.type);

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
