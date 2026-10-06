-- =============================================================================
-- 003_real_data.sql — Real production data recovered from Wix site
-- =============================================================================
-- Purpose : Upsert instructors, courses, and page_content with real data.
-- Idempotent: every statement uses INSERT … ON CONFLICT DO UPDATE or
--             CREATE UNIQUE INDEX IF NOT EXISTS, so running this file
--             multiple times produces no net changes after the first run.
-- DO NOT run against production without a backup.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Unique indexes required for upserts (columns not declared UNIQUE in DDL)
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS instructor_profiles_name_uq
    ON instructor_profiles(name);

CREATE UNIQUE INDEX IF NOT EXISTS clients_name_uq
    ON clients(name);

ALTER TABLE instructor_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ---------------------------------------------------------------------------
-- INSTRUCTORS
-- Note: instructor photo URLs in 0b-instructors.md do not correspond to any
--       successfully-downloaded local paths in image-manifest.json, so the
--       original Wix-hosted URLs are used directly.
-- ---------------------------------------------------------------------------

INSERT INTO instructor_profiles (name, title, bio, photo_url, certifications)
VALUES (
    'Carmine Mattozzi',
    'Founder and CEO',
    $body$Founder and CEO of American Civil Defense Company, this U.S. Army Infantryman brings 20+ years of private security experience in Chicago, forged in real-world protective work where judgment and performance matter. A competitor in both MMA and 2-Gun, his instruction isn''t built on theory—it''s validated through continual training, measurable results, and on-demand execution under pressure. Backed by credentials as a firearms and martial arts instructor, he delivers disciplined fundamentals, practical tactics, and responsible decision-making that hold up beyond the square range. As Director of Mission Readiness for Armstrong Security, his standards are tested daily through the performance, safety, and careers of the professionals he trains and leads. Known for direct coaching, accountability, and a protector''s mindset, he develops capable, ethical defenders. A mentor and ambassador with multiple veteran charities, he remains committed to strengthening those who uphold the Constitution—and safeguarding the families and communities they serve.$body$,
    'https://static.wixstatic.com/media/126043_9d50ac5c70924f30a725a000e0638316~mv2.png',
    'USCCA, NRA, CSAT Firearms Instructor; SOCP Certified, BJJ Instructor; CLS certified, EFAF Instructor; Sub-Lethal Weapon Instructor'
)
ON CONFLICT (name) DO UPDATE SET
    title          = EXCLUDED.title,
    bio            = EXCLUDED.bio,
    photo_url      = EXCLUDED.photo_url,
    certifications = EXCLUDED.certifications;

INSERT INTO instructor_profiles (name, title, bio, photo_url, certifications)
VALUES (
    'Kevin Wheeler',
    'Training Coordinator',
    $body$As Training Coordinator, this U.S. Marine Corps Veteran and law-enforcement–trained security leader with extensive experience in executive protection, crisis response, and operations leadership. He serves as Training & Operations Manager for Armstrong Security, overseeing armed and unarmed teams, executive-protection assignments, personnel development, and threat-assessment initiatives across diverse environments. A former Military Police Marine (5811) and Training NCO, Kevin brings 10+ years of combined military, security, and instructional expertise spanning use-of-force, defensive tactics, emergency preparedness, and protective-service mission planning. He has delivered high-profile executive protection, coordinated multi-agency security efforts, and led teams in dynamic, high-risk settings. Active in Freemasonry and the York Rite, he serves as Grand Chaplain, District Instructor, and Junior Grand Warden of the Grand Commandery of Knights Templar of Illinois, and has authored educational programs used statewide. With academic training in psychology, criminal justice, and forensic psychology, he blends strategic judgment with operational precision, pursuing federal law-enforcement investigative and tactical roles.$body$,
    'https://static.wixstatic.com/media/126043_8ea0ff3d852d45a89fa27a587d925efa~mv2.png',
    'USMC Military Police & Training NCO; Training Manager – Armstrong Security; Certified Instructor & Security Specialist; York Rite Grand Officer & Masonic Educator'
)
ON CONFLICT (name) DO UPDATE SET
    title          = EXCLUDED.title,
    bio            = EXCLUDED.bio,
    photo_url      = EXCLUDED.photo_url,
    certifications = EXCLUDED.certifications;

