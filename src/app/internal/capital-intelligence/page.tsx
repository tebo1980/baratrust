'use client'

import { useState, FormEvent } from 'react'

const INDUSTRIES = ['HVAC', 'Electrical', 'Plumbing', 'Roofing', 'Landscaping', 'Cleaning', 'General Contractor', 'Restaurant', 'Retail', 'Other']
const REVENUE_RANGES = ['Under $100K', '$100K-$500K', '$500K-$1M', 'Over $1M']
const GROWTH_OPTIONS = ['Declining', 'Flat', '10-25% growth', '25-50% growth', 'Over 50% growth']
const OWNER_DEP = ['Owner does everything', 'Owner manages team', 'Owner is mostly hands-off']
const MARGINS = ['Under 10%', '10-20%', '20-35%', 'Over 35%']
const PURPOSES = ['Open second location', 'Buy equipment', 'Hire team', 'Franchise the model', 'Acquisition interest', 'Working capital']
const TIMELINES = ['ASAP', '3-6 months', '6-12 months', '1-2 years']

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-card2)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--cream)',
  fontFamily: 'var(--font-body)', outline: 'none',
}
const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%237A7268' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
}
const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: 'var(--cream-muted)',
  letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px',
}
const btnStyle: React.CSSProperties = {
  background: 'var(--blue)', color: 'var(--cream)', padding: '14px 28px',
  borderRadius: '10px', fontWeight: 600, fontSize: '14px', border: 'none',
  cursor: 'pointer', width: '100%', fontFamily: 'var(--font-body)', letterSpacing: '0.02em',
}

function ToolSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '36px', marginBottom: '32px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, color: 'var(--cream)', marginBottom: '8px' }}>{title}</h2>
      <p style={{ fontSize: '14px', color: 'var(--cream-muted)', marginBottom: '28px', lineHeight: 1.6 }}>{description}</p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function Toggle({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          style={{
            flex: 1, padding: '8px 14px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            background: value === opt ? 'var(--blue)' : 'transparent',
            color: value === opt ? 'var(--cream)' : 'var(--cream-muted)',
          }}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function ResultBox({ loading, error, children }: { loading: boolean; error: string; children: React.ReactNode }) {
  if (loading) return (
    <div style={{ background: 'rgba(59,127,212,0.08)', border: '1px solid rgba(59,127,212,0.2)', borderRadius: '12px', padding: '24px', marginTop: '24px', textAlign: 'center', color: 'var(--blue-light)', fontStyle: 'italic' }}>
      Analyzing... this may take 10-15 seconds.
    </div>
  )
  if (error) return (
    <div style={{ background: 'rgba(224,90,90,0.08)', border: '1px solid rgba(224,90,90,0.2)', borderRadius: '12px', padding: '16px', marginTop: '24px', color: '#E05A5A', fontSize: '14px' }}>
      {error}
    </div>
  )
  return <>{children}</>
}

function TextResult({ text }: { text: string }) {
  if (!text) return null
  return (
    <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginTop: '24px', fontSize: '14px', color: 'var(--cream-dim)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
      {text}
    </div>
  )
}

// ============ INVESTOR SCORE DISPLAY ============
interface ScoreData {
  totalScore: number
  dimensions: { name: string; score: number; maxScore: number; explanation: string }[]
  interpretation: string
  biggestDrag: string
  biggestStrength: string
  recommendedFunding: string
  acquisitionNote?: string | null
  summary: string
}

function ScoreDisplay({ data }: { data: ScoreData }) {
  const scoreColor = data.totalScore >= 76 ? '#5A8F6E' : data.totalScore >= 61 ? '#3B7FD4' : data.totalScore >= 41 ? '#C9A84C' : '#E05A5A'

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Big score */}
      <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '72px', fontWeight: 900, color: '#C9A84C', lineHeight: 1 }}>{data.totalScore}</div>
        <div style={{ fontSize: '12px', color: 'var(--cream-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>Investor Readiness Score</div>
        <div style={{ fontSize: '14px', color: scoreColor, marginTop: '8px', fontWeight: 500 }}>{data.interpretation}</div>
      </div>

      {/* Dimension bars */}
      <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
        {data.dimensions.map((dim) => (
          <div key={dim.name} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cream)' }}>{dim.name}</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#C9A84C', fontFamily: 'var(--font-display)' }}>{dim.score}/{dim.maxScore}</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
              <div style={{ height: '100%', width: `${(dim.score / dim.maxScore) * 100}%`, background: '#C9A84C', borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--cream-muted)', lineHeight: 1.5 }}>{dim.explanation}</div>
          </div>
        ))}
      </div>

      {/* Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'rgba(224,90,90,0.06)', border: '1px solid rgba(224,90,90,0.15)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#E05A5A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Biggest Drag</div>
          <div style={{ fontSize: '13px', color: 'var(--cream-dim)', lineHeight: 1.6 }}>{data.biggestDrag}</div>
        </div>
        <div style={{ background: 'rgba(90,143,110,0.06)', border: '1px solid rgba(90,143,110,0.15)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#7AB08E', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Biggest Strength</div>
          <div style={{ fontSize: '13px', color: 'var(--cream-dim)', lineHeight: 1.6 }}>{data.biggestStrength}</div>
        </div>
      </div>

      <div style={{ background: 'rgba(59,127,212,0.06)', border: '1px solid rgba(59,127,212,0.15)', borderLeft: '3px solid var(--blue)', borderRadius: '0 12px 12px 0', padding: '16px 20px', marginBottom: '12px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--blue-light)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Recommended Funding Type</div>
        <div style={{ fontSize: '14px', color: 'var(--cream)', fontWeight: 500 }}>{data.recommendedFunding}</div>
      </div>

      {data.acquisitionNote && (
        <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '12px', fontSize: '13px', color: 'var(--cream-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--cream)', display: 'block', marginBottom: '4px' }}>Acquisition Note</strong>
          {data.acquisitionNote}
        </div>
      )}

      <div style={{ fontSize: '14px', color: 'var(--cream-dim)', lineHeight: 1.7, marginTop: '16px' }}>{data.summary}</div>
    </div>
  )
}

// ============ MAIN PAGE ============
export default function CapitalIntelligencePage() {
  // Tool 1 state
  const [g_businessName, g_setBusinessName] = useState('')
  const [g_industry, g_setIndustry] = useState('')
  const [g_cityState, g_setCityState] = useState('')
  const [g_areaType, g_setAreaType] = useState('Urban')
  const [g_years, g_setYears] = useState('')
  const [g_revenue, g_setRevenue] = useState('')
  const [g_demographics, g_setDemographics] = useState<string[]>([])
  const [g_energy, g_setEnergy] = useState(false)
  const [g_downtown, g_setDowntown] = useState(false)
  const [g_loading, g_setLoading] = useState(false)
  const [g_error, g_setError] = useState('')
  const [g_result, g_setResult] = useState('')

  // Tool 2 state
  const [i_businessName, i_setBusinessName] = useState('')
  const [i_industry, i_setIndustry] = useState('')
  const [i_years, i_setYears] = useState('')
  const [i_revenue, i_setRevenue] = useState('')
  const [i_recurring, i_setRecurring] = useState('')
  const [i_growth, i_setGrowth] = useState('')
  const [i_sops, i_setSOPs] = useState(false)
  const [i_franchise, i_setFranchise] = useState(false)
  const [i_ownerDep, i_setOwnerDep] = useState('')
  const [i_margin, i_setMargin] = useState('')
  const [i_debt, i_setDebt] = useState(false)
  const [i_reason, i_setReason] = useState('')
  const [i_loading, i_setLoading] = useState(false)
  const [i_error, i_setError] = useState('')
  const [i_score, i_setScore] = useState<ScoreData | null>(null)

  // Tool 3 state
  const [f_businessName, f_setBusinessName] = useState('')
  const [f_score, f_setScore] = useState('')
  const [f_goal, f_setGoal] = useState('')
  const [f_purpose, f_setPurpose] = useState('')
  const [f_state, f_setState] = useState('KY')
  const [f_equity, f_setEquity] = useState(false)
  const [f_timeline, f_setTimeline] = useState('')
  const [f_loading, f_setLoading] = useState(false)
  const [f_error, f_setError] = useState('')
  const [f_result, f_setResult] = useState('')

  function toggleDemo(val: string, arr: string[], setArr: (v: string[]) => void) {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  async function handleGrantMatch(e: FormEvent) {
    e.preventDefault()
    g_setLoading(true); g_setError(''); g_setResult('')
    try {
      const res = await fetch('/api/internal/capital/grant-match', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: g_businessName, industry: g_industry, cityState: g_cityState,
          areaType: g_areaType, yearsInBusiness: g_years, revenueRange: g_revenue,
          demographics: g_demographics, energyEfficiency: g_energy, downtownCorridor: g_downtown,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      g_setResult(data.result)
    } catch { g_setError('Something went wrong. Please try again.') }
    finally { g_setLoading(false) }
  }

  async function handleInvestorScore(e: FormEvent) {
    e.preventDefault()
    i_setLoading(true); i_setError(''); i_setScore(null)
    try {
      const res = await fetch('/api/internal/capital/investor-score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: i_businessName, industry: i_industry, yearsInBusiness: i_years,
          annualRevenue: i_revenue, recurringClients: i_recurring, revenueGrowth: i_growth,
          hasSOPs: i_sops, franchisePotential: i_franchise, ownerDependency: i_ownerDep,
          profitMargin: i_margin, hasDebt: i_debt, fundingReason: i_reason,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      if (data.result && typeof data.result === 'object' && data.result.totalScore) {
        i_setScore(data.result)
      } else {
        i_setError('Unexpected response format. Please try again.')
      }
    } catch { i_setError('Something went wrong. Please try again.') }
    finally { i_setLoading(false) }
  }

  async function handleFundingSources(e: FormEvent) {
    e.preventDefault()
    f_setLoading(true); f_setError(''); f_setResult('')
    try {
      const res = await fetch('/api/internal/capital/funding-sources', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: f_businessName, investorScore: f_score, fundingGoal: f_goal,
          purpose: f_purpose, state: f_state, openToEquity: f_equity, timeline: f_timeline,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      f_setResult(data.result)
    } catch { f_setError('Something went wrong. Please try again.') }
    finally { f_setLoading(false) }
  }

  return (
    <>
      <nav>
        <a href="/" className="nav-brand">
          <div className="nav-logo-mark">&#x1F9AB;</div>
          BaraTrust
        </a>
        <a href="/" className="nav-back">&#8592; Back to BaraTrust.com</a>
      </nav>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto', padding: '110px 24px 80px' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--blue)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Internal Tool</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, lineHeight: 1.1, marginBottom: '12px' }}>
            BaraTrust Capital<br /><em style={{ color: 'var(--blue-light)' }}>Intelligence</em>
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--cream-muted)', lineHeight: 1.7 }}>Find funding opportunities for your clients. Powered by Claude.</p>
        </div>

        {/* ============ TOOL 1: GRANT MATCH ============ */}
        <ToolSection title="Grant and Funding Match" description="Find legitimate grant and funding programs this client actually qualifies for.">
          <form onSubmit={handleGrantMatch}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Business Name">
                <input style={inputStyle} value={g_businessName} onChange={e => g_setBusinessName(e.target.value)} required placeholder="Smith's HVAC" />
              </Field>
              <Field label="Trade / Industry">
                <select style={selectStyle} value={g_industry} onChange={e => g_setIndustry(e.target.value)} required>
                  <option value="" disabled>Select industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="City and State">
                <input style={inputStyle} value={g_cityState} onChange={e => g_setCityState(e.target.value)} required placeholder="New Albany, IN" />
              </Field>
              <Field label="Rural or Urban">
                <Toggle value={g_areaType} onChange={g_setAreaType} options={['Rural', 'Suburban', 'Urban']} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Years in Business">
                <input style={inputStyle} type="number" min={0} value={g_years} onChange={e => g_setYears(e.target.value)} required placeholder="5" />
              </Field>
              <Field label="Annual Revenue Range">
                <select style={selectStyle} value={g_revenue} onChange={e => g_setRevenue(e.target.value)} required>
                  <option value="" disabled>Select range</option>
                  {REVENUE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Owner Demographics (select all that apply)">
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['Veteran', 'Woman-owned', 'Minority-owned'].map(d => (
                  <label key={d} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--cream-dim)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={g_demographics.includes(d)} onChange={() => toggleDemo(d, g_demographics, g_setDemographics)}
                      style={{ accentColor: 'var(--blue)' }} />
                    {d}
                  </label>
                ))}
              </div>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Energy efficiency projects planned?">
                <Toggle value={g_energy ? 'Yes' : 'No'} onChange={v => g_setEnergy(v === 'Yes')} options={['Yes', 'No']} />
              </Field>
              <Field label="In downtown corridor / historic district?">
                <Toggle value={g_downtown ? 'Yes' : 'No'} onChange={v => g_setDowntown(v === 'Yes')} options={['Yes', 'No']} />
              </Field>
            </div>
            <button type="submit" disabled={g_loading} style={{ ...btnStyle, opacity: g_loading ? 0.6 : 1 }}>
              {g_loading ? 'Searching...' : 'Find Funding Opportunities'}
            </button>
          </form>
          <ResultBox loading={g_loading} error={g_error}>
            <TextResult text={g_result} />
          </ResultBox>
        </ToolSection>

        {/* ============ TOOL 2: INVESTOR SCORE ============ */}
        <ToolSection title="Investor Readiness Score" description="Assess how fundable this business is for expansion capital, angel investment, or acquisition conversations.">
          <form onSubmit={handleInvestorScore}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Business Name">
                <input style={inputStyle} value={i_businessName} onChange={e => i_setBusinessName(e.target.value)} required placeholder="Smith's HVAC" />
              </Field>
              <Field label="Trade / Industry">
                <select style={selectStyle} value={i_industry} onChange={e => i_setIndustry(e.target.value)} required>
                  <option value="" disabled>Select industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <Field label="Years in Business">
                <input style={inputStyle} type="number" min={0} value={i_years} onChange={e => i_setYears(e.target.value)} required placeholder="5" />
              </Field>
              <Field label="Annual Revenue">
                <input style={inputStyle} value={i_revenue} onChange={e => i_setRevenue(e.target.value)} required placeholder="$350,000" />
              </Field>
              <Field label="Monthly Recurring Clients">
                <input style={inputStyle} type="number" min={0} value={i_recurring} onChange={e => i_setRecurring(e.target.value)} required placeholder="25" />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Revenue Growth Last 12 Months">
                <select style={selectStyle} value={i_growth} onChange={e => i_setGrowth(e.target.value)} required>
                  <option value="" disabled>Select growth</option>
                  {GROWTH_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Owner Dependency">
                <select style={selectStyle} value={i_ownerDep} onChange={e => i_setOwnerDep(e.target.value)} required>
                  <option value="" disabled>Select level</option>
                  {OWNER_DEP.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Monthly Profit Margin Estimate">
                <select style={selectStyle} value={i_margin} onChange={e => i_setMargin(e.target.value)} required>
                  <option value="" disabled>Select margin</option>
                  {MARGINS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Reason for Seeking Funding">
                <select style={selectStyle} value={i_reason} onChange={e => i_setReason(e.target.value)} required>
                  <option value="" disabled>Select reason</option>
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <Field label="Has documented SOPs?">
                <Toggle value={i_sops ? 'Yes' : 'No'} onChange={v => i_setSOPs(v === 'Yes')} options={['Yes', 'No']} />
              </Field>
              <Field label="Franchise / multi-location potential?">
                <Toggle value={i_franchise ? 'Yes' : 'No'} onChange={v => i_setFranchise(v === 'Yes')} options={['Yes', 'No']} />
              </Field>
              <Field label="Has existing business debt?">
                <Toggle value={i_debt ? 'Yes' : 'No'} onChange={v => i_setDebt(v === 'Yes')} options={['Yes', 'No']} />
              </Field>
            </div>
            <button type="submit" disabled={i_loading} style={{ ...btnStyle, opacity: i_loading ? 0.6 : 1 }}>
              {i_loading ? 'Analyzing...' : 'Generate Investor Readiness Score'}
            </button>
          </form>
          <ResultBox loading={i_loading} error={i_error}>
            {i_score && <ScoreDisplay data={i_score} />}
          </ResultBox>
        </ToolSection>

        {/* ============ TOOL 3: FUNDING SOURCES ============ */}
        <ToolSection title="Funding Source Finder" description="Find the right type of capital for where this business is and what it wants to do.">
          <form onSubmit={handleFundingSources}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Business Name">
                <input style={inputStyle} value={f_businessName} onChange={e => f_setBusinessName(e.target.value)} required placeholder="Smith's HVAC" />
              </Field>
              <Field label="Investor Readiness Score (from Tool 2)">
                <input style={inputStyle} type="number" min={0} max={100} value={f_score} onChange={e => f_setScore(e.target.value)} required placeholder="65" />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Funding Goal Amount">
                <input style={inputStyle} value={f_goal} onChange={e => f_setGoal(e.target.value)} required placeholder="$150,000" />
              </Field>
              <Field label="Purpose">
                <select style={selectStyle} value={f_purpose} onChange={e => f_setPurpose(e.target.value)} required>
                  <option value="" disabled>Select purpose</option>
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <Field label="State">
                <Toggle value={f_state} onChange={f_setState} options={['KY', 'IN']} />
              </Field>
              <Field label="Open to giving up equity?">
                <Toggle value={f_equity ? 'Yes' : 'No'} onChange={v => f_setEquity(v === 'Yes')} options={['Yes', 'No']} />
              </Field>
              <Field label="Timeline to Funding">
                <select style={selectStyle} value={f_timeline} onChange={e => f_setTimeline(e.target.value)} required>
                  <option value="" disabled>Select timeline</option>
                  {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <button type="submit" disabled={f_loading} style={{ ...btnStyle, opacity: f_loading ? 0.6 : 1 }}>
              {f_loading ? 'Searching...' : 'Find Funding Sources'}
            </button>
          </form>
          <ResultBox loading={f_loading} error={f_error}>
            <TextResult text={f_result} />
          </ResultBox>
        </ToolSection>

        {/* DISCLAIMER */}
        <div style={{ fontSize: '11px', color: 'var(--cream-muted)', lineHeight: 1.7, textAlign: 'center', padding: '20px 0', borderTop: '1px solid var(--border)', opacity: 0.7 }}>
          Capital Intelligence is an internal BaraTrust tool. All funding recommendations should be verified with the relevant program or institution before presenting to clients. Grant awards are never guaranteed. This tool does not constitute financial or legal advice.
        </div>
      </div>
    </>
  )
}
