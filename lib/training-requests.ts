// Shared between the public request form (client) and /api/waitlist (server).
// Keep free of server-only imports.

export const REQUEST_TYPES = ["waitlist", "private_group", "agency"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  waitlist: "Request a date",
  private_group: "Private group",
  agency: "Agency training",
};

export const LOCATIONS = ["our_range", "on_site", "flexible"] as const;
export type TrainingLocation = (typeof LOCATIONS)[number];

export const LOCATION_LABELS: Record<TrainingLocation, string> = {
  our_range: "At our range",
  on_site: "On-site at your facility",
  flexible: "Flexible",
};
