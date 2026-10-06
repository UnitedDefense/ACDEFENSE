-- Snapshot the course price at booking time so a later admin edit to
-- courses.price can never change what was actually charged or emailed.
-- Nullable: historical rows predate this column and fall back to the live
-- course price (booking.coursePriceAtBooking ?? course.price).

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS course_price_at_booking NUMERIC(10,2);
