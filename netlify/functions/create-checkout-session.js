const Stripe = require("stripe");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing STRIPE_SECRET_KEY environment variable." })
      };
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const body = JSON.parse(event.body || "{}");
    const amount = Math.round(parseFloat(body.donationAmount) * 100);

    if (!amount || amount < 100) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid donation amount." })
      };
    }

    const proto =
      event.headers["x-forwarded-proto"] ||
      event.headers["X-Forwarded-Proto"] ||
      "https";

    const host =
      event.headers["x-forwarded-host"] ||
      event.headers["host"];

    const baseUrl = `${proto}://${host}`;

    const successParams = new URLSearchParams({
      submitted: "1",
      options: String(body.supportOptions || "Donate to Antonio"),
      amount: String(body.donationAmount || ""),
      email: String(body.email || ""),
      firstName: String(body.firstName || ""),
      lastName: String(body.lastName || "")
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${baseUrl}/support/thank-you/?${successParams.toString()}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/support/#campaign-form`,
      customer_email: body.email || undefined,
      billing_address_collection: "required",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Campaign Donation",
              description: "Committee to Elect Antonio Baciu for City Council District 5 '26"
            },
            unit_amount: amount
          },
          quantity: 1
        }
      ],
      metadata: {
        first_name: body.firstName || "",
        last_name: body.lastName || "",
        employer: body.employer || "",
        occupation: body.occupation || "",
        phone: body.phone || "",
        email: body.email || "",
        address_1: body.address1 || "",
        address_2: body.address2 || "",
        city: body.city || "",
        state: body.state || "",
        zip: body.zip || "",
        country: body.country || "",
        donation_amount: String(body.donationAmount || ""),
        support_options: body.supportOptions || ""
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };
  } catch (error) {
    console.error("create-checkout-session error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Server error"
      })
    };
  }
};
