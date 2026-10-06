import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { formatCourseDate, formatPrice } from "@/lib/course-format";
import type { UpcomingDate } from "@/lib/courses";

export function UpcomingDates({ dates, emptyHref = "/request-training?type=waitlist" }: { dates: UpcomingDate[]; emptyHref?: string }) {
  if (dates.length === 0) {
    return (
      <div className="callout p-6">
        <p className="heading text-lg text-ink">New dates are being scheduled</p>
        <p className="text-ink-muted mt-1">
          Tell us which course you want and when — we&apos;ll reach out as soon as a date opens.
        </p>
        <Link href={emptyHref} className="btn btn-primary btn-sm mt-4">
          Request a Date
        </Link>
      </div>
    );
  }

  return (
    <ul className="card divide-y divide-line">
      {dates.map((d) => {
        const soldOut = d.availableSeats <= 0;
        return (
          <li key={d.scheduleId} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 p-4 sm:px-6">
            <div className="flex items-center gap-3 sm:w-48 shrink-0">
              <CalendarDays className="h-5 w-5 text-brand-red shrink-0" aria-hidden="true" />
              <span className="font-semibold text-ink">{formatCourseDate(d.startDate, { weekday: true })}</span>
            </div>
            <div className="flex-1 min-w-0">
              <Link href={`/courses/${d.courseSlug}`} className="heading text-base text-ink hover:text-brand-blue">
                {d.courseName}
              </Link>
              <p className="text-sm text-ink-muted">
                {formatPrice(d.price)} ·{" "}
                {soldOut ? (
                  <span className="text-brand-red font-medium">Sold out — waitlist open</span>
                ) : (
                  `${d.availableSeats} seat${d.availableSeats === 1 ? "" : "s"} left`
                )}
              </p>
            </div>
            <Link href={`/courses/${d.courseSlug}`} className={`btn btn-sm ${soldOut ? "btn-outline" : "btn-primary"} shrink-0`}>
              {soldOut ? "Join waitlist" : "Book a seat"}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
