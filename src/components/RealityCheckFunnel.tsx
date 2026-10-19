"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { decodeHtmlEntities } from "@/lib/scanner/parser";

export interface PublicFinding {
  category: string;
  checkKey: string;
  title: string;
  state: "PASS" | "FAIL" | "UNKNOWN";
  scoreContribution: number;
  maxPoints: number;
  supportingDetail: string;
}

export interface ScanSnapshot {
  shareToken: string;
  website: string;
  normalizedUrl: string;
  businessName: string | null;
  cityState: string | null;
  sourceType?: "standalone_website" | "hosted_profile";
  platformKey?: string | null;
  platformLabel?: string | null;
  status: string;
  scanStatus: "completed" | "failed" | "blocked" | "timeout";
  scanFailureReason: string | null;
  overallScore: number | null;
  overallCoverage: number;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  scoreBreakdown: {
    digitalPresence: number | null;
    customerJourney: number | null;
    trustReputation: number | null;
    localDiscovery: number | null;
    opportunityCapture: number | null;
    sourceType?: "standalone_website" | "hosted_profile";
    platformKey?: string | null;
    platformLabel?: string | null;
    coverage?: {
      overall: number;
      confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
      digitalPresence: number;
      customerJourney: number;
      trustReputation: number;
      localDiscovery: number;
      opportunityCapture: number;
    };
  } | null;
  findingsCount: number;
  findings: PublicFinding[];
  humanReviewRequested: boolean;
  questionnaireCompleted?: boolean;
}

function trackFunnelEvent(eventName: string, params?: Record<string, any>) {
  try {
    if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("event", eventName, params || {});
    }
  } catch {
    // Non-blocking analytics
  }
}

