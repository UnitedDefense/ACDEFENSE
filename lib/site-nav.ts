// Single source of truth for public navigation (header + footer).
// The three audience paths match the homepage "doors" — see
// plans/redesign-brief.md §2. Military is intentionally absent.

export const ARMSTRONG_SECURITY_URL = "https://armstrongsecurityllc.com";

export type NavLink = { label: string; href: string; description?: string; external?: boolean };
export type NavGroup = { label: string; href: string; links: NavLink[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Civilian",
    href: "/civilian",
    links: [
      { label: "Civilian Training", href: "/civilian", description: "Overview, courses and upcoming dates" },
      { label: "All Civilian Courses", href: "/courses?audience=open_enrollment" },
      { label: "Request a Date", href: "/request-training?type=waitlist" },
      { label: "Private Group Class", href: "/request-training?type=private_group" },
    ],
  },
  {
    label: "Law Enforcement",
    href: "/law-enforcement",
    links: [
      { label: "Law Enforcement Training", href: "/law-enforcement", description: "Private, agency-built instruction" },
      { label: "Law Enforcement Courses", href: "/courses?audience=law_enforcement" },
      { label: "Request Agency Training", href: "/request-training?type=agency" },
    ],
  },
  {
    label: "Security",
    href: "/security",
    links: [
      { label: "Professional Security", href: "/security", description: "Armed-guard (FCC) training" },
      { label: "Armed Guard Courses", href: "/courses?audience=security" },
      { label: "VETS² Program", href: "/vets2", description: "Veterans into security careers" },
      { label: "Guard Services — Armstrong Security", href: ARMSTRONG_SECURITY_URL, external: true },
    ],
  },
];

export const NAV_LINKS: NavLink[] = [
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog" },
];

export const ABOUT_GROUP: NavGroup = {
  label: "About",
  href: "/team",
  links: [
    { label: "The Team", href: "/team" },
    { label: "Credentials", href: "/credentials", description: "Instructor certifications" },
    { label: "Legal Services", href: "/legal-services", description: "Expert witness & case consultation" },
    { label: "Contact", href: "/contact" },
  ],
};

export const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://www.instagram.com/acdefenseco/" },
  { label: "Facebook", href: "https://www.facebook.com/ACDefenseCo" },
  { label: "YouTube", href: "https://www.youtube.com/@ACDefenseCo" },
  { label: "WhatsApp", href: "https://wa.me/13126209330" },
];

export const AUDIENCES = {
  open_enrollment: { label: "Civilian", landing: "/civilian" },
  law_enforcement: { label: "Law Enforcement", landing: "/law-enforcement" },
  security: { label: "Professional Security", landing: "/security" },
} as const;

export type PublicAudience = keyof typeof AUDIENCES;

export function isPublicAudience(value: unknown): value is PublicAudience {
  return typeof value === "string" && value in AUDIENCES;
}
