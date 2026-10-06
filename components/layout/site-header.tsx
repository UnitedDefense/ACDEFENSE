"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ExternalLink, Menu, User, X } from "lucide-react";
import { ABOUT_GROUP, NAV_GROUPS, NAV_LINKS, type NavGroup } from "@/lib/site-nav";

const navItemClass =
  "heading text-[0.8125rem] tracking-[0.08em] text-white/85 hover:text-white px-3 py-2 rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/70";

function NavDropdown({ group }: { group: NavGroup }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className={`${navItemClass} flex items-center gap-1 data-[state=open]:text-white`}>
        {group.label} <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={10}
        className="bg-white border-line rounded-md shadow-xl min-w-[280px] p-2"
      >
        {group.links.map((link) => (
          <DropdownMenuItem key={link.href} asChild className="focus:bg-surface rounded cursor-pointer">
            {link.external ? (
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="flex flex-col items-start px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  {link.label} <ExternalLink className="h-3 w-3 text-ink-muted" aria-hidden="true" />
                </span>
              </a>
            ) : (
              <Link href={link.href} className="flex flex-col items-start px-3 py-2.5">
                <span className="text-sm font-semibold text-ink">{link.label}</span>
                {link.description && <span className="text-xs text-ink-muted">{link.description}</span>}
              </Link>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  const close = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
      <div className="bg-charcoal">
        <div className="container mx-auto px-4 h-[72px] flex items-center gap-4">
          <Link href="/" onClick={close} className="shrink-0 rounded focus-visible:outline-2 focus-visible:outline-white">
            {/* Logo sits on the same #1f1f1f as its own plate, so the JPEG edge is invisible. */}
            <Image
              src="/images/LOGOSHOT.jpg"
              alt="American Civil Defense Company"
              width={1527}
              height={468}
              priority
              className="h-11 w-auto"
            />
          </Link>

          {/* Desktop nav — xl only: 7 items + actions overflow below 1280px */}
          <nav aria-label="Main" className="hidden xl:flex items-center ml-auto">
            {NAV_GROUPS.map((group) => (
              <NavDropdown key={group.label} group={group} />
            ))}
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={navItemClass}>
                {link.label}
              </Link>
            ))}
            <NavDropdown group={ABOUT_GROUP} />
          </nav>

          <div className="hidden xl:flex items-center gap-2 pl-3 ml-1 border-l border-white/15">
            {session ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger className={`${navItemClass} flex items-center gap-1.5`} aria-label="Account menu">
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span className="max-w-[120px] truncate normal-case tracking-normal font-medium font-sans">
                    {session.user?.name ?? session.user?.email}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={10} className="bg-white border-line shadow-xl min-w-[180px] p-1.5">
                  {isAdmin && (
                    <DropdownMenuItem asChild className="cursor-pointer text-sm text-ink focus:bg-surface">
                      <Link href="/admin">Admin panel</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="cursor-pointer text-sm text-ink focus:bg-surface">
                    <Link href="/dashboard">My bookings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-sm text-brand-red focus:bg-brand-red-tint focus:text-brand-red"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login" className={navItemClass}>
                Sign in
              </Link>
            )}
            <Link href="/request-training" className="btn btn-primary btn-sm ml-1">
              Request Training
            </Link>
          </div>

          {/* Mobile */}
          <div className="xl:hidden ml-auto flex items-center gap-2">
            <Link href="/request-training" onClick={close} className="btn btn-primary btn-sm hidden sm:inline-flex">
              Request Training
            </Link>
            <button
              type="button"
              className="text-white p-2 rounded focus-visible:outline-2 focus-visible:outline-white"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
      <div className="flag-rule" />

      {mobileOpen && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="xl:hidden bg-white border-b border-line max-h-[calc(100vh-76px)] overflow-y-auto"
        >
          <div className="container mx-auto px-4 py-4">
            <Link href="/request-training" onClick={close} className="btn btn-primary w-full mb-4 sm:hidden">
              Request Training
            </Link>
            {[...NAV_GROUPS, ABOUT_GROUP].map((group) => (
              <div key={group.label} className="py-3 border-b border-line">
                <Link href={group.href} onClick={close} className="heading text-base text-brand-blue block py-1">
                  {group.label}
                </Link>
                <ul className="mt-1">
                  {group.links
                    .filter((l) => l.href !== group.href)
                    .map((link) => (
                      <li key={link.href}>
                        {link.external ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 py-2 pl-3 text-[0.9375rem] text-ink"
                          >
                            {link.label} <ExternalLink className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
                          </a>
                        ) : (
                          <Link href={link.href} onClick={close} className="block py-2 pl-3 text-[0.9375rem] text-ink">
                            {link.label}
                          </Link>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="heading text-base text-brand-blue block py-4 border-b border-line"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 flex flex-col gap-1">
              {session ? (
                <>
                  {isAdmin && (
                    <Link href="/admin" onClick={close} className="py-2 text-ink">
                      Admin panel
                    </Link>
                  )}
                  <Link href="/dashboard" onClick={close} className="py-2 text-ink">
                    My bookings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      signOut({ callbackUrl: "/" });
                    }}
                    className="py-2 text-left text-brand-red"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={close} className="py-2 text-ink font-medium">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
