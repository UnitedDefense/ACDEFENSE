import { and, asc, eq, gt, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { courses, courseSchedules } from "@/lib/db/schema";
import { AUDIENCES, type PublicAudience } from "@/lib/site-nav";
import { isRequestOnly } from "@/lib/course-format";

export { formatCourseDate, formatPrice, isRequestOnly } from "@/lib/course-format";

export type CourseRow = typeof courses.$inferSelect;

const PUBLIC_AUDIENCES = Object.keys(AUDIENCES) as PublicAudience[];

export async function getCoursesByAudience(audience: PublicAudience): Promise<CourseRow[]> {
  return db.select().from(courses).where(eq(courses.audience, audience)).orderBy(asc(courses.name));
}

/** Course picker options for request forms — public audiences only. */
export async function getRequestableCourses() {
  return db
    .select({ id: courses.id, name: courses.name, audience: courses.audience })
    .from(courses)
    .where(inArray(courses.audience, PUBLIC_AUDIENCES))
    .orderBy(asc(courses.name));
}

export type UpcomingDate = {
  scheduleId: number;
  startDate: Date;
  endDate: Date;
  availableSeats: number;
  courseId: number;
  courseName: string;
  courseSlug: string;
  price: string;
  audience: string;
};

/**
 * Next scheduled public dates (not cancelled, starting in the future) for the
 * given audiences. Law-enforcement dates are never listed publicly.
 */
export async function getUpcomingDates(
  audiences: PublicAudience[] = ["open_enrollment", "security"],
  limit = 6
): Promise<UpcomingDate[]> {
  const bookable = audiences.filter((a) => !isRequestOnly(a));
  if (bookable.length === 0) return [];
  return db
    .select({
      scheduleId: courseSchedules.id,
      startDate: courseSchedules.startDate,
      endDate: courseSchedules.endDate,
      availableSeats: courseSchedules.availableSeats,
      courseId: courses.id,
      courseName: courses.name,
      courseSlug: courses.slug,
      price: courses.price,
      audience: courses.audience,
    })
    .from(courseSchedules)
    .innerJoin(courses, eq(courseSchedules.courseId, courses.id))
    .where(
      and(
        gt(courseSchedules.startDate, new Date()),
        ne(courseSchedules.status, "cancelled"),
        inArray(courses.audience, bookable)
      )
    )
    .orderBy(asc(courseSchedules.startDate))
    .limit(limit);
}