INSERT INTO instructor_profiles (name, title, bio, photo_url, certifications)
VALUES (
    'Lewis Sanborn',
    'Lead Instructor',
    $body$As Lead Instructor, this 15-year Army infantry veteran and firearms instructor delivering Special Operations–level standards to civilian and professional training. A current 11B, he has served as a HALO Team Sergeant in a Long-Range Surveillance unit, Infantry Scout Team Leader, Infantry Squad Leader, and Senior Operations Advisor in an SFAB—leading and training soldiers in demanding operational roles. His deployment experience includes Afghanistan in support of the GWOT, Kosovo for anti–human smuggling operations, and the United Arab Emirates for combat advising missions. Holding credentials as an NRA Instructor, Special Forces Basic Combat Course Instructor, Ranger Instructor, S.E.R.E. C Instructor, and Special Operations Combatives Program–certified professional, he blends disciplined marksmanship, field-proven tactics, and a protector''s mindset. The result is direct, practical firearms and security instruction built for men and women who take responsibility seriously and intend to defend lives and assets with competence and restraint.$body$,
    'https://static.wixstatic.com/media/126043_646c1eb925d24c56a7b6218b3570f274~mv2.png',
    'SFAB Senior Operations Advisor; LRS HALO Team Sergeant; NRA, S.E.R.E. C, SFBCC Instructor; Nat''l Disaster PSD Team Lead'
)
ON CONFLICT (name) DO UPDATE SET
    title          = EXCLUDED.title,
    bio            = EXCLUDED.bio,
    photo_url      = EXCLUDED.photo_url,
    certifications = EXCLUDED.certifications;

INSERT INTO instructor_profiles (name, title, bio, photo_url, certifications)
VALUES (
    'Brian Krieter',
    'Security Professional & Tactical Instructor',
    $body$A seasoned security professional and tactical instructor with extensive experience in executive protection, high-risk environments, and defensive operations. He brings years of hands-on medical expertise, holding multiple advanced certifications and teaching life-saving prehospital care to both civilian and professional audiences. As a combative and medical instructor, he develops students'' confidence and capability through realistic, scenario-based training. Brian is also a skilled firearms instructor, emphasizing precision, accountability, and mastery under pressure.$body$,
    'https://static.wixstatic.com/media/126043_0bc858e669434a1d8832d4538dd1c7f5~mv2.png',
    'TAC / SAR / ERT Medic; Hand to hand combat instructor; Firearms instructor; K9 Medical'
)
ON CONFLICT (name) DO UPDATE SET
    title          = EXCLUDED.title,
    bio            = EXCLUDED.bio,
    photo_url      = EXCLUDED.photo_url,
    certifications = EXCLUDED.certifications;

-- ---------------------------------------------------------------------------
-- COURSES
-- Image paths: local recovered paths from image-manifest.json, stripped of
-- leading "public/" so they resolve as Next.js public-folder URLs.
-- Courses whose source images matched manifest entries use local paths;
-- all matched successfully (status: ok).
--
-- course_category enum: ccl_renewal | defensive_firearms | fcc_advanced | other
--   Firearms  → defensive_firearms
--   Legal     → ccl_renewal
--   Medical   → other
--   Professional → fcc_advanced
--
-- audience enum: open_enrollment | law_enforcement | military
-- duration_hours defaults to 8 when null in source.
-- max_capacity defaults to 12.
-- ---------------------------------------------------------------------------

