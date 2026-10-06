-- =========================
-- SEED DATA
-- Idempotent: all inserts use ON CONFLICT DO NOTHING
-- =========================

-- Admin + test users (bcrypt via pgcrypto)
INSERT INTO users (email, password_hash, name, role) VALUES
  ('admin@acdefenseco.net', crypt('password123', gen_salt('bf', 10)), 'Admin User', 'admin'),
  ('user@example.com',      crypt('password123', gen_salt('bf', 10)), 'Test User',  'user')
ON CONFLICT (email) DO NOTHING;

-- =========================
-- PRODUCT CATEGORIES
-- =========================
INSERT INTO product_categories (name, slug, description) VALUES
  ('Ammunition',   'ammunition',   'Quality ammunition for training and defense'),
  ('Tactical Gear','tactical-gear','Professional tactical equipment'),
  ('Accessories',  'accessories',  'Essential firearm accessories'),
  ('Apparel',      'apparel',      'Tactical and training apparel')
ON CONFLICT (slug) DO NOTHING;

-- =========================
-- PRODUCTS
-- =========================
INSERT INTO products (name, slug, description, price, inventory_count, images, category_id)
SELECT
  '9mm FMJ Training Ammunition (50 rounds)',
  '9mm-fmj-50',
  'High-quality 9mm full metal jacket ammunition perfect for range training',
  24.99, 500, '["/products/9mm-ammo.jpg"]'::jsonb,
  id FROM product_categories WHERE slug = 'ammunition'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name, slug, description, price, inventory_count, images, category_id)
SELECT
  'Tactical Plate Carrier Vest',
  'plate-carrier-vest',
  'Modular plate carrier with MOLLE webbing for maximum versatility',
  189.99, 25, '["/products/plate-carrier.jpg"]'::jsonb,
  id FROM product_categories WHERE slug = 'tactical-gear'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name, slug, description, price, inventory_count, images, category_id)
SELECT
  'Red Dot Sight',
  'red-dot-sight',
  'Durable red dot optic with unlimited eye relief',
  149.99, 40, '["/products/red-dot.jpg"]'::jsonb,
  id FROM product_categories WHERE slug = 'accessories'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name, slug, description, price, inventory_count, images, category_id)
SELECT
  'Tactical Instructor Polo',
  'tactical-polo',
  'Moisture-wicking tactical polo with concealed carry features',
  49.99, 100, '["/products/tactical-polo.jpg"]'::jsonb,
  id FROM product_categories WHERE slug = 'apparel'
ON CONFLICT (slug) DO NOTHING;

-- =========================
-- INSTRUCTOR PROFILES
-- =========================
INSERT INTO instructor_profiles (name, title, bio, photo_url, certifications) VALUES
  (
    'John Smith',
    'Lead Instructor / Founder',
    'Former Marine Corps instructor with 15 years of experience in tactical firearms training',
    '/instructors/john-smith.jpg',
    'NRA Certified Instructor
USCCA Certified Instructor
Range Safety Officer'
  ),
  (
    'Sarah Johnson',
    'Senior Instructor',
    'Law enforcement veteran specializing in concealed carry and defensive tactics',
    '/instructors/sarah-johnson.jpg',
    'NRA Certified Instructor
Range Safety Officer
Law Enforcement Training Specialist'
  )
ON CONFLICT DO NOTHING;

