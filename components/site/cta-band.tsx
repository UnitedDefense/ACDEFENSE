import Link from "next/link";

/** Full-width blue call-to-action band used at the bottom of landing pages. */
export function CtaBand({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body?: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <section className="bg-brand-blue text-white">
      <div className="container mx-auto px-4 py-14 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
        <div>
          <h2 className="heading text-3xl md:text-4xl">{title}</h2>
          {body && <p className="mt-3 text-white/85 text-lg max-w-2xl">{body}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={primary.href} className="btn btn-primary">
            {primary.label}
          </Link>
          {secondary && (
            <Link href={secondary.href} className="btn btn-outline-light">
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
