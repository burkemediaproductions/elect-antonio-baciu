const { Resend } = require("resend");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing RESEND_API_KEY environment variable." })
      };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const data = JSON.parse(event.body || "{}");

    const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || "Unknown Supporter";
    const selected = String(data.supportOptions || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const wantsDonation = selected.includes("Donate to Antonio");
    const wantsEndorsement = selected.includes("Endorse Antonio");
    const wantsVolunteer = selected.includes("Volunteer to help Antonio's campaign");

    const requestTypes = [];
    if (wantsEndorsement) requestTypes.push("Endorsement");
    if (wantsDonation) requestTypes.push("Donation");
    if (wantsVolunteer) requestTypes.push("Volunteer Request");

    const subject = `${requestTypes.length ? requestTypes.join("/") : "Support Form"} from ${fullName}`;

    const sections = [];

    sections.push(`
      <h2>${escapeHtml(subject)}</h2>
      <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(data.email || "")}</p>
      <p><strong>Phone:</strong> ${escapeHtml(data.phone || "")}</p>
      ${data["title-occupation"] ? `<p><strong>Title / Organization / Community Role:</strong> ${escapeHtml(data["title-occupation"])}</p>` : ""}
      <p><strong>Selected Support Options:</strong> ${escapeHtml(data.supportOptions || "")}</p>
    `);

    if (wantsEndorsement) {
      sections.push(`
        <hr>
        <h3>Endorsement Details</h3>
        <p><strong>Endorser Type:</strong> ${escapeHtml(data.endorserType || data["endorser-type"] || "")}</p>
        ${data["endorsement-individual-name"] ? `<p><strong>Individual Name:</strong> ${escapeHtml(data["endorsement-individual-name"])}</p>` : ""}
        ${data["endorsement-group-name"] ? `<p><strong>Group Name:</strong> ${escapeHtml(data["endorsement-group-name"])}</p>` : ""}
        ${data["endorsement-business-organization-name"] ? `<p><strong>Business / Organization:</strong> ${escapeHtml(data["endorsement-business-organization-name"])}</p>` : ""}
        ${data["endorsement-message"] ? `<p><strong>Endorsement Message:</strong><br>${escapeHtml(data["endorsement-message"])}</p>` : ""}
        <p><strong>Public Consent:</strong> ${escapeHtml(data["endorsement-public-consent"] || "")}</p>
      `);
    }

    if (wantsDonation) {
      sections.push(`
        <hr>
        <h3>Donation Details</h3>
        <p><strong>Donation Amount:</strong> ${escapeHtml(formatMoney(data.donationAmount))}</p>
        <p><strong>Employer:</strong> ${escapeHtml(data.employer || data["donation-employer"] || "")}</p>
        <p><strong>Occupation:</strong> ${escapeHtml(data.occupation || data["donation-occupation"] || "")}</p>
        <p><strong>Address:</strong><br>
          ${escapeHtml(data.address1 || data["donation-address-line-1"] || "")}<br>
          ${escapeHtml(data.address2 || data["donation-address-line-2"] || "")}<br>
          ${escapeHtml(data.city || data["donation-city"] || "")}, ${escapeHtml(data.state || data["donation-state-region"] || "")} ${escapeHtml(data.zip || data["donation-zip-postal"] || "")}<br>
          ${escapeHtml(data.country || data["donation-country"] || "")}
        </p>
      `);
    }

    if (wantsVolunteer) {
      sections.push(`
        <hr>
        <h3>Volunteer Details</h3>
        <p><strong>Help Areas:</strong> ${escapeHtml(data.volunteerHelpAreas || data["volunteer-help-areas"] || "")}</p>
        ${data["volunteer-help-other"] ? `<p><strong>Other:</strong> ${escapeHtml(data["volunteer-help-other"])}</p>` : ""}
        <p><strong>Availability:</strong> ${escapeHtml(data.volunteerAvailability || data["volunteer-availability"] || "")}</p>
      `);
    }

    if (data.message) {
      sections.push(`
        <hr>
        <h3>Additional Message</h3>
        <p>${escapeHtml(data.message)}</p>
      `);
    }

    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.6; color:#222;">
        ${sections.join("\n")}
      </div>
    `;

    const campaignEmails = (process.env.CAMPAIGN_NOTIFICATION_EMAILS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    const fromEmail = process.env.EMAIL_FROM;

    if (!campaignEmails.length || !fromEmail) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Missing CAMPAIGN_NOTIFICATION_EMAILS or EMAIL_FROM environment variable."
        })
      };
    }

    await resend.emails.send({
      from: fromEmail,
      to: campaignEmails,
      replyTo: data.email || undefined,
      subject,
      html
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (error) {
    console.error("send-support-email error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Server error"
      })
    };
  }
};

function formatMoney(value) {
  if (!value) return "";
  const numeric = Number(String(value).replace(/[^0-9.]/g, ""));
  if (!numeric) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(numeric);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
