const Stripe = require("stripe");
const { Resend } = require("resend");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const resend = new Resend(process.env.RESEND_API_KEY || "");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return { statusCode: 500, body: "Missing Stripe webhook configuration." };
    }

    const signature = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
    if (!signature) {
      return { statusCode: 400, body: "Missing Stripe signature." };
    }

    const stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      const metadata = session.metadata || {};

      const fullName = [metadata.first_name, metadata.last_name].filter(Boolean).join(" ").trim() || "Unknown donor";
      const amountNumber = typeof session.amount_total === "number" ? session.amount_total / 100 : null;
      const amountFormatted = amountNumber !== null
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: (session.currency || "usd").toUpperCase() }).format(amountNumber)
        : "Unknown amount";

      const campaignEmails = (process.env.CAMPAIGN_NOTIFICATION_EMAILS || "")
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      const fromEmail = process.env.EMAIL_FROM;

      if (process.env.RESEND_API_KEY && campaignEmails.length && fromEmail) {
        const html = `
          <div style="font-family: Arial, sans-serif; line-height:1.6; color:#222;">
            <h2>New Donation Received</h2>
            <p>A donation was completed through Stripe Checkout.</p>
            <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse; width:100%; max-width:760px;">
              <tr><td><strong>Name</strong></td><td>${escapeHtml(fullName)}</td></tr>
              <tr><td><strong>Email</strong></td><td>${escapeHtml(session.customer_email || metadata.email || "")}</td></tr>
              <tr><td><strong>Phone</strong></td><td>${escapeHtml(metadata.phone || "")}</td></tr>
              <tr><td><strong>Employer</strong></td><td>${escapeHtml(metadata.employer || "")}</td></tr>
              <tr><td><strong>Occupation</strong></td><td>${escapeHtml(metadata.occupation || "")}</td></tr>
              <tr><td><strong>Donation Amount</strong></td><td>${escapeHtml(amountFormatted)}</td></tr>
              <tr><td><strong>Street Address</strong></td><td>${escapeHtml(metadata.address_1 || "")}</td></tr>
              <tr><td><strong>Address Line 2</strong></td><td>${escapeHtml(metadata.address_2 || "")}</td></tr>
              <tr><td><strong>City</strong></td><td>${escapeHtml(metadata.city || "")}</td></tr>
              <tr><td><strong>State / Region</strong></td><td>${escapeHtml(metadata.state || "")}</td></tr>
              <tr><td><strong>ZIP / Postal</strong></td><td>${escapeHtml(metadata.zip || "")}</td></tr>
              <tr><td><strong>Country</strong></td><td>${escapeHtml(metadata.country || "")}</td></tr>
              <tr><td><strong>Stripe Session ID</strong></td><td>${escapeHtml(session.id || "")}</td></tr>
              <tr><td><strong>Payment Status</strong></td><td>${escapeHtml(session.payment_status || "")}</td></tr>
            </table>
          </div>
        `;

        await resend.emails.send({
          from: fromEmail,
          to: campaignEmails,
          subject: `New donation received from ${fullName}`,
          html
        });
      }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error) {
    console.error("stripe-webhook error:", error);
    return { statusCode: 400, body: `Webhook Error: ${error.message}` };
  }
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