-- 1. Pistol Operator Fundamentals
INSERT INTO courses (
    name, slug, description, tagline, price, duration_hours, max_capacity,
    prerequisites, image_url, audience, course_category
)
VALUES (
    'Pistol Operator Fundamentals',
    'pistol-operator-fundamentals',
    $body$(POF) is an 8-hour, performance-based training course designed for responsibly armed citizens who want more than basic instruction. This course goes beyond qualification standards and introduces the skills required to run a pistol efficiently, accurately, and under control.

Students will build a strong foundation in marksmanship fundamentals, including grip, stance, sight alignment, trigger control, and follow-through. From there, training progresses into practical application—developing recoil management, controlled shooting cadence, and the ability to deliver fast, accountable hits.

This is not a passive class. Students will train through structured, high-repetition drills that reinforce proper technique and eliminate inefficiency. Core skill development includes controlled pairs, multiple-shot placement, emergency and tactical reloads, and target transitions across multiple threats at varying distances.

Throughout the course, emphasis is placed on accountability, consistency, and measurable improvement. Students will be evaluated on their ability to apply fundamentals under increasing levels of speed and complexity.

This course is ideal for:
- Concealed carry license holders seeking real skill development
- New gun owners who want to build a strong foundation the right way
- Experienced shooters looking to refine fundamentals and eliminate bad habits

Course includes:
- 8 hours of structured instruction
- Performance-based coaching and live-fire drills
- Approximately 250 rounds of live-fire training
- Final evaluation and performance feedback

Students will leave this course with a clear understanding of their current capability, along with the skills and standards needed to continue progressing.$body$,
    'Build the foundation of real-world pistol performance',
    185.00,
    8,
    12,
    'None',
    '/images/recovered/pages/525c091a184243b38c8b921fa49b4b0f.png',
    'open_enrollment',
    'defensive_firearms'
)
ON CONFLICT (slug) DO UPDATE SET
    name            = EXCLUDED.name,
    description     = EXCLUDED.description,
    tagline         = EXCLUDED.tagline,
    price           = EXCLUDED.price,
    duration_hours  = EXCLUDED.duration_hours,
    prerequisites   = EXCLUDED.prerequisites,
    image_url       = EXCLUDED.image_url,
    audience        = EXCLUDED.audience,
    course_category = EXCLUDED.course_category;

-- 2. First Shot Advantage
INSERT INTO courses (
    name, slug, description, tagline, price, duration_hours, max_capacity,
    prerequisites, image_url, audience, course_category
)
VALUES (
    'First Shot Advantage',
    'first-shot-advantage',
    $body$"Because in a fight for your life, the first shot isn''t just important—it''s decisive."

Every second counts in a defensive encounter. First Shot Advantage trains you to safely and efficiently draw from concealment, building the speed, precision, and confidence needed to control the moment. This course goes beyond "looking cool"—it gives you the tools to win the fight before it even begins. Students will learn proper holster techniques, economy of motion, weapon retention, and the combat mindset required to survive and prevail. Whether you carry daily or are preparing for the worst day of your life, this training ensures you''re not just armed—you''re truly ready.

This is a performance-driven course, emphasizing safe, efficient, and repeatable weapon presentation from concealment or duty gear. Students will engage single and multiple targets, build consistency through repetition, and learn how to initiate a fight with speed and accuracy—all while developing habits grounded in real-world application.$body$,
    'Draw from concealment with speed, precision, and confidence',
    175.00,
    8,
    12,
    'None',
    '/images/recovered/courses/21880414967648fd8ede76965b45c4db.png',
    'open_enrollment',
    'defensive_firearms'
)
ON CONFLICT (slug) DO UPDATE SET
    name            = EXCLUDED.name,
    description     = EXCLUDED.description,
    tagline         = EXCLUDED.tagline,
    price           = EXCLUDED.price,
    duration_hours  = EXCLUDED.duration_hours,
    prerequisites   = EXCLUDED.prerequisites,
    image_url       = EXCLUDED.image_url,
    audience        = EXCLUDED.audience,
    course_category = EXCLUDED.course_category;

