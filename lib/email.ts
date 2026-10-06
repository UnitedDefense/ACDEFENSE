import { Resend } from "resend";

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "ACDefense Co <noreply@send.acdefenseco.net>";

/**
 * Send an email via Resend. Throws if no API key is configured (so
 * retryWithBackoff's catch turns this into the existing `return false`
 * behavior), and throws if Resend's response contains an `error` — the
 * Resend SDK returns `{data, error}` instead of throwing on API errors, so
 * this must be checked explicitly or failures would look like successes.
 */
async function deliver({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    text,
    html,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}

/**
 * Escape HTML-significant characters in a string before interpolating it
 * into an email template. Item names, course names, and locations here can
 * originate from admin-entered catalog data (or, for guest checkout, from
 * user-supplied names) — never trust them to be safe HTML.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${i + 1} failed:`, error);

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmation(
  to: string,
  bookingDetails: {
    courseName: string;
    startDate: Date;
    endDate: Date;
    location?: string;
    bookingId: number;
  }
): Promise<boolean> {
  try {
    await retryWithBackoff(async () => {
      await deliver({
        to,
        subject: `Booking Confirmation - ${bookingDetails.courseName}`,
        text: `
Thank you for booking ${bookingDetails.courseName}!

Booking ID: #${bookingDetails.bookingId}
Course: ${bookingDetails.courseName}
Start: ${bookingDetails.startDate.toLocaleString()}
End: ${bookingDetails.endDate.toLocaleString()}
Location: ${bookingDetails.location || "ACDefenseCo Training Facility"}

We look forward to seeing you!

Best regards,
ACDefenseCo Team
        `.trim(),
        html: `
<html>
<body>
  <h2>Booking Confirmation</h2>
  <p>Thank you for booking <strong>${escapeHtml(bookingDetails.courseName)}</strong>!</p>
  <ul>
    <li><strong>Booking ID:</strong> #${bookingDetails.bookingId}</li>
    <li><strong>Course:</strong> ${escapeHtml(bookingDetails.courseName)}</li>
    <li><strong>Start:</strong> ${bookingDetails.startDate.toLocaleString()}</li>
    <li><strong>End:</strong> ${bookingDetails.endDate.toLocaleString()}</li>
    <li><strong>Location:</strong> ${escapeHtml(bookingDetails.location || "ACDefenseCo Training Facility")}</li>
  </ul>
  <p>We look forward to seeing you!</p>
  <p>Best regards,<br/>ACDefenseCo Team</p>
</body>
</html>
        `.trim(),
      });
    });

    console.log(`Booking confirmation email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Failed to send booking confirmation email:", error);
    return false;
  }
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceipt(
  to: string,
  paymentDetails: {
    orderId: number;
    amount: number;
    items: Array<{ name: string; quantity: number; price: number }>;
    stripePaymentId?: string;
  }
): Promise<boolean> {
  try {
    await retryWithBackoff(async () => {
      const itemsList = paymentDetails.items
        .map(
          (item) =>
            `${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`
        )
        .join("\n");

      await deliver({
        to,
        subject: `Payment Receipt - Order #${paymentDetails.orderId}`,
        text: `
Thank you for your payment!

Order ID: #${paymentDetails.orderId}
${paymentDetails.stripePaymentId ? `Payment ID: ${paymentDetails.stripePaymentId}` : ""}

Items:
${itemsList}

Total: $${paymentDetails.amount.toFixed(2)}

Best regards,
ACDefenseCo Team
        `.trim(),
        html: `
<html>
<body>
  <h2>Payment Receipt</h2>
  <p>Thank you for your payment!</p>
  <p><strong>Order ID:</strong> #${paymentDetails.orderId}</p>
  ${paymentDetails.stripePaymentId ? `<p><strong>Payment ID:</strong> ${escapeHtml(paymentDetails.stripePaymentId)}</p>` : ""}
  <h3>Items:</h3>
  <ul>
    ${paymentDetails.items.map((item) => `<li>${escapeHtml(item.name)} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}</li>`).join("")}
  </ul>
  <p><strong>Total: $${paymentDetails.amount.toFixed(2)}</strong></p>
  <p>Best regards,<br/>ACDefenseCo Team</p>
</body>
</html>
        `.trim(),
      });
    });

    console.log(`Payment receipt email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Failed to send payment receipt email:", error);
    return false;
  }
}

/**
 * Send course reminder email (24 hours before)
 */
export async function sendCourseReminder(
  to: string,
  courseDetails: {
    courseName: string;
    startDate: Date;
    location?: string;
  }
): Promise<boolean> {
  try {
    await retryWithBackoff(async () => {
      await deliver({
        to,
        subject: `Course Reminder - ${courseDetails.courseName} starts tomorrow`,
        text: `
This is a reminder that your course starts tomorrow!

Course: ${courseDetails.courseName}
Start: ${courseDetails.startDate.toLocaleString()}
Location: ${courseDetails.location || "ACDefenseCo Training Facility"}

Please arrive 15 minutes early for check-in.

Best regards,
ACDefenseCo Team
        `.trim(),
        html: `
<html>
<body>
  <h2>Course Reminder</h2>
  <p>This is a reminder that your course starts tomorrow!</p>
  <ul>
    <li><strong>Course:</strong> ${courseDetails.courseName}</li>
    <li><strong>Start:</strong> ${courseDetails.startDate.toLocaleString()}</li>
    <li><strong>Location:</strong> ${courseDetails.location || "ACDefenseCo Training Facility"}</li>
  </ul>
  <p>Please arrive 15 minutes early for check-in.</p>
  <p>Best regards,<br/>ACDefenseCo Team</p>
</body>
</html>
        `.trim(),
      });
    });

    console.log(`Course reminder email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Failed to send course reminder email:", error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(
  to: string,
  resetDetails: {
    resetToken: string;
    resetUrl: string;
  }
): Promise<boolean> {
  try {
    await retryWithBackoff(async () => {
      await deliver({
        to,
        subject: "Password Reset Request",
        text: `
You requested a password reset for your ACDefenseCo account.

Click the link below to reset your password:
${resetDetails.resetUrl}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
ACDefenseCo Team
        `.trim(),
        html: `
<html>
<body>
  <h2>Password Reset Request</h2>
  <p>You requested a password reset for your ACDefenseCo account.</p>
  <p>Click the button below to reset your password:</p>
  <p>
    <a href="${resetDetails.resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 4px;">
      Reset Password
    </a>
  </p>
  <p>Or copy and paste this link: ${resetDetails.resetUrl}</p>
  <p>This link will expire in 1 hour.</p>
  <p>If you didn't request this, please ignore this email.</p>
  <p>Best regards,<br/>ACDefenseCo Team</p>
</body>
</html>
        `.trim(),
      });
    });

    console.log(`Password reset email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
}

export type TrainingRequestType = "waitlist" | "private_group" | "agency";

/**
 * Send the requester a confirmation for a waitlist / private-group / agency
 * training request.
 */
export async function sendWaitlistConfirmation(
  to: string,
  data: {
    name: string;
    courseName?: string;
    requestType?: TrainingRequestType;
  }
): Promise<boolean> {
  const requestType = data.requestType ?? "waitlist";
  try {
    await retryWithBackoff(async () => {
      if (requestType === "waitlist") {
        const courseLine = data.courseName ? `for ${data.courseName}` : "for upcoming training";
        await deliver({
          to,
          subject: data.courseName
            ? `You're on the waitlist - ${data.courseName}`
            : "We received your class request",
          text: `
Hi ${data.name},

Thanks for your interest ${courseLine}. We've added you to our waitlist and will reach out as soon as seats or new dates become available.

Best regards,
ACDefenseCo Team
          `.trim(),
          html: `
<html>
<body>
  <h2>You're on the list</h2>
  <p>Hi ${escapeHtml(data.name)},</p>
  <p>Thanks for your interest ${
    data.courseName ? `in <strong>${escapeHtml(data.courseName)}</strong>` : "in training with us"
  }. We've added you to our waitlist and will reach out as soon as seats or new dates become available.</p>
  <p>Best regards,<br/>ACDefenseCo Team</p>
</body>
</html>
          `.trim(),
        });
        return;
      }

      const what = requestType === "agency" ? "agency training request" : "private group training request";
      const courseText = data.courseName ? ` for ${data.courseName}` : "";
      await deliver({
        to,
        subject: `We received your ${what}`,
        text: `
Hi ${data.name},

Thanks for reaching out about ${requestType === "agency" ? "training for your agency" : "a private group class"}${courseText}. A training coordinator will contact you to confirm dates, headcount and location.

Best regards,
ACDefenseCo Team
        `.trim(),
        html: `
<html>
<body>
  <h2>Request received</h2>
  <p>Hi ${escapeHtml(data.name)},</p>
  <p>Thanks for reaching out about ${
    requestType === "agency" ? "training for your agency" : "a private group class"
  }${data.courseName ? ` for <strong>${escapeHtml(data.courseName)}</strong>` : ""}. A training coordinator will contact you to confirm dates, headcount and location.</p>
  <p>Best regards,<br/>ACDefenseCo Team</p>
</body>
</html>
        `.trim(),
      });
    });

    console.log(`Training request confirmation (${requestType}) sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Failed to send waitlist confirmation email:", error);
    return false;
  }
}

/**
 * Notify the business that a training request came in. Goes to
 * TRAINING_REQUEST_NOTIFY_EMAIL; when that isn't set this is a no-op (returns
 * false) — requests are still visible in Admin -> Waitlist either way.
 */
export async function sendTrainingRequestNotification(data: {
  requestType: TrainingRequestType;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  contactTitle?: string;
  courseName?: string;
  partySize: number;
  preferredDates?: string;
  location?: string;
  message?: string;
}): Promise<boolean> {
  const to = process.env.TRAINING_REQUEST_NOTIFY_EMAIL;
  if (!to) return false;

  const label =
    data.requestType === "agency"
      ? "Agency training request"
      : data.requestType === "private_group"
        ? "Private group request"
        : "Waitlist / class request";
  const rows: [string, string | number | undefined][] = [
    ["Type", label],
    ["Name", data.name],
    ["Title / rank", data.contactTitle],
    ["Organization", data.organization],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Course", data.courseName ?? "Any / not specified"],
    ["Headcount", data.partySize],
    ["Preferred dates", data.preferredDates],
    ["Location", data.location],
    ["Message", data.message],
  ];
  const present = rows.filter(([, v]) => v !== undefined && v !== "");

  try {
    await retryWithBackoff(async () => {
      await deliver({
        to,
        subject: `${label}: ${data.organization ?? data.name}`,
        text: present.map(([k, v]) => `${k}: ${v}`).join("\n"),
        html: `
<html>
<body>
  <h2>${escapeHtml(label)}</h2>
  <table cellpadding="4">
    ${present
      .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(String(v))}</td></tr>`)
      .join("\n    ")}
  </table>
</body>
</html>
        `.trim(),
      });
    });
    return true;
  } catch (error) {
    console.error("Failed to send training request notification:", error);
    return false;
  }
}
