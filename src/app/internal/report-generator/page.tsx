"use client";

import { useState, FormEvent } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const YEARS = ["2024", "2025", "2026", "2027"];

const CALL_SOURCES = [
  "Google Ads",
  "Facebook Ads",
  "Google Business Profile",
  "Direct",
  "Website Organic",
  "Other",
];

const WEAK_CATEGORIES = [
  "Visibility",
  "Lead Capture",
  "Profitability",
  "Customer Quality",
  "Reputation",
];

const inputClass =
  "w-full rounded-md bg-[#1E1B16] border border-[#F2EDE4]/10 px-3 py-2 text-[#F2EDE4] placeholder:text-[#F2EDE4]/30 focus:outline-none focus:ring-1 focus:ring-[#C17B2A]";

const selectClass =
  "w-full rounded-md bg-[#1E1B16] border border-[#F2EDE4]/10 px-3 py-2 text-[#F2EDE4] focus:outline-none focus:ring-1 focus:ring-[#C17B2A] appearance-none";

const labelClass = "block text-sm font-medium text-[#F2EDE4]/80 mb-1";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border border-[#F2EDE4]/10 rounded-lg p-5 space-y-4">
      <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-[#C17B2A]">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function DollarInput({
  label,
  value,
  onChange,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F2EDE4]/40">$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={`${inputClass} pl-7`}
        />
      </div>
    </div>
  );
}

