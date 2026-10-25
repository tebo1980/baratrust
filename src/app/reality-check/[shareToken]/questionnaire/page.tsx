"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Send,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import "../../../landing.css";

interface BusinessData {
  businessName: string | null;
  website: string;
  cityState: string | null;
  businessType?: string | null;
  primaryHeadache?: string | null;
  status: string;
  humanReviewRequested?: boolean;
}

export default function OwnerQuestionnairePage() {
  const params = useParams();
  const shareToken = params?.shareToken as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [answers, setAnswers] = useState({
    customerAcquisition: "",
    biggestProblem: "",
    missedInquiries: "",
    followUpProcess: "",
    currentMarketingSpend: "",
    repetitiveAdminWaste: "",
    growthOpportunity: "",
    freeEmployeeRole: "",
    additionalNotes: "",
  });

  useEffect(() => {
    if (!shareToken) return;

    fetch(`/api/reality-check/questionnaire?shareToken=${encodeURIComponent(shareToken)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load Reality Check information");
        return res.json();
      })
      .then((data) => {
        if (data.business) {
          setBusiness(data.business);
          if (data.responses) {
            setAnswers({
              customerAcquisition: data.responses.customerAcquisition || "",
              biggestProblem: data.responses.biggestProblem || data.business.primaryHeadache || "",
              missedInquiries: data.responses.missedInquiries || "",
              followUpProcess: data.responses.followUpProcess || "",
              currentMarketingSpend: data.responses.currentMarketingSpend || "",
              repetitiveAdminWaste: data.responses.repetitiveAdminWaste || "",
              growthOpportunity: data.responses.growthOpportunity || "",
              freeEmployeeRole: data.responses.freeEmployeeRole || "",
              additionalNotes: data.responses.additionalNotes || "",
            });
          } else if (data.business.primaryHeadache) {
            setAnswers((prev) => ({ ...prev, biggestProblem: data.business.primaryHeadache }));
          }
        }
      })
      .catch((err) => {
        setErrorMsg(err.message || "Failed to load reality check data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [shareToken]);

  const handleChange = (field: keyof typeof answers, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/reality-check/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareToken,
          ...answers,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save questionnaire responses.");
      }

      try {
        if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
          (window as any).gtag("event", "questionnaire_completed");
        }
      } catch {}

      setSubmitted(true);
      window.scrollTo({ top: 100, behavior: "smooth" });
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="landing-wrapper min-h-screen flex items-center justify-center p-6"
        data-theme="dark"
      >
        <div className="flex items-center gap-3 text-[#bac9bf] text-sm font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-[#7be0b8]" />
          <span>Loading your Reality Check questionnaire...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-wrapper min-h-screen" data-theme="dark">
      {/* Header */}
      <header className="site-header">
        <div className="wrap nav-wrap">
          <Link className="brand" href="/">
            <span className="brand-mark">B</span>
            <span>BaraTrust</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="finding-badge finding-badge--pass">
              Owner Context · Optional
            </span>
          </div>
        </div>
      </header>

      <main className="wrap" style={{ maxWidth: "820px", padding: "48px 0 84px" }}>
        {/* Title & Context */}
        <div style={{ marginBottom: "28px" }}>
          <p className="eyebrow" style={{ marginBottom: "10px" }}>
            Optional Owner Context · 100% Optional
            {business ? ` · ${business.businessName || business.website}` : ""}
            {business?.cityState ? ` (${business.cityState})` : ""}
          </p>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              marginBottom: "12px",
              lineHeight: 1.08,
            }}
          >
            Want Us to Make the Human Review More Useful?
          </h1>
          <p className="section-intro" style={{ fontSize: "1.08rem", marginTop: 0 }}>
            Answer a few quick questions so Todd and Noelah understand what matters most to your business.
          </p>

          <div
            className="starter-note"
            style={{
              marginTop: "20px",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "16px 18px",
            }}
          >
            <ShieldCheck
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              style={{ color: "var(--mint)" }}
            />
            <div>
              <strong style={{ fontSize: "0.94rem", color: "var(--ink)" }}>
                Your Reality Check request is already in our review queue
              </strong>
              <span style={{ fontSize: "0.86rem", lineHeight: 1.55, marginTop: "4px" }}>
                Completing this page is completely optional. You can answer whichever questions are helpful, leave any blank, or skip this step altogether.
              </span>
            </div>
          </div>
        </div>

        {business && !business.humanReviewRequested ? (
          <div className="lead-form" style={{ textAlign: "center", padding: "36px 28px" }}>
            <h2 style={{ fontSize: "1.65rem", marginBottom: "10px" }}>
              Request Your Full Human Review First
            </h2>
            <p
              style={{
                fontSize: "0.95rem",
                maxWidth: "520px",
                margin: "0 auto 22px",
                color: "var(--muted)",
              }}
            >
              Before answering the optional owner-context questions, please add your email on your scan snapshot so Todd &amp; Noelah know where to send your finished Reality Check report.
            </p>
            <Link
              href={`/reality-check?scan=${encodeURIComponent(shareToken)}`}
              className="btn primary"
              style={{ gap: "8px" }}
            >
              Return to Scan Snapshot &amp; Add Email <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : submitted ? (
          /* SUCCESS CONFIRMATION */
          <div className="lead-form" style={{ textAlign: "center", padding: "40px 28px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "999px",
                background: "rgba(123, 224, 184, 0.12)",
                border: "1px solid rgba(123, 224, 184, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
                color: "var(--mint)",
              }}
            >
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 style={{ fontSize: "1.8rem", marginBottom: "10px" }}>
              Context Saved for Your Review
            </h2>
            <p
              style={{
                fontSize: "0.96rem",
                maxWidth: "560px",
                margin: "0 auto 24px",
                color: "var(--muted)",
              }}
            >
              Thank you. Todd and Noelah now have both your automated scan snapshot and your notes as they prepare your finished Reality Check.
            </p>

            <div
              className="finding-card"
              style={{
                maxWidth: "440px",
                margin: "0 auto 26px",
                textAlign: "left",
                padding: "16px 18px",
              }}
            >
              <div className="finding-card-header" style={{ marginBottom: "8px" }}>
                <span style={{ color: "var(--muted)", fontSize: "0.84rem" }}>Business</span>
                <strong style={{ fontSize: "0.88rem" }}>
                  {business?.businessName || business?.website}
                </strong>
              </div>
              <div className="finding-card-header" style={{ marginBottom: "8px" }}>
                <span style={{ color: "var(--muted)", fontSize: "0.84rem" }}>Status</span>
                <span className="finding-badge finding-badge--pass">In Review Queue</span>
              </div>
              <div className="finding-card-header" style={{ marginBottom: 0 }}>
                <span style={{ color: "var(--muted)", fontSize: "0.84rem" }}>Typical turnaround</span>
                <strong style={{ fontSize: "0.86rem", color: "var(--mint)" }}>
                  Within 1 business day
                </strong>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <Link href="/" className="btn primary">
                Return to BaraTrust Homepage
              </Link>
              <a href="mailto:todd@baratrust.com" className="btn secondary">
                Email Todd Directly
              </a>
            </div>
          </div>
        ) : (
          /* THE 8 QUESTIONS FORM */
          <form onSubmit={handleSubmit} className="lead-form" style={{ display: "grid", gap: "22px" }}>
            {/* Question 1 */}
            <div>
              <label htmlFor="q-customer-acquisition" style={{ marginBottom: "4px" }}>
                1. Where do most new customers currently come from?
              </label>
              <p className="form-note" style={{ marginTop: 0, marginBottom: "8px" }}>
                e.g., Word-of-mouth, repeat clients, Google search, Facebook, passing by on the street, direct referrals...
              </p>
              <textarea
                id="q-customer-acquisition"
                rows={2}
                value={answers.customerAcquisition}
                onChange={(e) => handleChange("customerAcquisition", e.target.value)}
                placeholder="e.g. 70% word of mouth, some Google Maps. We don't get much from our website."
              />
            </div>

            {/* Question 2 */}
            <div>
              <label htmlFor="q-biggest-problem" style={{ marginBottom: "4px" }}>
                2. What is the biggest business problem you want help with right now?
              </label>
              <p className="form-note" style={{ marginTop: 0, marginBottom: "8px" }}>
                What keeps you up at night or feels like friction in your day-to-day operations?
              </p>
              <textarea
                id="q-biggest-problem"
                rows={2}
                value={answers.biggestProblem}
                onChange={(e) => handleChange("biggestProblem", e.target.value)}
                placeholder="e.g. Too many price-shoppers, not enough high-ticket jobs, or quotes stalling out."
              />
            </div>

            {/* Question 3 */}
            <div>
              <label htmlFor="q-missed-inquiries" style={{ marginBottom: "4px" }}>
                3. Do you regularly miss calls, messages, quote requests, catering requests, or other inquiries?
              </label>
              <p className="form-note" style={{ marginTop: 0, marginBottom: "8px" }}>
                What happens when someone reaches out while you or your team are busy?
              </p>
              <textarea
                id="q-missed-inquiries"
                rows={2}
                value={answers.missedInquiries}
                onChange={(e) => handleChange("missedInquiries", e.target.value)}
                placeholder="e.g. When we're on a job or during the lunch rush, calls go to voicemail and half don't leave a message."
              />
            </div>

            {/* Question 4 */}
            <div>
              <label htmlFor="q-follow-up" style={{ marginBottom: "4px" }}>
                4. How do you currently follow up with people who inquire but do not buy immediately?
              </label>
              <p className="form-note" style={{ marginTop: 0, marginBottom: "8px" }}>
                Do you have a regular follow-up routine, or do unclosed leads tend to slip away?
              </p>
              <textarea
                id="q-follow-up"
                rows={2}
                value={answers.followUpProcess}
                onChange={(e) => handleChange("followUpProcess", e.target.value)}
                placeholder="e.g. I try to text them back next week, but honestly if they don't respond we usually forget about them."
              />
            </div>

            {/* Question 5 */}
            <div>
              <label htmlFor="q-marketing-spend" style={{ marginBottom: "4px" }}>
                5. Are you currently paying for advertising or marketing services?
              </label>
              <p className="form-note" style={{ marginTop: 0, marginBottom: "8px" }}>
                e.g., Google Ads, Yelp, an agency retainer, local mailers, software subscriptions...
              </p>
              <textarea
                id="q-marketing-spend"
                rows={2}
                value={answers.currentMarketingSpend}
                onChange={(e) => handleChange("currentMarketingSpend", e.target.value)}
                placeholder="e.g. Paying an SEO agency $800/mo and $300 on Google Ads, not sure if it's working."
              />
            </div>

            {/* Question 6 */}
            <div>
              <label htmlFor="q-admin-waste" style={{ marginBottom: "4px" }}>
                6. What repetitive or administrative task wastes the most time every week?
              </label>
              <p className="form-note" style={{ marginTop: 0, marginBottom: "8px" }}>
                The manual busywork you wish would just happen on its own.
              </p>
              <textarea
                id="q-admin-waste"
                rows={2}
                value={answers.repetitiveAdminWaste}
                onChange={(e) => handleChange("repetitiveAdminWaste", e.target.value)}
                placeholder="e.g. Writing out estimates by hand, chasing unpaid invoices, copying info between apps."
              />
            </div>

            {/* Question 7 */}
            <div>
              <label htmlFor="q-growth-opportunity" style={{ marginBottom: "4px" }}>
                7. Is there a product, service, or revenue stream you want to grow?
              </label>
              <p className="form-note" style={{ marginTop: 0, marginBottom: "8px" }}>
                What part of your business has higher margins or could grow if more people knew about it?
              </p>
              <textarea
                id="q-growth-opportunity"
                rows={2}
                value={answers.growthOpportunity}
                onChange={(e) => handleChange("growthOpportunity", e.target.value)}
                placeholder="e.g. We want to do more commercial accounts and recurring quarterly service plans."
              />
            </div>

            {/* Question 8 */}
            <div>
              <label htmlFor="q-free-employee" style={{ marginBottom: "4px" }}>
                8. If you could add one extra employee for free, what would you have them handle?
              </label>
              <p className="form-note" style={{ marginTop: 0, marginBottom: "8px" }}>
                This helps us see which bottleneck is holding back your time or growth the most.
              </p>
              <textarea
                id="q-free-employee"
                rows={2}
                value={answers.freeEmployeeRole}
                onChange={(e) => handleChange("freeEmployeeRole", e.target.value)}
                placeholder="e.g. Answering every phone call instantly and scheduling appointments on our calendar."
              />
            </div>

            {/* Free-text field */}
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: "18px" }}>
              <label
                htmlFor="q-additional-notes"
                style={{
                  marginBottom: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Sparkles className="w-4 h-4" style={{ color: "var(--mint)" }} />
                Anything else you want us to know? (Optional)
              </label>
              <p className="form-note" style={{ marginTop: 0, marginBottom: "8px" }}>
                Specific competitors to look at, recent changes, pricing concerns, or goals.
              </p>
              <textarea
                id="q-additional-notes"
                rows={3}
                value={answers.additionalNotes}
                onChange={(e) => handleChange("additionalNotes", e.target.value)}
                placeholder="e.g. Our main rival down the road just revamped their site. Also, we are thinking about opening a second location next year."
              />
            </div>

            {errorMsg && (
              <div
                role="alert"
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1px solid rgba(248, 113, 113, 0.45)",
                  background: "rgba(127, 29, 29, 0.25)",
                  color: "#fca5a5",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "12px",
                paddingTop: "6px",
              }}
            >
              <button
                type="submit"
                disabled={submitting}
                className="btn primary"
                style={{ flex: "1 1 260px", gap: "8px" }}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving Responses...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Context to Todd &amp; Noelah
                  </>
                )}
              </button>

              <Link
                href="/"
                className="btn secondary"
                style={{ flex: "0 1 auto", padding: "0 22px" }}
              >
                Skip / Return Home
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