-- 3. Combat Pistol
INSERT INTO courses (
    name, slug, description, tagline, price, duration_hours, max_capacity,
    prerequisites, image_url, audience, course_category
)
VALUES (
    'Combat Pistol',
    'combat-pistol',
    $body$Combat Pistol I is a foundational defensive handgun course designed to transition students from static shooters to capable gunfighters. This course is for law-abiding citizens who have completed basic training (NRA Basic Pistol, Illinois Concealed Carry, or equivalent) and are ready to take the next step toward mastering real-world pistol deployment under stress.

This is not a marksmanship course—it''s a fight course. The skills taught are rooted in proven gunfighting tactics drawn from law enforcement, military, and high-level civilian defensive training. Students will learn to apply speed, precision, and sound judgment in dynamic environments. Whether you''re a protector of your home, your family, or your fellow Americans, this course will forge your mindset, sharpen your gun handling, and instill the confidence needed to stand your ground when evil calls.$body$,
    'Transition from static shooter to capable gunfighter',
    199.00,
    8,
    12,
    'Basic training (NRA Basic Pistol, Illinois Concealed Carry, or equivalent)',
    '/images/recovered/courses/2f764a06bcf4491cad37d99edb9a2da1.png',
    'open_enrollment',
    'defensive_firearms'
)
ON CONFLICT (slug) DO UPDATE SET
    name            = EXCLUDED.name,
    description     = EXCLUDED.description,
    tagline         = EXCLUDED.tagline,
    price           = EXCLUDED.price,
    duration_hours  = EXCLUDED.duration_hours,
    prerequisites   = EXCLUDED.prerequisites,
    image_url       = EXCLUDED.image_url,
    audience        = EXCLUDED.audience,
    course_category = EXCLUDED.course_category;

-- 4. Concealed Carry Renewal
INSERT INTO courses (
    name, slug, description, tagline, price, duration_hours, max_capacity,
    prerequisites, image_url, audience, course_category
)
VALUES (
    'Concealed Carry Renewal',
    'concealed-carry-renewal',
    $body$Maintain your CCL status by taking the state required 3 hour recertification. Beyond the state standard we sharpen your skills, update you on the new legal battlefield, and coach you through new drills to make ensure you''re a better fighter this round than the last.$body$,
    'Keep your CCL current and your skills sharper than ever',
    110.00,
    3,
    12,
    'Current CCL holder',
    '/images/recovered/courses/378f4d05b26847c2922b7fc675eb71ac.png',
    'open_enrollment',
    'ccl_renewal'
)
ON CONFLICT (slug) DO UPDATE SET
    name            = EXCLUDED.name,
    description     = EXCLUDED.description,
    tagline         = EXCLUDED.tagline,
    price           = EXCLUDED.price,
    duration_hours  = EXCLUDED.duration_hours,
    prerequisites   = EXCLUDED.prerequisites,
    image_url       = EXCLUDED.image_url,
    audience        = EXCLUDED.audience,
    course_category = EXCLUDED.course_category;

-- 5. Concealed Carry Course - June 13 & 14
INSERT INTO courses (
    name, slug, description, tagline, price, duration_hours, max_capacity,
    prerequisites, image_url, audience, course_category
)
VALUES (
    'Concealed Carry Course - June 13 & 14',
    'concealed-carry-course-june-13-14',
    $body$Join us for our comprehensive 2 day Illinois Concealed Carry Certification Course, designed to equip you with the knowledge and skills needed to carry responsibly and confidently. Our experienced instructors provide all necessary materials, ensuring your only focus is on attending and absorbing critical information.

Whether you''re new to concealed carry or looking to refresh your skills, this course offers hands-on training, legal education, and practical scenarios to prepare you for real-world situations. Don''t miss this opportunity to enhance your personal security—register today!$body$,
    'Licensed to Carry, Driven to Protect',
    250.00,
    16,
    12,
    'None',
    '/images/recovered/pages/ade02fad91c74f0982506914fc14aad8.png',
    'open_enrollment',
    'ccl_renewal'
)
ON CONFLICT (slug) DO UPDATE SET
    name            = EXCLUDED.name,
    description     = EXCLUDED.description,
    tagline         = EXCLUDED.tagline,
    price           = EXCLUDED.price,
    duration_hours  = EXCLUDED.duration_hours,
    prerequisites   = EXCLUDED.prerequisites,
    image_url       = EXCLUDED.image_url,
    audience        = EXCLUDED.audience,
    course_category = EXCLUDED.course_category;

