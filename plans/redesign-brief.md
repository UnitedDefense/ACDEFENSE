# Public Site Redesign — Brief

**Status:** built on branch `ccr-e70edeb0-rc8ob3` (2026-10-03) — awaiting staging deploy + owner review · **Started:** 2026-10-02 · **Target:** staging preview Monday 2026-10-05
**Owner:** American Civil Defense Company

---

## 1. Decisions

| Topic | Decision |
|-------|----------|
| Scope | **Redesign the public pages, keep the backend.** Booking, Revere payments (course + shop), admin panel, auth and the database stay. Backend changes are limited to small additive migrations (§7). |
| Goals | Sell more seats · look more credible · win agency clients · easier for the owner to manage |
| Audiences | **Three only: Civilians, Law Enforcement, Professional Security.** No military courses. |
| Visual direction | **Light and professional** — replaces the all-black "tactical" theme |
| Brand colors | Battleship Gray, American-flag Red, American-flag Blue (values §5) |
| Fonts | **Oswald** (headings) + **Inter** (body) — unchanged |
| Navigation | Grouped drop-downs instead of 11 flat items; Military removed |
| Agency features | Request a quote/private group · book a private class. No invoice/PO checkout, no PDF capability statement for now. |
| Credentials | **Public page**, certificate scans shown with license numbers / personal details blacked out |
| Security path | Armed-guard (IDFPR FCC) training + a VETS² mention. **Guard services are not sold here** — they're provided by the owner's sister company, Armstrong Security (armstrongsecurityllc.com), linked from the Security menu and page. |
| Photos/video | Owner has professional photos and course video; **placeholders for now** |
| Rollout | staging.acdefenseco.net first for review, then production |

## 2. Site structure — three doors

The homepage routes every visitor into one of three paths:

```
Home
├── Civilian Training            (open enrollment)
│   ├── Courses + upcoming dates (book a seat)
│   └── Request a date / private group
├── Professional Law Enforcement
│   ├── LE courses               (request only — no public seat booking)
│   └── Request agency training  (private group / on-site)
└── Professional Security
    ├── Armed-guard training     (IDFPR FCC courses, e.g. FCC Requalification)
    ├── VETS² program            (veteran nonprofit → security careers)
    └── Guard services → Armstrong Security (external link)

Shared: Shop · Blog · About (The Team, Credentials, Legal Services, Contact)
```

