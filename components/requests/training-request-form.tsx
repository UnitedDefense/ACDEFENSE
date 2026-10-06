"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  LOCATION_LABELS,
  LOCATIONS,
  REQUEST_TYPE_LABELS,
  type RequestType,
} from "@/lib/training-requests";

export type RequestCourseOption = { id: number; name: string; audience: string };

const AUDIENCE_GROUP_LABELS: Record<string, string> = {
  open_enrollment: "Civilian courses",
  law_enforcement: "Law enforcement courses",
  security: "Professional security courses",
};

const TYPE_HELP: Record<RequestType, string> = {
  waitlist: "Want a course on a date that isn't scheduled, or a seat in a sold-out class? Tell us and we'll reach out when it opens.",
  private_group: "A private class for your family, friends, church, business or team — at our range or at your location.",
  agency: "Private instruction for your department, built around your headcount, objectives and schedule. Law enforcement training is always delivered privately.",
};

type Fields = {
  name: string;
  email: string;
  phone: string;
  organization: string;
  contactTitle: string;
  partySize: string;
  preferredDates: string;
  location: string;
  message: string;
};

const EMPTY: Fields = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  contactTitle: "",
  partySize: "",
  preferredDates: "",
  location: "",
  message: "",
};

interface TrainingRequestFormProps {
  /** Starting request type. */
  initialType?: RequestType;
  /** Show the Request a Date / Private Group / Agency switcher. */
  allowTypeSwitch?: boolean;
  /** Restrict which types the switcher offers. */
  types?: RequestType[];
  /** Course picker options; omit (with courseId) to fix the course. */
  courses?: RequestCourseOption[];
  initialCourseId?: number;
  /** Fixed course (e.g. the course detail page's waitlist modal). */
  courseId?: number;
  courseName?: string;
  /** Specific sold-out date — waitlist requests only. */
  scheduleId?: number;
  /** Compact variant for modals. */
  compact?: boolean;
}

