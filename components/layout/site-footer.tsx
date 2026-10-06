import Image from "next/image";
import Link from "next/link";
import { ABOUT_GROUP, NAV_GROUPS, NAV_LINKS, SOCIAL_LINKS } from "@/lib/site-nav";

export function SiteFooter() {
  const columns = [...NAV_GROUPS, { ...ABOUT_GROUP, links: [...ABOUT_GROUP.links, ...NAV_LINKS] }];

  return (
    <footer className="bg-charcoal text-white mt-auto">
      <div className="flag-rule" />
      <div className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)] gap-10">
          <div>
            <Image
              src="/images/LOGOSHOT.jpg"
              alt="American Civil Defense Company"
              width={1527}
              height={468}
              className="h-12 w-auto"
            />
            <p className="text-white/70 text-sm leading-relaxed mt-4 max-w-xs">
              American Civil Defense Company — Chicago-based firearms and defensive training for
              civilians, law enforcement and armed security professionals. Veteran-owned &amp; operated.
            </p>
            <Link href="/request-training" className="btn btn-primary btn-sm mt-6">
              Request Training
            </Link>
          </div>

          {columns.map((group) => (
            <div key={group.label}>
              <p className="heading text-sm tracking-[0.12em] text-white mb-4">{group.label}</p>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white/70 hover:text-white transition-colors"
                      >
                        {link.label} ↗
                      </a>
                    ) : (
                      <Link href={link.href} className="text-sm text-white/70 hover:text-white transition-colors">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/15 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/60 text-xs">
            © {new Date().getFullYear()} American Civil Defense Company. All rights reserved.
          </p>
          <ul className="flex flex-wrap justify-center gap-5">
            {SOCIAL_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="heading text-xs tracking-[0.12em] text-white/70 hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
