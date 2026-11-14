"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { BookingLink } from "@/components/ContactLinks";

type InquirySegmentOption = "BUSINESS" | "CONSUMER";

const BUSINESS_CATEGORIES = [
  { value: "BUSINESS_PULSE", label: "Business Pulse ($99/month ongoing watch)" },
  { value: "BUSINESS_FREE_REALITY_CHECK", label: "Question about Free Reality Check ($0)" },
  { value: "BUSINESS_RESEARCH", label: "Custom Business, Supplier, or Market Research" },
  { value: "BUSINESS_OPERATIONAL_IMPROVEMENT", label: "Website, Menus, Listings, or Operations Project" },
  { value: "BUSINESS_CYBERSECURITY_READINESS", label: "Public Digital Trust & Readiness Review" },
  { value: "GENERAL_INQUIRY", label: "General Business Question" },
] as const;

const CONSUMER_CATEGORIES = [
  { value: "CONSUMER_DECISION_RESEARCH", label: "Major Purchase, Contractor, or Relocation Research" },
  { value: "CONSUMER_GENEALOGY", label: "Genealogy & Family History Research" },
  { value: "CONSUMER_COLLECTIBLES", label: "Hard-to-Find Item or Collectibles Locator" },
  { value: "CONSUMER_DIGITAL_SAFETY", label: "Personal Digital Safety & Scam Checkup" },
  { value: "CONSUMER_PERSONAL_RESEARCH", label: "Custom Personal Research Question" },
  { value: "GENERAL_INQUIRY", label: "General Question" },
] as const;

function makeClientSubmissionKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `inq_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export default function CustomerInquiryForm() {
  const [submissionKey, setSubmissionKey] = useState<string>(() => makeClientSubmissionKey());
  const [segment, setSegment] = useState<InquirySegmentOption>("BUSINESS");
  const [serviceCategory, setServiceCategory] = useState<string>("BUSINESS_PULSE");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [message, setMessage] = useState("");
  const [privacyNoticeAccepted, setPrivacyNoticeAccepted] = useState(false);
  const [websiteConfirm, setWebsiteConfirm] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    referenceId: string;
    commitmentBusinessDays: number;
    acknowledgmentSent: boolean;
  } | null>(null);

  const activeCategoryOptions = segment === "BUSINESS" ? BUSINESS_CATEGORIES : CONSUMER_CATEGORIES;

  const handleSegmentChange = (nextSegment: InquirySegmentOption) => {
    setSegment(nextSegment);
    setServiceCategory(
      nextSegment === "BUSINESS" ? "BUSINESS_PULSE" : "CONSUMER_DECISION_RESEARCH"
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!privacyNoticeAccepted) {
      setErrorMessage("Please acknowledge the privacy notice before sending your message.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/customer-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionKey,
          name,
          email,
          segment,
          serviceCategory,
          organizationName: segment === "BUSINESS" ? organizationName : "",
          websiteUrl: segment === "BUSINESS" ? websiteUrl : "",
          message,
          privacyNoticeAccepted,
          websiteConfirm,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        referenceId?: string;
        commitmentBusinessDays?: number;
        acknowledgmentSent?: boolean;
      };

      if (!response.ok || !payload.success) {
        setErrorMessage(
          payload.error ||
            "We could not submit your inquiry right now. Please try again or email todd@baratrust.com."
        );
        return;
      }

      setConfirmation({
        referenceId: payload.referenceId || "received",
        commitmentBusinessDays: payload.commitmentBusinessDays || 2,
        acknowledgmentSent: Boolean(payload.acknowledgmentSent),
      });
    } catch {
      setErrorMessage(
        "Network connection interrupted. You can safely click Send Message again without creating a duplicate."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForNewInquiry = () => {
    setSubmissionKey(makeClientSubmissionKey());
    setMessage("");
    setPrivacyNoticeAccepted(false);
    setErrorMessage(null);
    setConfirmation(null);
  };

  if (confirmation) {
    return (
      <div className="lead-form" id="customer-inquiry-confirmation" role="status" aria-live="polite">
        <p className="eyebrow" style={{ marginBottom: "8px" }}>
          Inquiry Recorded · Ref #{confirmation.referenceId}
        </p>
        <h2 style={{ fontSize: "1.65rem", marginBottom: "12px" }}>
          Thank you — Todd &amp; Noelah have your message.
        </h2>
        <p style={{ marginTop: 0 }}>
          Your inquiry is safely stored for personal human review. A member of our team will review
          your request and respond within{" "}
          <strong>
            {confirmation.commitmentBusinessDays === 1
              ? "one business day"
              : "two business days"}
          </strong>
          .
        </p>
        {confirmation.acknowledgmentSent && (
          <p className="form-note" style={{ marginTop: "10px" }}>
            We also sent a brief confirmation copy to <strong>{email}</strong>.
          </p>
        )}
        <div className="starter-note" style={{ marginTop: "18px" }}>
          <strong>Please protect sensitive details</strong>
          <span>
            Please wait until we reply before sending passwords, financial records, or sensitive
            identity documents.
          </span>
        </div>
        <div className="cta-row" style={{ marginTop: "22px" }}>
          <BookingLink surface="contact_page" className="btn primary">
            Book a Free 15-Minute Conversation
          </BookingLink>
          <button
            type="button"
            className="btn secondary"
            onClick={handleResetForNewInquiry}
          >
            Send Another Question
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="lead-form" id="customer-inquiry-form" onSubmit={handleSubmit} noValidate>
      <h2 style={{ fontSize: "1.55rem", marginBottom: "6px" }}>Send a Direct Inquiry</h2>
      <p className="form-note" style={{ marginBottom: "18px" }}>
        Every request is reviewed personally by Todd or Noelah — never an autonomous sales bot.
      </p>

      {/* Hidden honeypot field — bots fill this, real visitors never see it */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label htmlFor="bt-website-confirm">
          Leave this field blank
          <input
            id="bt-website-confirm"
            type="text"
            name="websiteConfirm"
            tabIndex={-1}
            autoComplete="off"
            value={websiteConfirm}
            onChange={(e) => setWebsiteConfirm(e.target.value)}
          />
        </label>
      </div>

      <fieldset
        style={{
          border: "none",
          padding: 0,
          margin: "0 0 16px 0",
        }}
      >
        <legend style={{ fontWeight: 700, marginBottom: "8px", fontSize: "0.95rem" }}>
          Is this for a business or personal research?
        </legend>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button
            type="button"
            aria-pressed={segment === "BUSINESS"}
            onClick={() => handleSegmentChange("BUSINESS")}
            style={{
              padding: "11px 14px",
              borderRadius: "12px",
              border:
                segment === "BUSINESS"
                  ? "2px solid var(--mint-dark)"
                  : "1px solid var(--line)",
              background: segment === "BUSINESS" ? "rgba(31, 127, 96, 0.1)" : "transparent",
              color: "var(--ink)",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Business Inquiry
          </button>
          <button
            type="button"
            aria-pressed={segment === "CONSUMER"}
            onClick={() => handleSegmentChange("CONSUMER")}
            style={{
              padding: "11px 14px",
              borderRadius: "12px",
              border:
                segment === "CONSUMER"
                  ? "2px solid var(--mint-dark)"
                  : "1px solid var(--line)",
              background: segment === "CONSUMER" ? "rgba(31, 127, 96, 0.1)" : "transparent",
              color: "var(--ink)",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Personal / Individual
          </button>
        </div>
      </fieldset>

      <label htmlFor="inq-name">
        Your Name *
        <input
          id="inq-name"
          type="text"
          required
          maxLength={100}
          autoComplete="name"
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label htmlFor="inq-email">
        Email Address *
        <input
          id="inq-email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      {segment === "BUSINESS" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <label htmlFor="inq-org">
            Business Name (optional)
            <input
              id="inq-org"
              type="text"
              maxLength={160}
              autoComplete="organization"
              placeholder="River Valley Bakery"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
            />
          </label>
          <label htmlFor="inq-web">
            Website / Page Link (optional)
            <input
              id="inq-web"
              type="text"
              maxLength={300}
              placeholder="example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </label>
        </div>
      )}

      <label htmlFor="inq-category">
        Service or Research Category *
        <select
          id="inq-category"
          value={serviceCategory}
          onChange={(e) => setServiceCategory(e.target.value)}
          style={{
            width: "100%",
            marginTop: "7px",
            border: "1px solid #bac6bf",
            background: "var(--bg)",
            color: "var(--ink)",
            borderRadius: "12px",
            padding: "12px 14px",
            font: "inherit",
          }}
        >
          {activeCategoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="inq-message">
        How can we help? *
        <textarea
          id="inq-message"
          required
          rows={4}
          minLength={10}
          maxLength={3500}
          placeholder={
            segment === "BUSINESS"
              ? "Tell us briefly about your business, question, or what you would like watched or researched..."
              : "Tell us briefly what you are researching, trying to locate, or evaluating (please avoid SSNs, passwords, or payment card numbers)..."
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>

      <label
        htmlFor="inq-privacy"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          fontWeight: 500,
          fontSize: "0.88rem",
          cursor: "pointer",
          marginBottom: "18px",
        }}
      >
        <input
          id="inq-privacy"
          type="checkbox"
          checked={privacyNoticeAccepted}
          onChange={(e) => setPrivacyNoticeAccepted(e.target.checked)}
          style={{
            width: "18px",
            height: "18px",
            marginTop: "3px",
            padding: 0,
            flexShrink: 0,
            accentColor: "var(--mint-dark)",
          }}
        />
        <span>
          I acknowledge the{" "}
          <Link
            href="/terms#privacy"
            style={{ textDecoration: "underline", fontWeight: 700 }}
          >
            BaraTrust Privacy Notice
          </Link>{" "}
          and understand my inquiry will be stored solely so Todd &amp; Noelah can review and follow
          up personally (never sold or shared with third-party marketers). *
        </span>
      </label>

      {errorMessage && (
        <div
          role="alert"
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: "12px",
            border: "1px solid rgba(180, 83, 9, 0.45)",
            background: "rgba(180, 83, 9, 0.1)",
            color: "var(--ink)",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          {errorMessage}
        </div>
      )}

      <button type="submit" className="btn primary full" disabled={submitting}>
        {submitting ? "Recording Inquiry..." : "Send Inquiry"}
      </button>

      <p className="form-note" style={{ marginTop: "12px" }}>
        Please do not include passwords, Social Security numbers, or payment card details in this
        form.
      </p>
    </form>
  );
}