export default function RealityCheckFunnel({
  variant = "embedded",
}: {
  variant?: "embedded" | "standalone";
}) {
  const [urlInput, setUrlInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [scanError, setScanError] = useState("");
  const [snapshot, setSnapshot] = useState<ScanSnapshot | null>(null);

  // Step 3: Email capture state
  const [emailInput, setEmailInput] = useState("");
  const [businessNameInput, setBusinessNameInput] = useState("");
  const [ownerNameInput, setOwnerNameInput] = useState("");
  const [cityStateInput, setCityStateInput] = useState("");
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [humanReviewRequested, setHumanReviewRequested] = useState(false);
  const [skippedQuestionnaire, setSkippedQuestionnaire] = useState(false);

  const loadSnapshotByToken = useCallback(async (token: string) => {
    if (!token || token.length < 16) return;
    setRestoring(true);
    setScanError("");
    try {
      const res = await fetch(`/api/reality-check?shareToken=${encodeURIComponent(token)}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.shareToken) {
        setSnapshot({
          shareToken: data.shareToken,
          website: data.website,
          normalizedUrl: data.normalizedUrl || data.website,
          businessName: data.businessName ? decodeHtmlEntities(data.businessName) : null,
          cityState: data.cityState ? decodeHtmlEntities(data.cityState) : null,
          sourceType: data.sourceType || data.scoreBreakdown?.sourceType || "standalone_website",
          platformKey: data.platformKey ?? data.scoreBreakdown?.platformKey ?? null,
          platformLabel: data.platformLabel ?? data.scoreBreakdown?.platformLabel ?? null,
          status: data.status,
          scanStatus: data.scanStatus,
          scanFailureReason: data.scanFailureReason || null,
          overallScore: data.overallScore,
          overallCoverage: data.overallCoverage ?? 0,
          confidence: data.confidence || "INSUFFICIENT",
          scoreBreakdown: data.scoreBreakdown || null,
          findingsCount: data.findingsCount || 0,
          findings: data.findings || [],
          humanReviewRequested: Boolean(data.humanReviewRequested),
          questionnaireCompleted: Boolean(data.questionnaireCompleted),
        });
        setHumanReviewRequested(Boolean(data.humanReviewRequested));
        setBusinessNameInput(data.businessName ? decodeHtmlEntities(data.businessName) : "");
        setCityStateInput(data.cityState ? decodeHtmlEntities(data.cityState) : "");
      }
    } catch {
      // Ignore restore errors silently
    } finally {
      setRestoring(false);
    }
  }, []);

  // Restore scan state on mount or back/forward navigation without creating duplicate requests
  useEffect(() => {
    const readTokenFromLocation = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get("scan");
        if (urlToken && urlToken.length >= 16) {
          return urlToken;
        }
      } catch {}
      return null;
    };

    const initialToken = readTokenFromLocation();
    if (initialToken) {
      loadSnapshotByToken(initialToken);
    }

    const onPopState = () => {
      const token = readTokenFromLocation();
      if (token) {
        loadSnapshotByToken(token);
      } else {
        setSnapshot(null);
        setHumanReviewRequested(false);
        setSkippedQuestionnaire(false);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [loadSnapshotByToken]);

  const handleScanSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (scanning) return;

    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      setScanError("Please paste your business website, Google Business link, or Facebook page URL.");
      return;
    }

    setScanning(true);
    setScanError("");
    setEmailError("");
    setSkippedQuestionnaire(false);

    trackFunnelEvent("reality_check_started", { url_provided: true, surface: variant });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 28000);

    try {
      const res = await fetch("/api/reality-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ website: trimmedUrl }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not scan that link. Please check the address and try again.");
      }

      const nextSnapshot: ScanSnapshot = {
        shareToken: data.shareToken,
        website: data.website || trimmedUrl,
        normalizedUrl: data.normalizedUrl || trimmedUrl,
        businessName: data.businessName ? decodeHtmlEntities(data.businessName) : null,
        cityState: data.cityState ? decodeHtmlEntities(data.cityState) : null,
        sourceType: data.sourceType || data.scoreBreakdown?.sourceType || "standalone_website",
        platformKey: data.platformKey ?? data.scoreBreakdown?.platformKey ?? null,
        platformLabel: data.platformLabel ?? data.scoreBreakdown?.platformLabel ?? null,
        status: data.status,
        scanStatus: data.scanStatus,
        scanFailureReason: data.scanFailureReason || null,
        overallScore: data.overallScore,
        overallCoverage: data.overallCoverage ?? 0,
        confidence: data.confidence || "INSUFFICIENT",
        scoreBreakdown: data.scoreBreakdown || null,
        findingsCount: data.findingsCount || 0,
        findings: data.findings || [],
        humanReviewRequested: Boolean(data.humanReviewRequested),
      };

      setSnapshot(nextSnapshot);
      setHumanReviewRequested(Boolean(data.humanReviewRequested));
      setBusinessNameInput(data.businessName ? decodeHtmlEntities(data.businessName) : "");
      setCityStateInput(data.cityState ? decodeHtmlEntities(data.cityState) : "");

      trackFunnelEvent("automated_scan_completed", {
        scan_status: data.scanStatus,
        confidence: data.confidence,
        score_available: data.overallScore !== null,
      });

      // Update URL query param so refresh & back/forward preserve state without re-submitting
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("scan", data.shareToken);
        window.history.pushState({ shareToken: data.shareToken }, "", url.toString());
        sessionStorage.setItem("baratrust_last_scan_token", data.shareToken);
      } catch {}
    } catch (err: any) {
      if (err.name === "AbortError") {
        setScanError(
          "That scan took longer than expected. Please try again or paste your main website address."
        );
      } else {
        setScanError(
          err.message || "We couldn’t run the scan right now. Please check the link and try again."
        );
      }
    } finally {
      clearTimeout(timeout);
      setScanning(false);
    }
  };

  const handleRequestHumanReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!snapshot || submittingEmail) return;

    const cleanEmail = emailInput.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setEmailError("Please enter a valid email address where we can send your finished report.");
      return;
    }

    setSubmittingEmail(true);
    setEmailError("");

    try {
      const res = await fetch("/api/reality-check", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          shareToken: snapshot.shareToken,
          email: cleanEmail,
          businessName: businessNameInput.trim() || snapshot.businessName || null,
          ownerName: ownerNameInput.trim() || null,
          cityState: cityStateInput.trim() || snapshot.cityState || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not save your request. Please try again.");
      }

      setHumanReviewRequested(true);
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              businessName: data.businessName || prev.businessName,
              cityState: data.cityState || prev.cityState,
              status: data.status || "NEEDS_HUMAN_REVIEW",
              humanReviewRequested: true,
            }
          : prev
      );

      trackFunnelEvent("human_review_requested", {
        surface: variant,
      });
    } catch (err: any) {
      setEmailError(err.message || "Could not save your email. Please try again.");
    } finally {
      setSubmittingEmail(false);
    }
  };

  const handleResetScan = () => {
    setSnapshot(null);
    setHumanReviewRequested(false);
    setSkippedQuestionnaire(false);
    setScanError("");
    setEmailError("");
    setUrlInput("");
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("scan");
      window.history.pushState({}, "", url.toString());
      sessionStorage.removeItem("baratrust_last_scan_token");
    } catch {}
  };

  if (restoring) {
    return (
      <div id="reality-check-form" className="lead-form" aria-live="polite">
        <p className="eyebrow" style={{ marginBottom: "8px" }}>
          Restoring Scan Results
        </p>
        <h3>Loading your automated snapshot...</h3>
        <p className="form-note">Fetching your saved scan results.</p>
      </div>
    );
  }

  // STEP 1: URL-FIRST ENTRY
  if (!snapshot) {
    return (
      <form
        id="reality-check-form"
        className="lead-form"
        onSubmit={handleScanSubmit}
        aria-labelledby="intake-title"
        aria-describedby="intake-note form-availability"
      >
        <p className="eyebrow" style={{ marginBottom: "8px" }}>
          Step 1 — Instant Automated Check
        </p>
        <h3 id="intake-title">Start With Your Business</h3>
        <p id="intake-note" style={{ marginTop: "8px", marginBottom: "20px" }}>
          Paste your website, Google Business page, or Facebook business page. We’ll run the first scan right away.
        </p>

        <label htmlFor="rc-website-input">
          Business URL
          <input
            id="rc-website-input"
            name="website"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="e.g., yourbusiness.com or facebook.com/yourbusiness"
            required
            disabled={scanning}
          />
        </label>

        <button className="btn primary full" type="submit" disabled={scanning}>
          {scanning ? "Scanning Your Business Link..." : "Run My Free Reality Check"}
        </button>

        <p id="form-availability" className="form-note" style={{ marginTop: "12px" }}>
          <strong>No email required to see your first results.</strong> Free. No credit card. No obligation.
        </p>

        <div className="starter-note" style={{ marginTop: "18px", padding: "14px 16px" }}>
          <strong style={{ fontSize: "0.9rem" }}>Want the full Reality Check?</strong>
          <span style={{ fontSize: "0.86rem" }}>
            After your instant scan finishes, you can add your email if you want Todd &amp; Noelah to review the parts software can’t.
          </span>
        </div>

        {scanError && (
          <p
            id="form-status"
            className="form-note"
            role="alert"
            aria-live="assertive"
            style={{ color: "#b91c1c", fontWeight: 600, marginTop: "12px" }}
          >
            {scanError}
          </p>
        )}
      </form>
    );
  }

  const isHostedProfile =
    snapshot.sourceType === "hosted_profile" ||
    snapshot.scoreBreakdown?.sourceType === "hosted_profile";
  const platformLabel =
    snapshot.platformLabel ||
    snapshot.scoreBreakdown?.platformLabel ||
    "hosted business page";

  // Compute key findings for Step 2 Immediate Value display
  const passingFindings = snapshot.findings.filter((f) => f.state === "PASS");
  const failingFindings = snapshot.findings.filter((f) => f.state === "FAIL");
  const unknownFindings = snapshot.findings.filter((f) => f.state === "UNKNOWN");

  const highlightedFindings: PublicFinding[] = isHostedProfile
    ? [...passingFindings.slice(0, 4), ...unknownFindings.slice(0, 3)].slice(0, 6)
    : [
        ...failingFindings.slice(0, 3),
        ...passingFindings.slice(0, 3),
        ...unknownFindings.slice(0, 2),
      ].slice(0, 6);

  const displayTarget =
    snapshot.businessName ||
    snapshot.normalizedUrl.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0] ||
    snapshot.website;

  return (
    <div id="reality-check-form" className="lead-form" aria-live="polite">
      {/* STEP 2: IMMEDIATE AUTOMATED VALUE BEFORE EMAIL */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "8px",
        }}
      >
        <p className="eyebrow" style={{ margin: 0 }}>
          {isHostedProfile ? "Limited Automated Scan" : "Automated Scan Snapshot"}
        </p>
        <button
          type="button"
          onClick={handleResetScan}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            fontSize: "0.82rem",
            textDecoration: "underline",
            cursor: "pointer",
            color: "inherit",
            opacity: 0.8,
          }}
        >
          Scan a different link
        </button>
      </div>

      <h3 id="intake-title" style={{ marginBottom: "6px" }}>
        {decodeHtmlEntities(displayTarget)}
      </h3>
      <p className="form-note" style={{ marginTop: 0, marginBottom: "16px", wordBreak: "break-all" }}>
        Scanned link: {snapshot.normalizedUrl}
      </p>

      {/* Score & Coverage Box */}
      {isHostedProfile ? (
        <div className="starter-note" style={{ marginTop: "12px", marginBottom: "18px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <strong style={{ fontSize: "1.08rem" }}>
              Automated Score Withheld
            </strong>
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "inline",
              }}
            >
              {snapshot.confidence} Confidence ({snapshot.overallCoverage}% Coverage)
            </span>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: "0.9rem", lineHeight: 1.5, color: "var(--muted)" }}>
            We could only evaluate a limited portion of the standard website checks because this is a {platformLabel} rather than a standalone website.
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "0.88rem", lineHeight: 1.5, color: "var(--muted)" }}>
            This is a {platformLabel}, so some website-specific checks don’t apply. We were able to verify a few public signals, but the most useful part of this Reality Check will come from human review.
          </p>
        </div>
      ) : snapshot.overallScore !== null ? (
        <div className="starter-note" style={{ marginTop: "12px", marginBottom: "18px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <strong style={{ fontSize: "1.2rem" }}>
              Automated Score: {snapshot.overallScore} / 100
            </strong>
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "inline",
              }}
            >
              {snapshot.confidence} Confidence ({snapshot.overallCoverage}% Coverage)
            </span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "0.9rem", lineHeight: 1.5, color: "var(--muted)" }}>
            {snapshot.confidence === "HIGH"
              ? `Our scanner verified ${passingFindings.length} passing signals and flagged ${failingFindings.length} areas that may be costing you inquiries.`
              : `Provisional score based on ${snapshot.overallCoverage}% observable static web signals (${unknownFindings.length} checks require human verification).`}
          </p>
        </div>
      ) : (
        <div className="starter-note" style={{ marginTop: "12px", marginBottom: "18px" }}>
          <strong>
            Score Withheld —{" "}
            {snapshot.scanStatus === "blocked"
              ? "Firewall / Bot Protection Detected"
              : snapshot.scanStatus === "timeout"
              ? "Site Timed Out During Automated Probe"
              : "Insufficient Static HTML Coverage"}
          </strong>
          <p style={{ margin: "6px 0 0", fontSize: "0.9rem", lineHeight: 1.5, color: "var(--muted)" }}>
            We never invent or penalize your score when a site blocks automated crawlers, uses a social platform login wall, or renders entirely in the browser ({snapshot.overallCoverage}% static coverage). Instead, we mark unobservable checks as <strong style={{ display: "inline" }}>UNKNOWN</strong> so a human can inspect them directly.
          </p>
        </div>
      )}

      {/* Key Observable Findings */}
      {highlightedFindings.length > 0 && (
        <div style={{ marginTop: "16px", marginBottom: "18px" }}>
          <strong style={{ display: "block", fontSize: "0.92rem", marginBottom: "10px" }}>
            {isHostedProfile
              ? "Public Business Signals & Human-Review Checks:"
              : "Key Findings From Your First Scan:"}
          </strong>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: "8px",
            }}
          >
            {highlightedFindings.map((f) => {
              const badgeText =
                f.state === "PASS" ? "PASS" : f.state === "FAIL" ? "ATTENTION" : "HUMAN CHECK";
              const badgeColor =
                f.state === "PASS"
                  ? "#1f7f60"
                  : f.state === "FAIL"
                  ? "#b45309"
                  : "#5d6a64";

              return (
                <li
                  key={f.checkKey}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                    background: "rgba(255,255,255,0.45)",
                    fontSize: "0.88rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "2px",
                    }}
                  >
                    <strong>{decodeHtmlEntities(f.title)}</strong>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        color: badgeColor,
                        letterSpacing: "0.05em",
                      }}
                    >
                      [{badgeText}]
                    </span>
                  </div>
                  <span style={{ display: "block", fontSize: "0.82rem", opacity: 0.9 }}>
                    {decodeHtmlEntities(f.supportingDetail)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Clear Explanation of What the Scanner Could and Could Not Determine */}
      <div
        className="starter-note"
        style={{ marginTop: "14px", marginBottom: "22px", padding: "14px 16px" }}
      >
        <strong style={{ fontSize: "0.9rem", display: "block" }}>
          What software can see vs. what requires Todd &amp; Noelah:
        </strong>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "0.84rem",
            lineHeight: 1.5,
            color: "var(--muted)",
          }}
        >
          <strong style={{ display: "inline", color: "var(--text)" }}>Checked automatically:</strong>{" "}
          {isHostedProfile
            ? "Public business name, location signals, category or offerings summary, public page activity, and any direct contact or website links exposed in static HTML."
            : "HTTPS security, mobile setup, search title & descriptions, tap-to-call links, contact forms, and local schema markup."}
        </p>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: "0.84rem",
            lineHeight: 1.5,
            color: "var(--muted)",
          }}
        >
          <strong style={{ display: "inline", color: "var(--text)" }}>Requires human review:</strong>{" "}
          Whether local buyers actually find you over competitors, whether your offer and reputation build real trust, where calls or quotes slip through the cracks, and what you should <em>not</em> waste money on.
        </p>
      </div>

      {/* STEP 3: ASK FOR EMAIL AFTER VALUE */}
      {!humanReviewRequested ? (
        <form
          onSubmit={handleRequestHumanReview}
          style={{
            borderTop: "1px solid var(--line)",
            paddingTop: "20px",
            marginTop: "16px",
            display: "grid",
            gap: "14px",
          }}
        >
          <div>
            <p className="eyebrow" style={{ marginBottom: "6px" }}>
              Next Step — Human Review
            </p>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "8px" }}>
              Want the full human-reviewed Reality Check?
            </h3>
            <p style={{ fontSize: "0.92rem", marginTop: 0, marginBottom: 0 }}>
              Add your email and Todd &amp; Noelah will review the parts software can’t. We’ll send you the finished report when it’s ready.
            </p>
          </div>

          <label htmlFor="rc-email-input">
            Email address (to receive your finished report)
            <input
              id="rc-email-input"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@yourbusiness.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
              disabled={submittingEmail}
            />
          </label>

          {!snapshot.businessName && (
            <label htmlFor="rc-business-name-input">
              Business name (optional)
              <input
                id="rc-business-name-input"
                name="businessName"
                type="text"
                autoComplete="organization"
                placeholder="e.g., River City Plumbing"
                value={businessNameInput}
                onChange={(e) => setBusinessNameInput(e.target.value)}
                disabled={submittingEmail}
              />
            </label>
          )}

          <label htmlFor="rc-owner-name-input">
            Your name (optional)
            <input
              id="rc-owner-name-input"
              name="ownerName"
              type="text"
              autoComplete="name"
              placeholder="First name"
              value={ownerNameInput}
              onChange={(e) => setOwnerNameInput(e.target.value)}
              disabled={submittingEmail}
            />
          </label>

          {!snapshot.cityState && (
            <label htmlFor="rc-city-input">
              City &amp; State (optional)
              <input
                id="rc-city-input"
                name="cityState"
                type="text"
                placeholder="e.g., Louisville, KY"
                value={cityStateInput}
                onChange={(e) => setCityStateInput(e.target.value)}
                disabled={submittingEmail}
              />
            </label>
          )}

          <button className="btn primary full" type="submit" disabled={submittingEmail}>
            {submittingEmail ? "Requesting Human Review..." : "Send Me the Full Human-Reviewed Report"}
          </button>

          <p className="form-note" style={{ marginTop: "10px" }}>
            Used only to deliver your Reality Check report and follow up about your review. No mailing list or spam.
          </p>

          {emailError && (
            <p
              className="form-note"
              role="alert"
              style={{ color: "#b91c1c", fontWeight: 600, marginTop: "10px" }}
            >
              {emailError}
            </p>
          )}
        </form>
      ) : (
        /* STEP 4: OPTIONAL OWNER CONTEXT AFTER EMAIL CAPTURE */
        <div
          style={{
            borderTop: "1px solid var(--line)",
            paddingTop: "20px",
            marginTop: "16px",
          }}
        >
          <p className="eyebrow" style={{ marginBottom: "6px" }}>
            ✓ Human Review Requested
          </p>
          <h3 style={{ fontSize: "1.25rem", marginBottom: "8px" }}>
            Todd &amp; Noelah have your Reality Check in the review queue.
          </h3>
          <p style={{ fontSize: "0.92rem", marginTop: 0, marginBottom: "16px" }}>
            We’ll send your finished human-reviewed Reality Check report when it’s ready (typically within one business day).
          </p>

          {!skippedQuestionnaire && !snapshot.questionnaireCompleted ? (
            <div className="starter-note" style={{ marginTop: "14px" }}>
              <strong>Want us to make the human review more useful? (Optional)</strong>
              <span style={{ marginTop: "6px", marginBottom: "14px" }}>
                Answer a few quick questions so Todd &amp; Noelah understand what matters most to your business — like where customers come from, whether calls get missed, or what busywork wastes your time.
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Link
                  className="btn primary full"
                  href={`/reality-check/${snapshot.shareToken}/questionnaire`}
                >
                  Answer a Few Quick Questions (~2 min)
                </Link>
                <button
                  type="button"
                  className="btn secondary full"
                  onClick={() => setSkippedQuestionnaire(true)}
                >
                  Skip for Now — Just Send My Report
                </button>
              </div>
            </div>
          ) : (
            <div className="starter-note" style={{ marginTop: "14px" }}>
              <strong>You’re all set.</strong>
              <span>
                No further action needed. You can still{" "}
                <Link
                  href={`/reality-check/${snapshot.shareToken}/questionnaire`}
                  style={{ textDecoration: "underline", fontWeight: 700 }}
                >
                  add optional owner context anytime
                </Link>{" "}
                while Todd &amp; Noelah prepare your report.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