export default function Home() {
  // Section 1 — Client Info
  const [clientName, setClientName] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [reportYear, setReportYear] = useState("");
  const [tier, setTier] = useState("");

  // Section 2 — Call Performance
  const [callsThisMonth, setCallsThisMonth] = useState("");
  const [callsLastMonth, setCallsLastMonth] = useState("");
  const [guaranteeCalls, setGuaranteeCalls] = useState("");
  const [daysRemaining, setDaysRemaining] = useState("");
  const [topCallSource, setTopCallSource] = useState("");

  // Section 3 — Ad Performance
  const [fbAdSpend, setFbAdSpend] = useState("");
  const [googleAdSpend, setGoogleAdSpend] = useState("");
  const [costPerCall, setCostPerCall] = useState("");
  const [bestAd, setBestAd] = useState("");

  // Section 4 — Business Health Score
  const [scoreThisMonth, setScoreThisMonth] = useState("");
  const [scoreLastMonth, setScoreLastMonth] = useState("");
  const [weakestCategory, setWeakestCategory] = useState("");

  // Section 5 — Context for Claude
  const [whatWorked, setWhatWorked] = useState("");
  const [challenges, setChallenges] = useState("");
  const [toddNotes, setToddNotes] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setReport("");

    const formData = {
      clientName,
      reportMonth,
      reportYear,
      tier,
      callsThisMonth,
      callsLastMonth,
      guaranteeCalls,
      daysRemaining,
      topCallSource,
      fbAdSpend,
      googleAdSpend: tier === "Complete" ? googleAdSpend : null,
      costPerCall,
      bestAd: bestAd || null,
      scoreThisMonth,
      scoreLastMonth,
      weakestCategory,
      whatWorked,
      challenges: challenges || null,
      toddNotes: toddNotes || null,
    };

    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      setReport(data.report);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen px-4 py-12 max-w-2xl mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          BaraTrust Monthly Report Generator
        </h1>
        <p className="mt-2 text-[#F2EDE4]/60">Internal Use Only</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1 — Client Info */}
        <Section title="Client Info">
          <div>
            <label className={labelClass}>Client Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Report Month</label>
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                required
                className={selectClass}
              >
                <option value="" disabled>Select month</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Report Year</label>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(e.target.value)}
                required
                className={selectClass}
              >
                <option value="" disabled>Select year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Subscription Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              required
              className={selectClass}
            >
              <option value="" disabled>Select tier</option>
              <option value="Starter">Starter</option>
              <option value="Complete">Complete</option>
            </select>
          </div>
        </Section>

        {/* Section 2 — Call Performance */}
        <Section title="Call Performance">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Total Calls This Month</label>
              <input
                type="number"
                min="0"
                value={callsThisMonth}
                onChange={(e) => setCallsThisMonth(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Total Calls Last Month</label>
              <input
                type="number"
                min="0"
                value={callsLastMonth}
                onChange={(e) => setCallsLastMonth(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Guarantee Calls to Date</label>
              <input
                type="number"
                min="0"
                value={guaranteeCalls}
                onChange={(e) => setGuaranteeCalls(e.target.value)}
                required
                className={inputClass}
              />
              <p className="text-xs text-[#F2EDE4]/40 mt-1">Out of 10</p>
            </div>
            <div>
              <label className={labelClass}>Days Remaining in Guarantee</label>
              <input
                type="number"
                min="0"
                value={daysRemaining}
                onChange={(e) => setDaysRemaining(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Top Call Source</label>
            <select
              value={topCallSource}
              onChange={(e) => setTopCallSource(e.target.value)}
              required
              className={selectClass}
            >
              <option value="" disabled>Select source</option>
              {CALL_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </Section>

        {/* Section 3 — Ad Performance */}
        <Section title="Ad Performance">
          <DollarInput
            label="Facebook Ad Spend This Month"
            value={fbAdSpend}
            onChange={setFbAdSpend}
          />
          {tier === "Complete" && (
            <DollarInput
              label="Google Ad Spend This Month"
              value={googleAdSpend}
              onChange={setGoogleAdSpend}
            />
          )}
          <DollarInput
            label="Cost Per Call This Month"
            value={costPerCall}
            onChange={setCostPerCall}
          />
          <div>
            <label className={labelClass}>
              Best Performing Ad Description
              <span className="text-[#F2EDE4]/30 font-normal ml-2">Optional</span>
            </label>
            <input
              type="text"
              value={bestAd}
              onChange={(e) => setBestAd(e.target.value)}
              className={inputClass}
            />
          </div>
        </Section>

        {/* Section 4 — Business Health Score */}
        <Section title="Business Health Score">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Overall Score This Month</label>
              <input
                type="number"
                min="0"
                max="100"
                value={scoreThisMonth}
                onChange={(e) => setScoreThisMonth(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Overall Score Last Month</label>
              <input
                type="number"
                min="0"
                max="100"
                value={scoreLastMonth}
                onChange={(e) => setScoreLastMonth(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Weakest Category This Month</label>
            <select
              value={weakestCategory}
              onChange={(e) => setWeakestCategory(e.target.value)}
              required
              className={selectClass}
            >
              <option value="" disabled>Select category</option>
              {WEAK_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </Section>

        {/* Section 5 — Context for Claude */}
        <Section title="Context for Claude">
          <div>
            <label className={labelClass}>What Worked Well This Month</label>
            <textarea
              rows={3}
              value={whatWorked}
              onChange={(e) => setWhatWorked(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              What Challenges or Issues Came Up
              <span className="text-[#F2EDE4]/30 font-normal ml-2">Optional</span>
            </label>
            <textarea
              rows={3}
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Anything Specific Todd Wants Included
              <span className="text-[#F2EDE4]/30 font-normal ml-2">Optional</span>
            </label>
            <textarea
              rows={3}
              value={toddNotes}
              onChange={(e) => setToddNotes(e.target.value)}
              className={inputClass}
            />
          </div>
        </Section>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[#C17B2A] py-3 text-white font-semibold text-lg hover:bg-[#C17B2A]/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[#C17B2A] focus:ring-offset-2 focus:ring-offset-[#0E0C0A] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Generating your report..." : "Generate Report"}
        </button>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}
      </form>

      {report && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[#C17B2A]">Generated Report</h2>
            <button
              onClick={copyToClipboard}
              className="text-sm px-3 py-1.5 rounded-md border border-[#F2EDE4]/20 text-[#F2EDE4]/80 hover:bg-[#F2EDE4]/10 transition-colors"
            >
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
          </div>
          <div className="rounded-lg bg-[#1E1B16] border border-[#F2EDE4]/10 p-6">
            <div className="whitespace-pre-wrap text-[#F2EDE4]/90 leading-relaxed">
              {report}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
