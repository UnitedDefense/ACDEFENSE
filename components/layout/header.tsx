"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        {/* Logo */}
        <Link href="/" className="mr-8 flex items-center space-x-2">
          <span className="text-xl font-bold text-primary">ACDefenseCo</span>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-1 items-center space-x-6 text-sm font-medium">
          <Link
            href="/courses"
            className="text-foreground/80 transition-colors hover:text-foreground"
          >
            Training Courses
          </Link>
          <Link
            href="/shop"
            className="text-foreground/80 transition-colors hover:text-foreground"
          >
            Shop
          </Link>
          <Link
            href="/instructors"
            className="text-foreground/80 transition-colors hover:text-foreground"
          >
            Instructors
          </Link>
          <Link
            href="/blog"
            className="text-foreground/80 transition-colors hover:text-foreground"
          >
            Blog
          </Link>
          <Link
            href="/about"
            className="text-foreground/80 transition-colors hover:text-foreground"
          >
            About
          </Link>
        </nav>

        {/* Auth buttons */}
        <div className="flex items-center space-x-4">
          {session ? (
            <>
              {session.user.role === "admin" && (
                <Link href="/admin">
                  <Button variant="ghost">Admin</Button>
                </Link>
              )}
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link href="/cart">
                <Button variant="ghost">Cart</Button>
              </Link>
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button>Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
