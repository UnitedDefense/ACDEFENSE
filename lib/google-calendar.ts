import { google } from "googleapis";
import { db } from "@/lib/db";
import { accounts, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const calendar = google.calendar("v3");

/**
 * Get OAuth2 client for a user
 */
async function getOAuth2Client(userId: number) {
  // Fetch user's Google account
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);

  if (!account || account.provider !== "google") {
    throw new Error("No Google account found for user");
  }

  if (!account.accessToken) {
    throw new Error("No access token found for user");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.expiresAt ? account.expiresAt * 1000 : undefined,
  });

  // Handle automatic token refresh
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await db
        .update(accounts)
        .set({
          accessToken: tokens.access_token,
          expiresAt: tokens.expiry_date
            ? Math.floor(tokens.expiry_date / 1000)
            : null,
        })
        .where(eq(accounts.id, account.id));
    }
  });

  return oauth2Client;
}

/**
 * Create a Google Calendar event for a course booking
 */
export async function createCalendarEvent(
  userId: number,
  courseDetails: {
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    location?: string;
  }
): Promise<string | null> {
  try {
    // Check if user has calendar sync enabled
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.googleCalendarSync === false) {
      console.log(`Calendar sync disabled for user ${userId}`);
      return null;
    }

    const oauth2Client = await getOAuth2Client(userId);

    const event = {
      summary: courseDetails.name,
      description: courseDetails.description || "",
      location: courseDetails.location || "ACDefenseCo Training Facility",
      start: {
        dateTime: courseDetails.startDate.toISOString(),
        timeZone: "America/New_York",
      },
      end: {
        dateTime: courseDetails.endDate.toISOString(),
        timeZone: "America/New_York",
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 }, // 24 hours before
          { method: "popup", minutes: 60 }, // 1 hour before
        ],
      },
    };

    const response = await calendar.events.insert({
      auth: oauth2Client,
      calendarId: "primary",
      requestBody: event,
    });

    if (response.data.id) {
      console.log(`Calendar event created: ${response.data.id}`);
      return response.data.id;
    }

    return null;
  } catch (error) {
    console.error("Error creating calendar event:", error);
    // Don't throw - log and continue (per design doc: don't block booking)
    return null;
  }
}

/**
 * Delete a Google Calendar event
 */
export async function deleteCalendarEvent(
  userId: number,
  eventId: string
): Promise<boolean> {
  try {
    const oauth2Client = await getOAuth2Client(userId);

    await calendar.events.delete({
      auth: oauth2Client,
      calendarId: "primary",
      eventId: eventId,
    });

    console.log(`Calendar event deleted: ${eventId}`);
    return true;
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    // Don't throw - log and continue
    return false;
  }
}

/**
 * Update a Google Calendar event
 */
export async function updateCalendarEvent(
  userId: number,
  eventId: string,
  courseDetails: {
    name?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    location?: string;
  }
): Promise<boolean> {
  try {
    const oauth2Client = await getOAuth2Client(userId);

    const event: any = {};

    if (courseDetails.name) event.summary = courseDetails.name;
    if (courseDetails.description) event.description = courseDetails.description;
    if (courseDetails.location) event.location = courseDetails.location;
    if (courseDetails.startDate) {
      event.start = {
        dateTime: courseDetails.startDate.toISOString(),
        timeZone: "America/New_York",
      };
    }
    if (courseDetails.endDate) {
      event.end = {
        dateTime: courseDetails.endDate.toISOString(),
        timeZone: "America/New_York",
      };
    }

    await calendar.events.patch({
      auth: oauth2Client,
      calendarId: "primary",
      eventId: eventId,
      requestBody: event,
    });

    console.log(`Calendar event updated: ${eventId}`);
    return true;
  } catch (error) {
    console.error("Error updating calendar event:", error);
    // Don't throw - log and continue
    return false;
  }
}