- **Military** courses, nav links, audience tab and footer link are removed. "Veteran-owned & operated" stays as a credibility point.
- **Security & Logistics** placeholder page is replaced by the Professional Security landing page. Guard services are not offered on this site (owner's other company — optional outbound link, see §9).

Main nav (drop-downs): **Civilian ▾ · Law Enforcement ▾ · Security ▾ · Shop · Blog · About ▾ (Team, Credentials, Legal Services, Contact)** + Sign in + a persistent **Request Training** button.

**Legal Services correction (2026-10-03):** the live Legal Services page lists the `services` table — use-of-force expert witness, case consultation, defensive liability review (attorney-facing), not FOID/CCL help. The FOID/CCL application assist and rights-restoration copy exists only as unused Site Content rows. Legal Services therefore sits under About, not Civilian, pending the owner's call.

## 3. Homepage

1. **Hero:** full-width looping background video (live fire / combatives), muted, autoplay, with a still poster image for slow connections and reduced-motion users. Welcoming headline + one-line mission statement. Placeholder video/poster until the real footage is supplied.
2. **Three doors:** three large cards directly under the hero — *Civilian Training*, *Professional Law Enforcement*, *Professional Security* — each with a photo, a one-sentence pitch and a button into its landing page.
3. **Upcoming dates:** next few open-enrollment classes with seats left (pulls from `course_schedules`).
4. **Credibility strip:** certification badges (NRA, IDFPR, USCCA, LE instructor) linking to the Credentials page; "veteran-owned & operated"; instructor highlights; testimonials when available.
5. **Request a class / private group** call-to-action band.
6. Newsletter signup + footer.

**Video spec for when real footage arrives:** 10–20 s seamless loop, 1080p, no audio track, H.264 MP4 (+ WebM), ideally under ~6 MB, plus one still frame as the poster.

## 4. Booking rules by audience

| Audience | Behaviour on the site |
|----------|----------------------|
| Civilians | **Book a seat** when a scheduled date has seats (existing Revere flow). When no date fits: **Request a Date** (existing waitlist) or **Request a Private Group**. Expect the request options to get most of the traffic. |
| Law enforcement | **Always private booking.** No public "Book Now" on LE courses — every LE course page leads to **Request Agency Training**. |
| Security | Same as civilians (individual guards book a seat on a scheduled FCC date; employers use **Request a Private Group**). *Assumed — change if wrong.* |

**Agency/private-group request form** (new): agency/organization name, contact name, rank/title, email, phone, course(s) of interest, headcount, preferred dates, location (our range vs. on-site), notes.

## 5. Visual system

Light background, generous whitespace, photography-led. Colors are defined once as design tokens (today ~190 hard-coded hex values are spread across ~20 public files — the redesign moves them all to tokens so future brand changes are one edit).

| Token | Value | Notes |
|-------|-------|-------|
| Brand blue (Old Glory Blue) | `#3C3B6E` | Primary: headers, nav, links. 10.3:1 on white. |
| Brand red (Old Glory Red) | `#B22234` | Calls to action / buttons. 6.6:1 with white text. |
| Battleship Gray | `#848482` | Borders, dividers, section backgrounds, large display text only. **3.75:1 on white — too light for body text.** |
| Ink (derived) | `#2B2D2F` | Body text. |
| Muted text (derived) | `#5A5A58` | Secondary text. 6.9:1 on white. |
| Surface (derived) | `#F4F4F2` | Alternating light section background. |

Fonts: Oswald (headings), Inter (body).

## 6. Credentials page

Public page listing instructor certifications: NRA instructor, law-enforcement instructor, IDFPR firearms instructor, USCCA instructor, and others. Each entry: credential, issuing body, instructor, valid-through date, and the certificate image/PDF. Managed from the admin panel so new certificates don't need a developer.

**Redaction:** certificate files are blacked out by the owner **before** upload (license numbers, DOB, home address, signatures as needed). The site displays exactly what is uploaded — it does not redact.

## 7. Backend changes needed (small, additive)

- **Security audience.** Add `security` to the `audience` enum and re-tag the FCC Requalification course (currently `law_enforcement`). `military` stays in the Postgres enum (values can't be dropped cleanly) but is removed from the admin choices and every public page.
- **Private-group requests.** Extend `waitlist_entries` (or add a sibling table) with request type, organization, title, preferred dates and location; show them in the admin Waitlist list.
- **Request-only rule** for law-enforcement courses (no public seat booking).
- **Credentials table** + admin resource (with file upload).
- **Self-host the remaining old-site images.** 6 images (homepage hero fallback, VETS² logo, some course photos) still load from `static.wixstatic.com`, i.e. the old Wix site. Copy them into the app so cancelling Wix can't break the live site.
- New init SQL migration (`init/012_…`), idempotent like `011_waitlist.sql`.

## 8. Launch plan

| When | What |
|------|------|
| Mon 2026-10-05 | Redesign complete on the branch, built and checked locally (screenshots of every public page, desktop + phone). Deployed to **staging** for owner review. |
| After review | Real hero video + photos swapped in, owner tests a booking and a request on staging, then **production**. |
| After production | Point **americancivildefensecompany.com** at acdefenseco.net with 301 redirects so old Google results and bookmarks land on the new site. |

Deployment (image build + GHCR push + droplet restart) runs from the owner's machine — the build environment has no registry login or droplet SSH key.

## 9. Remaining inputs (none block staging)

1. **Media:** hero loop video (upload in Admin → Site Content → Home → Hero Video), photos for the three homepage cards (Home → Civilian/Law Enforcement/Security Image), redacted certificate scans (Admin → Credentials). Placeholders until then; the hero uses the one real course photo in the repo.
2. **Legal Services:** confirm what this page should offer (expert witness vs FOID/CCL help vs both) and where it belongs in the menu.
3. **Request notifications:** set `TRAINING_REQUEST_NOTIFY_EMAIL` in the production `.env` to the inbox that should get every request. Unset = requests only appear in Admin → Requests & Waitlist.
4. **Old-site images:** several course `image_url` values point at files that were never copied (they fall back to a branded placeholder), and the VETS² logo still loads from the Wix CDN. Re-upload through the admin, or allow `static.wixstatic.com` in the build environment so they can be copied.
5. **Reference sites:** ridgelinetactical.com / ghostringtactical.com still not reviewed (blocked by the build environment's network policy).
6. **Security booking rule** (§4) is assumed — confirm.