-- 6. Concealed Carry Course - July 18 & 19
INSERT INTO courses (
    name, slug, description, tagline, price, duration_hours, max_capacity,
    prerequisites, image_url, audience, course_category
)
VALUES (
    'Concealed Carry Course - July 18 & 19',
    'concealed-carry-course-july-18-19',
    $body$Join us for our comprehensive 2 day Illinois Concealed Carry Certification Course, designed to equip you with the knowledge and skills needed to carry responsibly and confidently. Our experienced instructors provide all necessary materials, ensuring your only focus is on attending and absorbing critical information.

Whether you''re new to concealed carry or looking to refresh your skills, this course offers hands-on training, legal education, and practical scenarios to prepare you for real-world situations. Don''t miss this opportunity to enhance your personal security—register today!$body$,
    'Licensed to Carry, Driven to Protect',
    250.00,
    16,
    12,
    'None',
    '/images/recovered/pages/ade02fad91c74f0982506914fc14aad8.png',
    'open_enrollment',
    'ccl_renewal'
)
ON CONFLICT (slug) DO UPDATE SET
    name            = EXCLUDED.name,
    description     = EXCLUDED.description,
    tagline         = EXCLUDED.tagline,
    price           = EXCLUDED.price,
    duration_hours  = EXCLUDED.duration_hours,
    prerequisites   = EXCLUDED.prerequisites,
    image_url       = EXCLUDED.image_url,
    audience        = EXCLUDED.audience,
    course_category = EXCLUDED.course_category;

-- 7. Mass Shooter Medical
INSERT INTO courses (
    name, slug, description, tagline, price, duration_hours, max_capacity,
    prerequisites, image_url, audience, course_category
)
VALUES (
    'Mass Shooter Medical',
    'mass-shooter-medical',
    $body$Mass Shooter Medical is an intensive 6-hour course designed to equip civilians, protectors, and responsible Americans with the life-saving skills needed to respond effectively during mass casualty events—whether firearms-related or not.

This course fuses Army Tactical Combat Casualty Care (TCCC) with civilian EMT-level interventions, delivering a unique, battle-tested curriculum tailored for today''s unpredictable threats. Through live, scenario-driven training, students will gain hands-on experience using tourniquets, chest seals, wound packing, airway adjuncts, and more—all taught by military, law enforcement, and emergency medical professionals.$body$,
    'Life-saving skills for mass casualty events',
    199.00,
    6,
    12,
    'None',
    '/images/recovered/courses/96662c220db846408de4dc81d6c3a32a.png',
    'open_enrollment',
    'other'
)
ON CONFLICT (slug) DO UPDATE SET
    name            = EXCLUDED.name,
    description     = EXCLUDED.description,
    tagline         = EXCLUDED.tagline,
    price           = EXCLUDED.price,
    duration_hours  = EXCLUDED.duration_hours,
    prerequisites   = EXCLUDED.prerequisites,
    image_url       = EXCLUDED.image_url,
    audience        = EXCLUDED.audience,
    course_category = EXCLUDED.course_category;

-- 8. FCC Requalification Course
INSERT INTO courses (
    name, slug, description, tagline, price, duration_hours, max_capacity,
    prerequisites, image_url, audience, course_category
)
VALUES (
    'FCC Requalification Course',
    'fcc-requalification-course',
    $body$This annual 8 hour recertification course as mandated by the IDFPR ensures that the guard''s skills are being maintained throughout the year. Rooted in firearms operation, tactics, and legal precedent, this course will refresh and reinforce what you know, and drive new skills towards muscle memory.

Drills and scenarios provided will help you grow as you continue to perform security in a world that is ever increasing in its threats. Qualification for the semi auto pistol, rifle, and shotgun will all be performed. Weapon rental is an option, and ammunition is available.$body$,
    'IDFPR-mandated annual requalification for armed security professionals',
    399.00,
    8,
    12,
    'FCC guard certification',
    '/images/recovered/courses/e6f972256c0a4f63a1aeef773278abee.jpg',
    'law_enforcement',
    'fcc_advanced'
)
ON CONFLICT (slug) DO UPDATE SET
    name            = EXCLUDED.name,
    description     = EXCLUDED.description,
    tagline         = EXCLUDED.tagline,
    price           = EXCLUDED.price,
    duration_hours  = EXCLUDED.duration_hours,
    prerequisites   = EXCLUDED.prerequisites,
    image_url       = EXCLUDED.image_url,
    audience        = EXCLUDED.audience,
    course_category = EXCLUDED.course_category;

