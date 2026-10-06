"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

type Fields = { firstName: string; lastName: string; email: string; message: string };

export function ContactForm() {
  const [form, setForm] = useState<Fields>({ firstName: "", lastName: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  function set(field: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("success");
        setForm({ firstName: "", lastName: "", email: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-10" role="status">
        <CheckCircle2 className="h-12 w-12 text-success mx-auto" aria-hidden="true" />
        <p className="heading text-2xl text-ink mt-4">Message sent</p>
        <p className="text-ink-muted mt-2">We&apos;ll get back to you shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="c-first" className="field-label">First name *</label>
          <input id="c-first" value={form.firstName} onChange={set("firstName")} required autoComplete="given-name" className="field" />
        </div>
        <div>
          <label htmlFor="c-last" className="field-label">Last name *</label>
          <input id="c-last" value={form.lastName} onChange={set("lastName")} required autoComplete="family-name" className="field" />
        </div>
      </div>
      <div>
        <label htmlFor="c-email" className="field-label">Email *</label>
        <input id="c-email" type="email" value={form.email} onChange={set("email")} required autoComplete="email" className="field" />
      </div>
      <div>
        <label htmlFor="c-message" className="field-label">Message *</label>
        <textarea id="c-message" value={form.message} onChange={set("message")} rows={6} required className="field resize-y" />
      </div>
      {status === "error" && (
        <p className="text-sm text-brand-red" role="alert">Something went wrong. Please try again.</p>
      )}
      <button type="submit" disabled={status === "loading"} className="btn btn-primary w-full sm:w-auto">
        {status === "loading" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
