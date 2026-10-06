import Link from "next/link";
import { AUDIENCES, type PublicAudience } from "@/lib/site-nav";

const TABS = Object.entries(AUDIENCES) as [PublicAudience, (typeof AUDIENCES)[PublicAudience]][];

export function AudienceTabs({ active }: { active: PublicAudience }) {
  return (
    <div className="bg-white border-b border-line sticky top-[76px] z-30">
      <div className="container mx-auto px-4">
        <nav aria-label="Course audience" className="flex overflow-x-auto -mb-px">
          {TABS.map(([value, { label }]) => {
            const isActive = active === value;
            return (
              <Link
                key={value}
                href={`/courses?audience=${value}`}
                aria-current={isActive ? "page" : undefined}
                className={`heading text-sm tracking-[0.08em] px-5 py-4 whitespace-nowrap border-b-[3px] transition-colors ${
                  isActive
                    ? "border-brand-red text-ink"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
