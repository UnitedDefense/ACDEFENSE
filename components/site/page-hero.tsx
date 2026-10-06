import Link from "next/link";

type Crumb = { label: string; href?: string };

/** Blue header band used at the top of every interior page. */
export function PageHero({
  eyebrow,
  title,
  intro,
  crumbs,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: React.ReactNode;
  crumbs?: Crumb[];
  children?: React.ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="container mx-auto px-4 py-12 md:py-16">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-white/70">
              {crumbs.map((c, i) => (
                <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-white underline-offset-2 hover:underline">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-white" aria-current="page">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="heading text-sm tracking-[0.16em] text-white/75 mb-2">{eyebrow}</p>}
        <h1 className="heading text-4xl md:text-5xl text-white max-w-4xl">{title}</h1>
        {intro && <div className="mt-4 text-white/85 text-lg leading-relaxed max-w-3xl">{intro}</div>}
        {children && <div className="mt-7 flex flex-wrap gap-3">{children}</div>}
      </div>
    </section>
  );
}

/** Section title with optional red kicker and lead paragraph. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  id,
}: {
  eyebrow?: string;
  title: string;
  lead?: React.ReactNode;
  align?: "left" | "center";
  id?: string;
}) {
  return (
    <div className={align === "center" ? "text-center max-w-2xl mx-auto" : "max-w-3xl"}>
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h2 id={id} className="heading text-3xl md:text-4xl text-ink">{title}</h2>
      {lead && <p className="mt-3 text-ink-muted text-lg leading-relaxed">{lead}</p>}
    </div>
  );
}