-- =========================
-- COURSES (real data from americancivildefensecompany.com)
-- =========================
INSERT INTO courses (name, slug, description, tagline, price, duration_hours, max_capacity, prerequisites, image_url, audience, course_category) VALUES
  (
    'Concealed Carry License Certification',
    'concealed-carry-license-certification',
    'Join us for our comprehensive 2 day Illinois Concealed Carry Certification Course, designed to equip you with the knowledge and skills needed to carry responsibly and confidently. Our experienced instructors provide all necessary materials, ensuring your only focus is on attending and absorbing critical information. Whether you''re new to concealed carry or looking to refresh your skills, this course offers hands-on training, legal education, and practical scenarios to prepare you for real-world situations.',
    'Certified to carry a Firearm in Illinois and 38 Other States',
    249.00, 17, 20,
    'None',
    '/courses/ccl-certification.jpg',
    'open_enrollment', 'ccl_renewal'
  ),
  (
    'Pistol Operator Fundamentals',
    'pistol-operator-fundamentals',
    'Pistol Operator Fundamentals (POF) is an 8-hour, performance-based training course designed for responsibly armed citizens who want more than basic instruction. This course goes beyond qualification standards and introduces the skills required to run a pistol efficiently, accurately, and under control. Students will build a strong foundation in marksmanship fundamentals, including grip, stance, sight alignment, trigger control, and follow-through. Course includes performance-based coaching, live-fire drills, approximately 250 rounds of live-fire training, and a final evaluation with performance feedback.',
    'Build the foundation of real-world pistol performance',
    185.00, 8, 15,
    'None — open to all legal firearm owners',
    '/courses/pistol-operator-fundamentals.jpg',
    'open_enrollment', 'defensive_firearms'
  ),
  (
    'Concealed Carry License Renewal',
    'concealed-carry-license-renewal',
    'Join us for our comprehensive Illinois Concealed Carry Renewal Course, designed to equip you with the knowledge and skills needed to carry responsibly and confidently. Our experienced instructors provide all necessary materials, ensuring your only focus is on attending and absorbing critical information. This course offers hands-on training, legal education, and practical scenarios to prepare you for real-world situations.',
    'Refresh your skills, remain legally compliant',
    110.00, 3, 20,
    'Must hold a valid Illinois CCL',
    '/courses/ccl-renewal.jpg',
    'open_enrollment', 'ccl_renewal'
  ),
  (
    'First Shot Advantage',
    'first-shot-advantage',
    'Every second counts in a defensive encounter. First Shot Advantage trains you to safely and efficiently draw from concealment, building the speed, precision, and confidence needed to control the moment. Students will learn proper holster techniques, economy of motion, weapon retention, and the combat mindset required to survive and prevail. A performance-driven course emphasizing safe, efficient, and repeatable weapon presentation from concealment or duty gear.',
    'Because in a fight for your life, the first shot isn''t just important—it''s decisive.',
    175.00, 4, 15,
    'Concealed carry license or equivalent training',
    '/courses/first-shot-advantage.jpg',
    'open_enrollment', 'defensive_firearms'
  ),
  (
    'Mass Shooter Medical',
    'mass-shooter-medical',
    'Mass Shooter Medical is an intensive 6-hour course designed to equip civilians, protectors, and responsible Americans with the life-saving skills needed to respond effectively during mass casualty events. This course fuses Army Tactical Combat Casualty Care (TCCC) with civilian EMT-level interventions. Through live, scenario-driven training, students gain hands-on experience using tourniquets, chest seals, wound packing, airway adjuncts, and more—all taught by military, law enforcement, and emergency medical professionals.',
    'Train to Fight. Train to Save. Be Ready for Both.',
    199.00, 6, 20,
    'None',
    '/courses/mass-shooter-medical.jpg',
    'open_enrollment', 'other'
  ),
  (
    'Combat Pistol',
    'combat-pistol',
    'Combat Pistol I is a foundational defensive handgun course designed to transition students from static shooters to capable gunfighters. For law-abiding citizens who have completed basic training and are ready to master real-world pistol deployment under stress. This is not a marksmanship course—it''s a fight course. The skills taught are rooted in proven gunfighting tactics drawn from law enforcement, military, and high-level civilian defensive training.',
    'From Carry Permit to Combat-Ready',
    199.00, 8, 15,
    'NRA Basic Pistol, Illinois CCL, or equivalent',
    '/courses/combat-pistol.jpg',
    'open_enrollment', 'defensive_firearms'
  ),
  (
    'OC (Pepper Spray) Certification Course',
    'oc-pepper-spray-certification',
    'Taught by a currently serving 20th Special Forces Group Infantryman, ASP and USCCA certified OC instructor, SOCP certified, CSAT combatives instructor. You will leave knowing how to actually win with OC when the fight is already on. Covers ASP & Sabre Red deployment patterns, draw-to-spray under stress, integration with empty-hand strikes and ground fighting, SOCP style weapon transitions, contamination drills, weapon retention while spraying, and Illinois-specific legal framework.',
    'OC Spray Integration That Works When Punches Are Already Flying',
    169.00, 4, 20,
    'None',
    '/courses/oc-pepper-spray.jpg',
    'open_enrollment', 'other'
  ),
  (
    'Taser Certification Course',
    'taser-certification-course',
    'Taught by a currently serving soldier in the 20th Special Forces Group—SOCP certified, CSAT-qualified combatives instructor, purple-belt BJJ instructor. Covers probe deployment, drive-stun, and angled techniques under stress; CEW use when clinched or grounded; SOCP style transitions (CEW to impact weapon to blade to firearm); weapon retention; medical and legal considerations; live cartridge fire; and failure drills.',
    'Real-World CEW Training from the Tip of the Spear, certified and qualified.',
    199.00, 4, 20,
    'None',
    '/courses/taser-certification.jpg',
    'open_enrollment', 'other'
  ),
  (
    'Personal Defense Coaching',
    'personal-defense-coaching',
    'Tailored to your goals, skill level, and schedule, our one-on-one Private Firearms Coaching delivers focused instruction in a safe, professional environment. Custom curriculum from fundamentals (grip, stance, sight alignment) to advanced drills (rapid transitions, shoot-move-shoot, stress inoculation). Personalized attention to identify and correct weaknesses. Legal and ethical framework discussion. Real-world scenario-based exercises.',
    'Personalized Training — Physically Fit, Defensively Sound, Firearm Proficient',
    99.00, 1, 1,
    'None',
    '/courses/personal-defense-coaching.jpg',
    'open_enrollment', 'defensive_firearms'
  ),
  (
    'Women Only - CCL Certification',
    'women-only-ccl-certification',
    'Designed exclusively for women who are ready to take ownership of their personal safety and embrace the responsibility of carrying concealed with confidence. Through classroom instruction and live-fire range training, participants will learn firearm safety and responsible handling, fundamentals of pistol marksmanship, situational awareness and threat avoidance, the legal responsibilities of carrying concealed in Illinois, and defensive mindset and confidence in personal protection.',
    'Strong Women. Strong Defenders. Strong America.',
    249.00, 17, 20,
    'None',
    '/courses/women-only-ccl.jpg',
    'open_enrollment', 'ccl_renewal'
  ),
  (
    '2 Day CQB Course: Solo & Team Methods',
    '2-day-cqb-course',
    'Close Quarters Defense & Structure Clearing Fundamentals for roommates, couples, and professional security teams. Taught by experienced military instructors and security contractors. Covers CQB movement for two-person teams in hallways, doorways, and rooms; priority of life and threat identification; communication and positioning under stress; use of cover and angles; integration of firearms and low-light considerations; and post-incident responsibilities. UTM Pistols and 150 UTM rounds included in price.',
    'Stand Together. Defend Your Home. Protect What You Love.',
    499.00, 16, 12,
    'Concealed carry license or equivalent firearms training',
    '/courses/2-day-cqb-course.jpg',
    'open_enrollment', 'other'
  ),
  (
    'FCC Requalification Course',
    'fcc-requalification-course',
    'This annual 8-hour recertification course as mandated by the IDFPR ensures that the guard''s skills are being maintained throughout the year. Rooted in firearms operation, tactics, and legal precedent, this course will refresh and reinforce what you know, and drive new skills towards muscle memory. Qualification for the semi-auto pistol, rifle, and shotgun will all be performed. Weapon rental is an option, and ammunition is available.',
    'Premium multiweapon training that fulfills your annual FCC requalification requirements.',
    399.00, 8, 20,
    'Active Illinois PERC card / FCC license',
    '/courses/fcc-requalification.jpg',
    'law_enforcement', 'fcc_advanced'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================
-- COURSE SCHEDULES (real upcoming dates from americancivildefensecompany.com)
-- =========================

-- CCL Certification: monthly Fri 8am – Sat 4:30pm, May–Dec 2026
INSERT INTO course_schedules (course_id, start_date, end_date, available_seats, status)
SELECT c.id,
       s.start_dt,
       s.start_dt + INTERVAL '32.5 hours',
       20, 'open'
FROM courses c
JOIN (VALUES
  ('2026-05-16 08:00:00'::timestamp),
  ('2026-06-13 08:00:00'::timestamp),
  ('2026-07-11 08:00:00'::timestamp),
  ('2026-08-08 08:00:00'::timestamp),
  ('2026-09-12 08:00:00'::timestamp),
  ('2026-10-03 08:00:00'::timestamp),
  ('2026-11-07 08:00:00'::timestamp),
  ('2026-12-05 08:00:00'::timestamp)
) AS s(start_dt) ON TRUE
WHERE c.slug = 'concealed-carry-license-certification'
  AND NOT EXISTS (SELECT 1 FROM course_schedules cs WHERE cs.course_id = c.id);

-- CCL Renewal: monthly Tuesdays 5:30pm, 3hr, May–Dec 2026
INSERT INTO course_schedules (course_id, start_date, end_date, available_seats, status)
SELECT c.id,
       s.start_dt,
       s.start_dt + INTERVAL '3 hours',
       20, 'open'
FROM courses c
JOIN (VALUES
  ('2026-05-19 17:30:00'::timestamp),
  ('2026-06-16 17:30:00'::timestamp),
  ('2026-07-14 17:30:00'::timestamp),
  ('2026-08-04 17:30:00'::timestamp),
  ('2026-09-15 17:30:00'::timestamp),
  ('2026-10-13 17:30:00'::timestamp),
  ('2026-11-10 17:30:00'::timestamp),
  ('2026-12-08 17:30:00'::timestamp)
) AS s(start_dt) ON TRUE
WHERE c.slug = 'concealed-carry-license-renewal'
  AND NOT EXISTS (SELECT 1 FROM course_schedules cs WHERE cs.course_id = c.id);

-- Pistol Operator Fundamentals: May 30 Sat 9am, 8hr
INSERT INTO course_schedules (course_id, start_date, end_date, available_seats, status)
SELECT c.id, '2026-05-30 09:00:00'::timestamp, '2026-05-30 17:00:00'::timestamp, 15, 'open'
FROM courses c
WHERE c.slug = 'pistol-operator-fundamentals'
  AND NOT EXISTS (SELECT 1 FROM course_schedules cs WHERE cs.course_id = c.id);

-- FCC Requalification: May 9 Sat 9am, 8hr
INSERT INTO course_schedules (course_id, start_date, end_date, available_seats, status)
SELECT c.id, '2026-05-09 09:00:00'::timestamp, '2026-05-09 17:00:00'::timestamp, 20, 'open'
FROM courses c
WHERE c.slug = 'fcc-requalification-course'
  AND NOT EXISTS (SELECT 1 FROM course_schedules cs WHERE cs.course_id = c.id);

-- =========================
-- BLOG POSTS
-- =========================
INSERT INTO blog_posts (title, slug, content, author, published_at) VALUES
  (
    '5 Essential Tips for First-Time Gun Owners',
    '5-essential-tips-first-time-gun-owners',
    'Safety is paramount when it comes to firearm ownership. Here are five essential tips every new gun owner should know...',
    'John Smith',
    now()
  ),
  (
    'Understanding Concealed Carry Laws in Your State',
    'understanding-concealed-carry-laws',
    'Concealed carry laws vary significantly by state. It''s crucial to understand your local regulations...',
    'Sarah Johnson',
    now() - INTERVAL '7 days'
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================
-- LEGAL SERVICES
-- =========================
INSERT INTO services (name, slug, description, sort_order, is_active) VALUES
  (
    'Use-of-Force Expert Witness',
    'use-of-force-expert-witness',
    'Qualified expert witness testimony for civil and criminal cases involving use-of-force incidents. Over a decade of law enforcement and instructional experience.',
    1, true
  ),
  (
    'Case Consultation',
    'case-consultation',
    'Detailed case review and tactical analysis for attorneys handling self-defense, officer-involved shooting, and protective services litigation.',
    2, true
  ),
  (
    'Defensive Liability Review',
    'defensive-liability-review',
    'Pre-incident and post-incident review of protective service protocols to identify liability exposure and recommend best practices.',
    3, true
  )
ON CONFLICT (slug) DO NOTHING;

-- =========================
-- CLIENT / PARTNER LOGOS
-- =========================
INSERT INTO clients (name, logo_url, website_url, sort_order, is_active) VALUES
  (
    'VETS² Foundation',
    'https://static.wixstatic.com/media/126043_9fd283f0957e4b8f9bb828024b776fdc~mv2.png/v1/fill/w_1024,h_525,al_c,q_90,enc_avif,quality_auto/126043_9fd283f0957e4b8f9bb828024b776fdc~mv2.png',
    'https://donorbox.org/veterans-education-and-training-fund',
    1, true
  )
ON CONFLICT DO NOTHING;

-- =========================
-- PAGE CONTENT
-- =========================
INSERT INTO page_content (page, key, value) VALUES
  ('home',  'hero_headline',       'PROTECT WHAT''S S.A.C.R.E.D.'),
  ('home',  'hero_subheadline',    'Elite tactical training for civilians, law enforcement, and military. Build the skills to protect yourself and those who matter most.'),
  ('home',  'newsletter_headline', 'STAY MISSION READY'),
  ('home',  'newsletter_body',     'Get training updates, course announcements, and tactical insights delivered to your inbox.'),
  ('team',  'about',               'AC Defense Company was founded by active law enforcement professionals and military veterans dedicated to providing world-class defensive firearms training to civilians, officers, and service members. Our instructors bring real-world experience to every course.'),
  ('team',  'story',               E'After years of watching civilians and first responders struggle with inadequate training, our founders set out to build a program that mirrors the intensity and effectiveness of professional military and law enforcement curricula.\n\nWe believe every law-abiding citizen deserves access to elite-level training. That belief drives everything we do.'),
  ('legal', 'intro',               'Our instructors provide litigation support services rooted in decades of law enforcement and defensive firearms expertise. Whether you need expert testimony or case analysis, we deliver authoritative, credible insight.')
ON CONFLICT (page, key) DO NOTHING;

ALTER TABLE course_schedules ADD COLUMN IF NOT EXISTS booking_url TEXT;
ALTER TABLE course_schedules ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;

ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_name TEXT;
