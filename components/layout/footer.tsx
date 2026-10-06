import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">ACDefenseCo</h3>
            <p className="text-sm text-muted-foreground">
              American Civil Defense Company - Professional firearms training and
              tactical gear since 2024.
            </p>
          </div>

          {/* Training */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Training</h4>
            <nav className="flex flex-col space-y-2 text-sm">
              <Link
                href="/courses"
                className="text-muted-foreground hover:text-foreground"
              >
                All Courses
              </Link>
              <Link
                href="/courses/concealed-carry"
                className="text-muted-foreground hover:text-foreground"
              >
                Concealed Carry
              </Link>
              <Link
                href="/courses/tactical"
                className="text-muted-foreground hover:text-foreground"
              >
                Tactical Training
              </Link>
              <Link
                href="/instructors"
                className="text-muted-foreground hover:text-foreground"
              >
                Our Instructors
              </Link>
            </nav>
          </div>

          {/* Shop */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Shop</h4>
            <nav className="flex flex-col space-y-2 text-sm">
              <Link
                href="/shop/ammunition"
                className="text-muted-foreground hover:text-foreground"
              >
                Ammunition
              </Link>
              <Link
                href="/shop/gear"
                className="text-muted-foreground hover:text-foreground"
              >
                Tactical Gear
              </Link>
              <Link
                href="/shop/accessories"
                className="text-muted-foreground hover:text-foreground"
              >
                Accessories
              </Link>
              <Link
                href="/shop/apparel"
                className="text-muted-foreground hover:text-foreground"
              >
                Apparel
              </Link>
            </nav>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Company</h4>
            <nav className="flex flex-col space-y-2 text-sm">
              <Link
                href="/about"
                className="text-muted-foreground hover:text-foreground"
              >
                About Us
              </Link>
              <Link
                href="/contact"
                className="text-muted-foreground hover:text-foreground"
              >
                Contact
              </Link>
              <Link
                href="/blog"
                className="text-muted-foreground hover:text-foreground"
              >
                Blog
              </Link>
              <Link
                href="/privacy"
                className="text-muted-foreground hover:text-foreground"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-muted-foreground hover:text-foreground"
              >
                Terms of Service
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} American Civil Defense Company. All
            rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
