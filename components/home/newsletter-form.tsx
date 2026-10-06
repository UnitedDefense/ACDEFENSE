"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "duplicate">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) { setStatus("success"); setEmail(""); }
    else if (res.status === 409) { setStatus("duplicate"); }
    else { setStatus("error"); }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          disabled={status === "success"}
          className="field flex-1"
        />
        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className="btn btn-primary whitespace-nowrap"
        >
          {status === "loading" ? "…" : "Subscribe"}
        </button>
      </form>
      <div role="status" className="text-sm mt-2 min-h-5">
        {status === "success" && <p className="text-success">You&apos;re in. Welcome to the mission.</p>}
        {status === "duplicate" && <p className="text-ink-muted">You&apos;re already subscribed.</p>}
        {status === "error" && <p className="text-brand-red">Something went wrong. Try again.</p>}
      </div>
    </div>
  );
}
