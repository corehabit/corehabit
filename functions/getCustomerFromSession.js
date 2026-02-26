import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method Not Allowed"
      };
    }

    const { sessionId, userId } = JSON.parse(event.body || "{}");

    if (!sessionId || !userId) {
      return {
        statusCode: 400,
        body: "Missing sessionId or userId"
      };
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const customerId = session.customer;

    // ✅ Save premium + stripe_customer_id
    await supabase
      .from("profiles")
      .update({
        premium_status: true,
        stripe_customer_id: customerId
      })
      .eq("id", userId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true
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
