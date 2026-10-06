import { db } from "@/lib/db";
import {
  users,
  productCategories,
  products,
  courses,
  instructorProfiles,
  courseSchedules,
  blogPosts,
  services,
  clients,
  pageContent,
} from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");
  console.log("DATABASE_URL:", process.env.DATABASE_URL);

  try {
    // Seed users
    console.log("👤 Creating users...");
    const hashedPassword = await bcrypt.hash("password123", 10);

    const [adminUser] = await db
      .insert(users)
      .values({
        email: "admin@acdefenseco.net",
        passwordHash: hashedPassword,
        name: "Admin User",
        role: "admin",
      })
      .onConflictDoNothing({ target: users.email })
      .returning();

    const [testUser] = await db
      .insert(users)
      .values({
        email: "user@example.com",
        passwordHash: hashedPassword,
        name: "Test User",
        role: "user",
      })
      .onConflictDoNothing({ target: users.email })
      .returning();

    console.log("✅ Users created");

    // Seed product categories
    console.log("📦 Creating product categories...");
    const categoryData = [
      { name: "Ammunition", slug: "ammunition", description: "Quality ammunition for training and defense" },
      { name: "Tactical Gear", slug: "tactical-gear", description: "Professional tactical equipment" },
      { name: "Accessories", slug: "accessories", description: "Essential firearm accessories" },
      { name: "Apparel", slug: "apparel", description: "Tactical and training apparel" },
    ];

    const createdCategories = await db
      .insert(productCategories)
      .values(categoryData)
      .onConflictDoNothing({ target: productCategories.slug })
      .returning();

    console.log("✅ Product categories created");

    // Seed products
    console.log("🛒 Creating products...");
    if (createdCategories.length > 0) {
      const productData = [
        {
          name: "9mm FMJ Training Ammunition (50 rounds)",
          slug: "9mm-fmj-50",
          description: "High-quality 9mm full metal jacket ammunition perfect for range training",
          price: "24.99",
          inventoryCount: 500,
          categoryId: createdCategories[0].id,
          images: ["/products/9mm-ammo.jpg"],
        },
        {
          name: "Tactical Plate Carrier Vest",
          slug: "plate-carrier-vest",
          description: "Modular plate carrier with MOLLE webbing for maximum versatility",
          price: "189.99",
          inventoryCount: 25,
          categoryId: createdCategories[1].id,
          images: ["/products/plate-carrier.jpg"],
        },
        {
          name: "Red Dot Sight",
          slug: "red-dot-sight",
          description: "Durable red dot optic with unlimited eye relief",
          price: "149.99",
          inventoryCount: 40,
          categoryId: createdCategories[2].id,
          images: ["/products/red-dot.jpg"],
        },
        {
          name: "Tactical Instructor Polo",
          slug: "tactical-polo",
          description: "Moisture-wicking tactical polo with concealed carry features",
          price: "49.99",
          inventoryCount: 100,
          categoryId: createdCategories[3].id,
          images: ["/products/tactical-polo.jpg"],
        },
      ];

      await db
        .insert(products)
        .values(productData)
        .onConflictDoNothing({ target: products.slug });

      console.log("✅ Products created");
    }

    // Seed instructors
    console.log("👨‍🏫 Creating instructor profiles...");
    const instructorData = [
      {
        name: "John Smith",
        title: "Lead Instructor / Founder",
        bio: "Former Marine Corps instructor with 15 years of experience in tactical firearms training",
        photoUrl: "/instructors/john-smith.jpg",
        certifications: "NRA Certified Instructor\nUSCCA Certified Instructor\nRange Safety Officer",
      },
      {
        name: "Sarah Johnson",
        title: "Senior Instructor",
        bio: "Law enforcement veteran specializing in concealed carry and defensive tactics",
        photoUrl: "/instructors/sarah-johnson.jpg",
        certifications: "NRA Certified Instructor\nRange Safety Officer\nLaw Enforcement Training Specialist",
      },
    ];

    const createdInstructors = await db
      .insert(instructorProfiles)
      .values(instructorData)
      .returning();

    console.log("✅ Instructor profiles created");

    // Seed courses — real data from americancivildefensecompany.com
    console.log("📚 Creating courses...");
    const courseData = [
      {
        name: "Concealed Carry License Certification",
        slug: "concealed-carry-license-certification",
        description: "Join us for our comprehensive 2 day Illinois Concealed Carry Certification Course, designed to equip you with the knowledge and skills needed to carry responsibly and confidently. Our experienced instructors provide all necessary materials, ensuring your only focus is on attending and absorbing critical information. Whether you're new to concealed carry or looking to refresh your skills, this course offers hands-on training, legal education, and practical scenarios to prepare you for real-world situations.",
        tagline: "Certified to carry a Firearm in Illinois and 38 Other States",
        price: "249.00",
        durationHours: 17,
        maxCapacity: 20,
        prerequisites: "None",
        imageUrl: "/courses/ccl-certification.jpg",
        audience: "open_enrollment" as const,
        courseCategory: "ccl_renewal" as const,
      },
      {
        name: "Pistol Operator Fundamentals",
        slug: "pistol-operator-fundamentals",
        description: "Pistol Operator Fundamentals (POF) is an 8-hour, performance-based training course designed for responsibly armed citizens who want more than basic instruction. This course goes beyond qualification standards and introduces the skills required to run a pistol efficiently, accurately, and under control. Students will build a strong foundation in marksmanship fundamentals, including grip, stance, sight alignment, trigger control, and follow-through. From there, training progresses into practical application—developing recoil management, controlled shooting cadence, and the ability to deliver fast, accountable hits. Course includes 8 hours of structured instruction, performance-based coaching and live-fire drills, approximately 250 rounds of live-fire training, and a final evaluation with performance feedback.",
        tagline: "Build the foundation of real-world pistol performance",
        price: "185.00",
        durationHours: 8,
        maxCapacity: 15,
        prerequisites: "None — open to all legal firearm owners",
        imageUrl: "/courses/pistol-operator-fundamentals.jpg",
        audience: "open_enrollment" as const,
        courseCategory: "defensive_firearms" as const,
      },
      {
        name: "Concealed Carry License Renewal",
        slug: "concealed-carry-license-renewal",
        description: "Join us for our comprehensive Illinois Concealed Carry Renewal Course, designed to equip you with the knowledge and skills needed to carry responsibly and confidently. Our experienced instructors provide all necessary materials, ensuring your only focus is on attending and absorbing critical information. This course offers hands-on training, legal education, and practical scenarios to prepare you for real-world situations. Don't miss this opportunity to enhance your personal security.",
        tagline: "Refresh your skills, remain legally compliant",
        price: "110.00",
        durationHours: 3,
        maxCapacity: 20,
        prerequisites: "Must hold a valid Illinois CCL",
        imageUrl: "/courses/ccl-renewal.jpg",
        audience: "open_enrollment" as const,
        courseCategory: "ccl_renewal" as const,
      },
      {
        name: "First Shot Advantage",
        slug: "first-shot-advantage",
        description: "Every second counts in a defensive encounter. First Shot Advantage trains you to safely and efficiently draw from concealment, building the speed, precision, and confidence needed to control the moment. This course goes beyond \"looking cool\"—it gives you the tools to win the fight before it even begins. Students will learn proper holster techniques, economy of motion, weapon retention, and the combat mindset required to survive and prevail. This is a performance-driven course, emphasizing safe, efficient, and repeatable weapon presentation from concealment or duty gear. Students will engage single and multiple targets, build consistency through repetition, and learn how to initiate a fight with speed and accuracy.",
        tagline: "Because in a fight for your life, the first shot isn't just important—it's decisive.",
        price: "175.00",
        durationHours: 4,
        maxCapacity: 15,
        prerequisites: "Concealed carry license or equivalent training",
        imageUrl: "/courses/first-shot-advantage.jpg",
        audience: "open_enrollment" as const,
        courseCategory: "defensive_firearms" as const,
      },
      {
        name: "Mass Shooter Medical",
        slug: "mass-shooter-medical",
        description: "Mass Shooter Medical is an intensive 6-hour course designed to equip civilians, protectors, and responsible Americans with the life-saving skills needed to respond effectively during mass casualty events—whether firearms-related or not. This course fuses Army Tactical Combat Casualty Care (TCCC) with civilian EMT-level interventions, delivering a unique, battle-tested curriculum tailored for today's unpredictable threats. Through live, scenario-driven training, students will gain hands-on experience using tourniquets, chest seals, wound packing, airway adjuncts, and more—all taught by military, law enforcement, and emergency medical professionals.",
        tagline: "Train to Fight. Train to Save. Be Ready for Both.",
        price: "199.00",
        durationHours: 6,
        maxCapacity: 20,
        prerequisites: "None",
        imageUrl: "/courses/mass-shooter-medical.jpg",
        audience: "open_enrollment" as const,
        courseCategory: "other" as const,
      },
      {
        name: "Combat Pistol",
        slug: "combat-pistol",
        description: "Combat Pistol I is a foundational defensive handgun course designed to transition students from static shooters to capable gunfighters. This course is for law-abiding citizens who have completed basic training (NRA Basic Pistol, Illinois Concealed Carry, or equivalent) and are ready to take the next step toward mastering real-world pistol deployment under stress. This is not a marksmanship course—it's a fight course. The skills taught are rooted in proven gunfighting tactics drawn from law enforcement, military, and high-level civilian defensive training. Students will learn to apply speed, precision, and sound judgment in dynamic environments.",
        tagline: "From Carry Permit to Combat-Ready",
        price: "199.00",
        durationHours: 8,
        maxCapacity: 15,
        prerequisites: "NRA Basic Pistol, Illinois CCL, or equivalent",
        imageUrl: "/courses/combat-pistol.jpg",
        audience: "open_enrollment" as const,
        courseCategory: "defensive_firearms" as const,
      },
      {
        name: "OC (Pepper Spray) Certification Course",
        slug: "oc-pepper-spray-certification",
        description: "Taught by a currently serving 20th Special Forces Group Infantryman, ASP and USCCA certified OC instructor, SOCP certified, CSAT combatives instructor, and owner of an Illinois-licensed private security company. You will leave knowing how to actually win with OC when the fight is already on. Course covers ASP & Sabre Red deployment patterns, draw-to-spray under stress, dominant/support hand deployment, integration with empty-hand strikes and ground fighting, SOCP style weapon transitions, contamination drills, weapon retention while spraying, and Illinois-specific legal framework.",
        tagline: "OC Spray Integration That Works When Punches Are Already Flying",
        price: "169.00",
        durationHours: 4,
        maxCapacity: 20,
        prerequisites: "None",
        imageUrl: "/courses/oc-pepper-spray.jpg",
        audience: "open_enrollment" as const,
        courseCategory: "other" as const,
      },
      {
        name: "Taser Certification Course",
        slug: "taser-certification-course",
        description: "Taught by a currently serving soldier in the 20th Special Forces Group—SOCP certified, CSAT-qualified combatives instructor, purple-belt BJJ instructor, and owner of an Illinois-licensed private security contractor company. You will learn probe deployment, drive-stun, and angled techniques under stress and movement; how to use a CEW when clinched, grounded, or in a fight; SOCP style transitions (CEW → impact weapon → blade → firearm); weapon retention priorities; medical and legal considerations; and live cartridge fire plus failure drills.",
        tagline: "Real-World CEW Training from the Tip of the Spear, certified and qualified.",
        price: "199.00",
        durationHours: 4,
        maxCapacity: 20,
        prerequisites: "None",
        imageUrl: "/courses/taser-certification.jpg",
        audience: "open_enrollment" as const,
        courseCategory: "other" as const,
      },
      {
        name: "Personal Defense Coaching",
        slug: "personal-defense-coaching",
        description: "Tailored to your goals, skill level, and schedule, our one-on-one Private Firearms Coaching delivers focused instruction in a safe, professional environment. Whether you're a novice building foundational skills or an experienced shooter refining advanced tactics, you'll receive expert guidance drawn from military, law enforcement, and competitive shooting disciplines. Custom curriculum from fundamentals (grip, stance, sight alignment) to advanced drills (rapid transitions, shoot-move-shoot, stress inoculation). Personalized attention to identify and correct weaknesses. Legal and ethical framework discussion. Real-world scenario-based exercises.",
        tagline: "Personalized Training — Physically Fit, Defensively Sound, Firearm Proficient",
        price: "99.00",
        durationHours: 1,
        maxCapacity: 1,
        prerequisites: "None",
        imageUrl: "/courses/personal-defense-coaching.jpg",
        audience: "open_enrollment" as const,
        courseCategory: "defensive_firearms" as const,
      },
      {
        name: "Women Only - CCL Certification",
        slug: "women-only-ccl-certification",
        description: "This course is designed exclusively for women who are ready to take ownership of their personal safety and embrace the responsibility of carrying concealed with confidence. Rooted in the principles of liberty, responsibility, and self-reliance, this program provides women the skills, mindset, and training necessary to defend themselves and their loved ones. Through classroom instruction and live-fire range training, participants will learn firearm safety and responsible handling, fundamentals of pistol marksmanship, situational awareness and threat avoidance, the legal responsibilities of carrying concealed in Illinois, and defensive mindset and confidence in personal protection.",
        tagline: "Strong Women. Strong Defenders. Strong America.",
        price: "249.00",
        durationHours: 17,
        maxCapacity: 20,
        prerequisites: "None",
        imageUrl: "/courses/women-only-ccl.jpg",
        audience: "open_enrollment" as const,
        courseCategory: "ccl_renewal" as const,
      },
      {
        name: "2 Day CQB Course: Solo & Team Methods",
        slug: "2-day-cqb-course",
        description: "This two-person based Close Quarters Defense & Structure Clearing Fundamentals course is built for roommates, couples, and professional security teams who are serious about defending life, home, and liberty. Single individuals will be paired appropriately. Taught by experienced military instructors and security contractors, this course focuses on realistic, legally-defensible defensive tactics for dealing with violent intruders inside a structure. Covers CQB movement for two-person teams in hallways, doorways, and rooms; priority of life and threat identification; communication and positioning; use of cover and angles; integration of firearms and low-light considerations; and pre-incident planning and post-incident responsibilities. UTM Pistols and 150 UTM rounds included in price.",
        tagline: "Stand Together. Defend Your Home. Protect What You Love.",
        price: "499.00",
        durationHours: 16,
        maxCapacity: 12,
        prerequisites: "Concealed carry license or equivalent firearms training",
        imageUrl: "/courses/2-day-cqb-course.jpg",
        audience: "open_enrollment" as const,
        courseCategory: "other" as const,
      },
      {
        name: "FCC Requalification Course",
        slug: "fcc-requalification-course",
        description: "This annual 8-hour recertification course as mandated by the IDFPR ensures that the guard's skills are being maintained throughout the year. Rooted in firearms operation, tactics, and legal precedent, this course will refresh and reinforce what you know, and drive new skills towards muscle memory. Drills and scenarios provided will help you grow as you continue to perform security in an ever-increasing threat environment. Qualification for the semi-auto pistol, rifle, and shotgun will all be performed. Weapon rental is an option, and ammunition is available.",
        tagline: "Premium multiweapon training that fulfills your annual FCC requalification requirements.",
        price: "399.00",
        durationHours: 8,
        maxCapacity: 20,
        prerequisites: "Active Illinois PERC card / FCC license",
        imageUrl: "/courses/fcc-requalification.jpg",
        audience: "law_enforcement" as const,
        courseCategory: "fcc_advanced" as const,
      },
    ];

    const createdCourses = await db
      .insert(courses)
      .values(courseData)
      .onConflictDoNothing({ target: courses.slug })
      .returning();

    console.log("✅ Courses created");

    // Seed course schedules — real upcoming dates from americancivildefensecompany.com
    console.log("📅 Creating course schedules...");
    if (createdCourses.length > 0) {
      const courseBySlug = Object.fromEntries(createdCourses.map((c) => [c.slug, c]));

      const scheduleEntries: Array<{
        courseId: number;
        startDate: Date;
        endDate: Date;
        availableSeats: number;
        status: "open" | "full" | "cancelled";
      }> = [];

      // CCL Certification — monthly Fri 8am – Sat 4:30pm, May–Dec 2026
      const cclCertId = courseBySlug["concealed-carry-license-certification"]?.id;
      if (cclCertId) {
        const cclDates = [
          [2026, 4, 16], [2026, 5, 13], [2026, 6, 11], [2026, 7, 8],
          [2026, 8, 12], [2026, 9, 3], [2026, 10, 7], [2026, 11, 5],
        ];
        for (const [y, m, d] of cclDates) {
          const start = new Date(y, m, d, 8, 0);
          const end = new Date(y, m, d + 1, 16, 30);
          scheduleEntries.push({ courseId: cclCertId, startDate: start, endDate: end, availableSeats: 20, status: "open" });
        }
      }

      // CCL Renewal — monthly Tuesdays 5:30pm, 3hr, May–Dec 2026
      const cclRenewalId = courseBySlug["concealed-carry-license-renewal"]?.id;
      if (cclRenewalId) {
        const renewalDates = [
          [2026, 4, 19], [2026, 5, 16], [2026, 6, 14], [2026, 7, 4],
          [2026, 8, 15], [2026, 9, 13], [2026, 10, 10], [2026, 11, 8],
        ];
        for (const [y, m, d] of renewalDates) {
          const start = new Date(y, m, d, 17, 30);
          const end = new Date(y, m, d, 20, 30);
          scheduleEntries.push({ courseId: cclRenewalId, startDate: start, endDate: end, availableSeats: 20, status: "open" });
        }
      }

      // Pistol Operator Fundamentals — May 30 Sat 9am, 8hr
      const pofId = courseBySlug["pistol-operator-fundamentals"]?.id;
      if (pofId) {
        scheduleEntries.push({
          courseId: pofId,
          startDate: new Date(2026, 4, 30, 9, 0),
          endDate: new Date(2026, 4, 30, 17, 0),
          availableSeats: 15,
          status: "open",
        });
      }

      // FCC Requalification — May 9 Sat 9am, 8hr
      const fccId = courseBySlug["fcc-requalification-course"]?.id;
      if (fccId) {
        scheduleEntries.push({
          courseId: fccId,
          startDate: new Date(2026, 4, 9, 9, 0),
          endDate: new Date(2026, 4, 9, 17, 0),
          availableSeats: 20,
          status: "open",
        });
      }

      if (scheduleEntries.length > 0) {
        await db.insert(courseSchedules).values(scheduleEntries);
      }
      console.log("✅ Course schedules created");
    }

    // Seed blog posts
    console.log("📝 Creating blog posts...");
    const blogData = [
      {
        title: "5 Essential Tips for First-Time Gun Owners",
        slug: "5-essential-tips-first-time-gun-owners",
        content: "Safety is paramount when it comes to firearm ownership. Here are five essential tips every new gun owner should know...",
        author: "John Smith",
        publishedAt: new Date(),
      },
      {
        title: "Understanding Concealed Carry Laws in Your State",
        slug: "understanding-concealed-carry-laws",
        content: "Concealed carry laws vary significantly by state. It's crucial to understand your local regulations...",
        author: "Sarah Johnson",
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      },
    ];

    await db
      .insert(blogPosts)
      .values(blogData)
      .onConflictDoNothing({ target: blogPosts.slug });

    console.log("✅ Blog posts created");

    // Seed legal services
    console.log("⚖️ Creating legal services...");
    await db.insert(services).values([
      {
        name: "Use-of-Force Expert Witness",
        description: "Qualified expert witness testimony for civil and criminal cases involving use-of-force incidents. Over a decade of law enforcement and instructional experience.",
        slug: "use-of-force-expert-witness",
        sortOrder: 1,
        isActive: true,
      },
      {
        name: "Case Consultation",
        description: "Detailed case review and tactical analysis for attorneys handling self-defense, officer-involved shooting, and protective services litigation.",
        slug: "case-consultation",
        sortOrder: 2,
        isActive: true,
      },
      {
        name: "Defensive Liability Review",
        description: "Pre-incident and post-incident review of protective service protocols to identify liability exposure and recommend best practices.",
        slug: "defensive-liability-review",
        sortOrder: 3,
        isActive: true,
      },
    ]).onConflictDoNothing({ target: services.slug });
    console.log("✅ Legal services created");

    // Seed client logos
    console.log("🏢 Creating client logos...");
    const existingClients = await db.select().from(clients);
    if (existingClients.length === 0) {
      await db.insert(clients).values([
        {
          name: "VETS² Foundation",
          logoUrl: "https://static.wixstatic.com/media/126043_9fd283f0957e4b8f9bb828024b776fdc~mv2.png/v1/fill/w_1024,h_525,al_c,q_90,enc_avif,quality_auto/126043_9fd283f0957e4b8f9bb828024b776fdc~mv2.png",
          websiteUrl: "https://donorbox.org/veterans-education-and-training-fund",
          sortOrder: 1,
          isActive: true,
        },
      ]);
    }
    console.log("✅ Client logos created");

    // Seed page content
    console.log("📄 Creating page content...");
    const pageContentData = [
      { page: "home", key: "hero_headline", value: "PROTECT WHAT'S S.A.C.R.E.D." },
      { page: "home", key: "hero_subheadline", value: "Elite tactical training for civilians, law enforcement, and military. Build the skills to protect yourself and those who matter most." },
      { page: "home", key: "newsletter_headline", value: "STAY MISSION READY" },
      { page: "home", key: "newsletter_body", value: "Get training updates, course announcements, and tactical insights delivered to your inbox." },
      { page: "team", key: "about", value: "AC Defense Company was founded by active law enforcement professionals and military veterans dedicated to providing world-class defensive firearms training to civilians, officers, and service members. Our instructors bring real-world experience to every course." },
      { page: "team", key: "story", value: "After years of watching civilians and first responders struggle with inadequate training, our founders set out to build a program that mirrors the intensity and effectiveness of professional military and law enforcement curricula.\n\nWe believe every law-abiding citizen deserves access to elite-level training. That belief drives everything we do." },
      { page: "legal", key: "intro", value: "Our instructors provide litigation support services rooted in decades of law enforcement and defensive firearms expertise. Whether you need expert testimony or case analysis, we deliver authoritative, credible insight." },
    ];

    const existingContent = await db.select().from(pageContent);
    const existingKeys = new Set(existingContent.map((r) => `${r.page}:${r.key}`));
    for (const row of pageContentData) {
      if (!existingKeys.has(`${row.page}:${row.key}`)) {
        await db.insert(pageContent).values(row);
      }
    }
    console.log("✅ Page content created");

    console.log("🎉 Database seeding completed successfully!");
    console.log("\n📋 Test credentials:");
    console.log("Admin: admin@acdefenseco.net / password123");
    console.log("User:  user@example.com / password123");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("✨ Seeding process finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
