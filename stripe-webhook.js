import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    console.error("Webhook signature verification failed.", err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  // 🔔 Handle events
  switch (stripeEvent.type) {

    case "checkout.session.completed": {
      const session = stripeEvent.data.object;

      // Identify plan
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0].price.id;

      const plan =
        priceId === process.env.STRIPE_PRICE_MONTHLY
          ? "monthly"
          : "annual";

      // TODO: save to database
      console.log("NEW PREMIUM USER:", {
        email: session.customer_details.email,
        customerId: session.customer,
        subscriptionId: session.subscription,
        plan,
        status: "active",
      });

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = stripeEvent.data.object;

      // TODO: mark user as inactive
      console.log("SUBSCRIPTION CANCELED:", subscription.id);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = stripeEvent.data.object;

      // TODO: update status (past_due, active, etc.)
      console.log("SUBSCRIPTION UPDATED:", subscription.id);
      break;
    }

    default:
      console.log(`Unhandled event type ${stripeEvent.type}`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
}