-- ---------------------------------------------------------------------------
-- PAGE CONTENT
-- Source: recovery/0d-pages.md
-- UNIQUE(page, key) constraint already exists in schema.
-- ---------------------------------------------------------------------------

INSERT INTO page_content (page, key, value)
VALUES ('home', 'course_pistol_fundamentals', 'Pistol Operator Fundamentals - Build the foundation of real-world pistol performance')
ON CONFLICT (page, key) DO UPDATE SET
    value      = EXCLUDED.value,
    updated_at = NOW();

INSERT INTO page_content (page, key, value)
VALUES ('home', 'course_concealed_carry', 'Concealed Carry Course - Licensed to Carry, Driven to Protect')
ON CONFLICT (page, key) DO UPDATE SET
    value      = EXCLUDED.value,
    updated_at = NOW();

INSERT INTO page_content (page, key, value)
VALUES ('legal-services', 'service_foid_ccl', 'In person FOID/CCL Application Assist - Professional assistance with firearms ownership documentation')
ON CONFLICT (page, key) DO UPDATE SET
    value      = EXCLUDED.value,
    updated_at = NOW();

INSERT INTO page_content (page, key, value)
VALUES ('legal-services', 'service_firearm_rights', 'Firearm Rights Restoration - Legal services to restore firearm rights')
ON CONFLICT (page, key) DO UPDATE SET
    value      = EXCLUDED.value,
    updated_at = NOW();

INSERT INTO page_content (page, key, value)
VALUES ('vets2', 'vets2_intro', 'VETS² (Veterans Education & Training in Security Services) is a veteran owned and veteran operated nonprofit organization dedicated to training and preparing United States military veterans for careers in the security and protective service fields. The organization provides instructional programs, hands-on training, mentorship, and job placement assistance to support veterans transitioning into civilian employment.')
ON CONFLICT (page, key) DO UPDATE SET
    value      = EXCLUDED.value,
    updated_at = NOW();

INSERT INTO page_content (page, key, value)
VALUES ('vets2', 'vets2_how_to_receive', 'Be a veteran or a service member in the reserves or national guard, who is in good standing and un or under employed. Verify yourself through our ID.me integration so your information is kept confidential and schedule your coursework today!')
ON CONFLICT (page, key) DO UPDATE SET
    value      = EXCLUDED.value,
    updated_at = NOW();

INSERT INTO page_content (page, key, value)
VALUES ('security', 'security_page_note', 'Security & Logistics page exists but contains minimal static copy beyond navigation. Appears to be a service listing page similar to legal-services.')
ON CONFLICT (page, key) DO UPDATE SET
    value      = EXCLUDED.value,
    updated_at = NOW();

-- ---------------------------------------------------------------------------
-- CLEANUP — Remove seeded placeholder instructors that were never real people,
-- but only if the name is not also a real instructor name from 0b-instructors.md.
-- Real names: Carmine Mattozzi, Kevin Wheeler, Lewis Sanborn, Brian Krieter
-- ---------------------------------------------------------------------------

DELETE FROM instructor_profiles
WHERE name IN ('John Smith', 'Sarah Johnson')
  AND name NOT IN (
      'Carmine Mattozzi',
      'Kevin Wheeler',
      'Lewis Sanborn',
      'Brian Krieter'
  );

-- Only Carmine is shown publicly; others hidden until ready
UPDATE instructor_profiles SET is_active = FALSE
WHERE name != 'Carmine Mattozzi';