export function TrainingRequestForm({
  initialType = "waitlist",
  allowTypeSwitch = false,
  types = ["waitlist", "private_group", "agency"],
  courses,
  initialCourseId,
  courseId,
  courseName,
  scheduleId,
  compact = false,
}: TrainingRequestFormProps) {
  const [type, setType] = useState<RequestType>(initialType);
  const [form, setForm] = useState<Fields>(EMPTY);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId ? String(initialCourseId) : ""
  );
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "duplicate">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const effectiveCourseId = courseId ?? (selectedCourseId ? Number(selectedCourseId) : undefined);
  const effectiveCourseName =
    courseName ?? courses?.find((c) => String(c.id) === selectedCourseId)?.name;
  const isPrivate = type !== "waitlist";

  function set(field: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function switchType(next: RequestType) {
    setType(next);
    if (status !== "loading") setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: type,
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          organization: isPrivate ? form.organization || undefined : undefined,
          contactTitle: type === "agency" ? form.contactTitle || undefined : undefined,
          partySize: Number(form.partySize) || 1,
          preferredDates: form.preferredDates || undefined,
          location: isPrivate && form.location ? form.location : undefined,
          message: form.message || undefined,
          courseId: effectiveCourseId,
          scheduleId: type === "waitlist" ? scheduleId : undefined,
        }),
      });

      if (res.ok) {
        setStatus("success");
        setForm(EMPTY);
      } else if (res.status === 409) {
        setStatus("duplicate");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-10" role="status">
        <CheckCircle2 className="h-12 w-12 text-success mx-auto" aria-hidden="true" />
        <p className="heading text-2xl text-ink mt-4">
          {type === "waitlist" ? "You're on the list" : "Request received"}
        </p>
        <p className="text-ink-muted mt-2 max-w-md mx-auto">
          {type === "waitlist"
            ? effectiveCourseName
              ? `We'll reach out as soon as ${effectiveCourseName} has a date or seat for you.`
              : "We'll reach out as soon as we have availability."
            : "A training coordinator will contact you to confirm dates, headcount and location."}
        </p>
        <button type="button" onClick={() => setStatus("idle")} className="link-arrow mt-6">
          Send another request
        </button>
      </div>
    );
  }

  const gap = compact ? "space-y-3" : "space-y-4";
  const groupedCourses = courses
    ? Object.entries(
        courses.reduce<Record<string, RequestCourseOption[]>>((acc, c) => {
          (acc[c.audience] ??= []).push(c);
          return acc;
        }, {})
      )
    : [];

  return (
    <form onSubmit={handleSubmit} className={gap}>
      {allowTypeSwitch && (
        <fieldset>
          <legend className="field-label">What do you need?</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup">
            {types.map((t) => (
              <label
                key={t}
                className={`cursor-pointer rounded-md border-2 px-3 py-2.5 text-center text-sm font-semibold transition-colors ${
                  type === t
                    ? "border-brand-blue bg-brand-blue-tint text-brand-blue"
                    : "border-line text-ink hover:border-brand-gray"
                }`}
              >
                <input
                  type="radio"
                  name="requestType"
                  value={t}
                  checked={type === t}
                  onChange={() => switchType(t)}
                  className="sr-only"
                />
                {REQUEST_TYPE_LABELS[t]}
              </label>
            ))}
          </div>
          <p className="field-hint mt-2">{TYPE_HELP[type]}</p>
        </fieldset>
      )}

      {courses && courses.length > 0 && courseId === undefined && (
        <div>
          <label htmlFor="tr-course" className="field-label">
            Course {type === "waitlist" ? "" : "(optional)"}
          </label>
          <select
            id="tr-course"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="field"
          >
            <option value="">{type === "waitlist" ? "Any course / not sure yet" : "Not sure yet — help me choose"}</option>
            {groupedCourses.map(([audience, list]) => (
              <optgroup key={audience} label={AUDIENCE_GROUP_LABELS[audience] ?? audience}>
                {list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      {type === "agency" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tr-org" className="field-label">Agency / department *</label>
            <input id="tr-org" value={form.organization} onChange={set("organization")} required className="field" autoComplete="organization" />
          </div>
          <div>
            <label htmlFor="tr-title" className="field-label">Rank / title</label>
            <input id="tr-title" value={form.contactTitle} onChange={set("contactTitle")} className="field" placeholder="e.g. Training Sergeant" autoComplete="organization-title" />
          </div>
        </div>
      )}
      {type === "private_group" && (
        <div>
          <label htmlFor="tr-org" className="field-label">Group or organization (optional)</label>
          <input id="tr-org" value={form.organization} onChange={set("organization")} className="field" placeholder="e.g. company, church, family" autoComplete="organization" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="tr-name" className="field-label">{type === "agency" ? "Your name *" : "Full name *"}</label>
          <input id="tr-name" value={form.name} onChange={set("name")} required className="field" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="tr-email" className="field-label">Email *</label>
          <input id="tr-email" type="email" value={form.email} onChange={set("email")} required className="field" autoComplete="email" />
        </div>
        <div>
          <label htmlFor="tr-phone" className="field-label">Phone{isPrivate ? " *" : ""}</label>
          <input id="tr-phone" type="tel" value={form.phone} onChange={set("phone")} required={isPrivate} className="field" autoComplete="tel" />
        </div>
        <div>
          <label htmlFor="tr-size" className="field-label">
            {type === "waitlist" ? "How many people?" : "Headcount *"}
          </label>
          <input
            id="tr-size"
            type="number"
            inputMode="numeric"
            min={1}
            max={500}
            value={form.partySize}
            onChange={set("partySize")}
            required={isPrivate}
            placeholder={type === "waitlist" ? "1" : ""}
            className="field"
          />
        </div>
      </div>

      <div className={isPrivate ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : ""}>
        <div>
          <label htmlFor="tr-dates" className="field-label">Preferred dates</label>
          <input
            id="tr-dates"
            value={form.preferredDates}
            onChange={set("preferredDates")}
            className="field"
            placeholder={type === "waitlist" ? "e.g. weekends in November" : "e.g. weekdays in Q1, flexible"}
          />
        </div>
        {isPrivate && (
          <div>
            <label htmlFor="tr-location" className="field-label">Location</label>
            <select id="tr-location" value={form.location} onChange={set("location")} className="field">
              <option value="">Select…</option>
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {LOCATION_LABELS[l]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="tr-message" className="field-label">
          {type === "agency" ? "Training objectives / notes" : "Anything else? (optional)"}
        </label>
        <textarea
          id="tr-message"
          value={form.message}
          onChange={set("message")}
          rows={compact ? 3 : 4}
          className="field resize-y"
          placeholder={
            type === "agency"
              ? "Qualification standards, scenarios, equipment, time on range…"
              : type === "private_group"
                ? "Experience level, goals, equipment you have…"
                : ""
          }
        />
      </div>

      {status === "duplicate" && (
        <p className="text-sm text-ink-muted" role="status">
          {type === "waitlist"
            ? "You're already on this list — we'll be in touch."
            : "We already have this request — a coordinator will be in touch."}
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-brand-red" role="alert">
          {errorMessage}
        </p>
      )}

      <button type="submit" disabled={status === "loading"} className="btn btn-primary w-full">
        {status === "loading"
          ? "Sending…"
          : type === "waitlist"
            ? scheduleId
              ? "Join the waitlist"
              : "Request a date"
            : type === "agency"
              ? "Request agency training"
              : "Request a private class"}
      </button>
    </form>
  );
}
