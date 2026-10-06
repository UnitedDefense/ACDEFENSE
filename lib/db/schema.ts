import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  decimal,
  jsonb,
  boolean,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";

// Enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "completed",
  "failed",
  "cancelled",
  "refunded",
]);
export const scheduleStatusEnum = pgEnum("schedule_status", [
  "open",
  "full",
  "cancelled",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);

// "military" is retired (no longer offered on the site) but stays in the
// Postgres enum — values can't be dropped cleanly. "security" added in
// init/012_redesign.sql.
export const audienceEnum = pgEnum("audience", [
  "open_enrollment",
  "law_enforcement",
  "military",
  "security",
]);

export const addonPricingTypeEnum = pgEnum("addon_pricing_type", [
  "flat",
  "quantity",
]);

export const courseCategoryEnum = pgEnum("course_category", [
  "ccl_renewal",
  "defensive_firearms",
  "fcc_advanced",
  "other",
]);

// waitlist = request a date / notify me / sold-out date (the original use);
// private_group and agency are the private-training requests (init/012).
export const waitlistRequestTypeEnum = pgEnum("waitlist_request_type", [
  "waitlist",
  "private_group",
  "agency",
]);

export const waitlistStatusEnum = pgEnum("waitlist_status", [
  "pending",
  "contacted",
  "converted",
  "cancelled",
]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  role: userRoleEnum("role").default("user").notNull(),
  googleCalendarSync: boolean("google_calendar_sync").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OAuth accounts table
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sessions table
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  sessionToken: text("session_token").notNull().unique(),
  expires: timestamp("expires").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Product categories
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  images: jsonb("images").$type<string[]>().default([]),
  inventoryCount: integer("inventory_count").default(0).notNull(),
  categoryId: integer("category_id").references(() => productCategories.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cart items
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  quantity: integer("quantity").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  guestEmail: text("guest_email"),
  guestName: text("guest_name"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  stripePaymentId: text("stripe_payment_id"),
  revereTransactionId: text("revere_transaction_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Order items
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  priceAtPurchase: decimal("price_at_purchase", {
    precision: 10,
    scale: 2,
  }).notNull(),
});

// Courses
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  tagline: text("tagline"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  durationHours: integer("duration_hours").notNull(),
  maxCapacity: integer("max_capacity").notNull(),
  prerequisites: text("prerequisites"),
  imageUrl: text("image_url"),
  audience: audienceEnum("audience").default("open_enrollment").notNull(),
  courseCategory: courseCategoryEnum("course_category").default("other").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Course schedules
export const courseSchedules = pgTable("course_schedules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .references(() => courses.id, { onDelete: "cascade" })
    .notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  availableSeats: integer("available_seats").notNull(),
  status: scheduleStatusEnum("status").default("open").notNull(),
  bookingUrl: text("booking_url"),
  googleCalendarEventId: text("google_calendar_event_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bookings
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  scheduleId: integer("schedule_id")
    .references(() => courseSchedules.id)
    .notNull(),
  paymentStatus: paymentStatusEnum("payment_status")
    .default("pending")
    .notNull(),
  stripePaymentId: text("stripe_payment_id"),
  revereTransactionId: text("revere_transaction_id"),
  constantcontactContactId: text("constantcontact_contact_id"),
  googleCalendarEventId: text("google_calendar_event_id"),
  // Course price snapshotted at booking time (same pattern as
  // bookingAddons.priceAtBooking) so a later admin edit to courses.price can't
  // change what was actually charged / emailed. Nullable — historical rows
  // predate this column and fall back to the live course price.
  coursePriceAtBooking: decimal("course_price_at_booking", {
    precision: 10,
    scale: 2,
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Course add-ons — billable extras a customer can attach to a booking.
// Scoped per-course: each course owns its own list.
export const courseAddons = pgTable("course_addons", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .references(() => courses.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  // "flat" = one-time fee (checkbox). "quantity" = price x quantity (stepper).
  pricingType: addonPricingTypeEnum("pricing_type").default("flat").notNull(),
  maxQuantity: integer("max_quantity").default(10).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Add-ons actually selected on a booking. name/price are snapshotted at booking
// time (same pattern as orderItems.priceAtPurchase) so later admin edits to the
// catalog never rewrite what a customer was already charged.
export const bookingAddons = pgTable("booking_addons", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id, { onDelete: "cascade" })
    .notNull(),
  addonId: integer("addon_id").references(() => courseAddons.id, {
    onDelete: "set null",
  }),
  nameAtBooking: text("name_at_booking").notNull(),
  priceAtBooking: decimal("price_at_booking", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Booking status history
export const bookingStatusHistory = pgTable("booking_status_history", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id, { onDelete: "cascade" })
    .notNull(),
  status: paymentStatusEnum("status").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Blog posts
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content"),
  author: text("author"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Instructor profiles
export const instructorProfiles = pgTable("instructor_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  certifications: text("certifications"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Legal / appointment services
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  durationMinutes: integer("duration_minutes"),
  price: decimal("price", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  bookingUrl: text("booking_url"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Team page client / partner logos
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url").notNull(),
  websiteUrl: text("website_url"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Admin-editable text blocks per page
export const pageContent = pgTable("page_content", {
  id: serial("id").primaryKey(),
  page: text("page").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Newsletter subscriptions
export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  webhookSent: boolean("webhook_sent").default(false).notNull(),
  source: text("source").default("homepage").notNull(),
});

// Contact form submissions
export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Waitlist entries — unifies two public asks with one table via nullable FKs:
//   courseId NULL                      => general "request any class / private training" enquiry
//   courseId set, scheduleId NULL      => "notify me when dates are announced for this course"
//   courseId set, scheduleId set       => "this specific sold-out date, add me to its waitlist"
//
// WARNING: this table's indexes (idx_waitlist_course, idx_waitlist_status, and
// the partial unique index uq_waitlist_request on (email, request_type,
// course_id, schedule_id) WHERE status = 'pending') are declared ONLY in
// init/011_waitlist.sql + init/012_redesign.sql, not below — Drizzle has no model of them. Do NOT run
// `npm run db:push` against a database that has run this migration: db:push
// diffs against this schema file, sees indexes it doesn't know about, and
// will DROP them, silently turning every duplicate waitlist submission into a
// second row instead of a 409.
export const waitlistEntries = pgTable("waitlist_entries", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }),
  scheduleId: integer("schedule_id").references(() => courseSchedules.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  partySize: integer("party_size").default(1).notNull(),
  message: text("message"),
  status: waitlistStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  notifiedAt: timestamp("notified_at"),
  requestType: waitlistRequestTypeEnum("request_type").default("waitlist").notNull(),
  organization: text("organization"),
  contactTitle: text("contact_title"),
  preferredDates: text("preferred_dates"),
  location: text("location"),
});

// Instructor certifications shown on the public /credentials page. fileUrl is
// a certificate scan the owner redacts BEFORE uploading — never render
// anything here that isn't meant to be public.
export const credentials = pgTable("credentials", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  issuer: text("issuer"),
  holderName: text("holder_name"),
  description: text("description"),
  validThrough: date("valid_through", { mode: "string" }),
  fileUrl: text("file_url"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Site settings
export const siteSettings = pgTable("site_settings", {
  key:       text("key").primaryKey(),
  value:     text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
