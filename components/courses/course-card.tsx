import Link from "next/link";
import { formatPrice, isRequestOnly } from "@/lib/course-format";
import type { CourseRow } from "@/lib/courses";
import { SafeImage } from "@/components/site/safe-image";

export function CourseCard({ course }: { course: CourseRow }) {
  const requestOnly = isRequestOnly(course.audience);
  return (
    <article className="card card-hover overflow-hidden flex flex-col">
      <Link href={`/courses/${course.slug}`} className="relative block aspect-[16/10] bg-surface overflow-hidden" tabIndex={-1} aria-hidden="true">
        <SafeImage
          src={course.imageUrl}
          alt=""
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
      </Link>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="heading text-lg text-ink">
          <Link href={`/courses/${course.slug}`} className="hover:text-brand-blue">
            {course.name}
          </Link>
        </h3>
        {course.tagline && <p className="text-ink-muted text-sm mt-1.5 line-clamp-2">{course.tagline}</p>}
        <div className="mt-auto pt-5 flex items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            {course.durationHours ? `${course.durationHours} hrs` : null}
            {!requestOnly && course.price && (
              <span className="ml-2 font-semibold text-ink text-base">{formatPrice(course.price)}</span>
            )}
            {requestOnly && <span className="ml-2 font-medium text-brand-blue">Private / agency</span>}
          </p>
          <Link href={`/courses/${course.slug}`} className="btn btn-outline btn-sm">
            {requestOnly ? "Details" : "View dates"}
          </Link>
        </div>
      </div>
    </article>
  );
}
