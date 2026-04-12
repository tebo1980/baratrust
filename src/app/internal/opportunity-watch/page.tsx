'use client'

import { useState, useEffect, useCallback } from 'react'

// ============ DATA ============

const tradeData: Record<string, string[]> = {
  'HVAC': ['need AC repair', 'air conditioner not working', 'HVAC help', 'furnace repair', 'heat pump install', 'AC unit replacement', 'heating not working', 'need someone to fix AC'],
  'Electrical': ['need electrician', 'electrical problem', 'breaker keeps tripping', 'outlet not working', 'need electrical work', 'panel upgrade', 'EV charger install', 'generator install'],
  'Plumbing': ['need plumber', 'pipe burst', 'water heater replacement', 'clogged drain', 'leaking pipe', 'sump pump', "toilet won't flush", 'need plumbing work'],
  'Roofing': ['roof leak', 'need roofer', 'missing shingles', 'roof damage', 'roof replacement', 'storm damage roof', 'need roof repair', 'gutters falling off'],
  'Landscaping': ['need lawn care', 'lawn mowing', 'need landscaper', 'yard cleanup', 'tree removal', 'mulching', 'need someone to mow', 'overgrown yard'],
  'Cleaning': ['need house cleaner', 'looking for cleaning service', 'need someone to clean', 'move out cleaning', 'deep clean needed', 'recurring cleaning'],
  'General Contractor': ['need contractor', 'home renovation', 'basement finishing', 'deck build', 'addition', 'remodel help', 'need someone to build', 'handyman work'],
  'Painting': ['need painter', 'interior painting', 'exterior painting', 'house painting', 'need someone to paint'],
  'Concrete': ['need concrete work', 'driveway repair', 'sidewalk replacement', 'patio pour', 'concrete crack'],
  'Gutters': ['gutter cleaning', 'gutter repair', 'gutter replacement', 'gutters overflowing'],
  'Pest Control': ['need exterminator', 'bug problem', 'pest control', 'mouse problem', 'termites'],
  'Handyman': ['need handyman', 'small repairs', 'honey do list', 'fix around house', 'need someone handy'],
}

const platforms = [
  { name: 'Craigslist Louisville', description: 'Check Services Wanted and Gigs sections for homeowners posting service requests.', url: 'https://louisville.craigslist.org/search/lbg', icon: '\uD83D\uDCCB' },
  { name: 'Craigslist Indianapolis', description: 'Check gigs and services sections for Indiana leads.', url: 'https://indianapolis.craigslist.org/search/lbg', icon: '\uD83D\uDCCB' },
  { name: 'Craigslist Cincinnati', description: 'Check gigs and services sections for Cincinnati area leads.', url: 'https://cincinnati.craigslist.org/search/lbg', icon: '\uD83D\uDCCB' },
  { name: 'Craigslist Nashville', description: 'Check gigs and services sections for Nashville area leads.', url: 'https://nashville.craigslist.org/search/lbg', icon: '\uD83D\uDCCB' },
  { name: 'Craigslist Lexington', description: 'Check gigs and services sections for Lexington area leads.', url: 'https://lexington.craigslist.org/search/lbg', icon: '\uD83D\uDCCB' },
  { name: 'Facebook Marketplace', description: "Search for service requests and 'looking for' posts in Louisville and surrounding area groups.", url: 'https://www.facebook.com/marketplace', icon: '\uD83D\uDC65' },
  { name: 'Nextdoor', description: 'Homeowners frequently post service requests on Nextdoor. Check your local area feeds.', url: 'https://nextdoor.com', icon: '\uD83C\uDFD8\uFE0F' },
  { name: 'OfferUp', description: 'Check OfferUp services section for local service requests.', url: 'https://offerup.com', icon: '\uD83D\uDED2' },
  { name: 'Reddit Louisville', description: 'Check for service requests and recommendations in the Louisville subreddit.', url: 'https://reddit.com/r/Louisville', icon: '\uD83D\uDD34' },
  { name: 'Reddit Indianapolis', description: 'Check for service requests in the Indianapolis subreddit.', url: 'https://reddit.com/r/indianapolis', icon: '\uD83D\uDD34' },
  { name: 'Angi Leads', description: 'Check Angi for lead opportunities in your clients trade categories.', url: 'https://angi.com', icon: '\uD83D\uDD27' },
]

const fbGroups = ['Louisville Kentucky Community', 'New Albany Indiana Community', 'Jeffersonville Indiana Neighbors', 'Southern Indiana Buy Sell Trade', 'Louisville Home Improvement']

const outreachTemplates: Record<string, string> = {
  'HVAC': 'Hey [Client Name] — found a lead on [Platform]. Homeowner in [Location] posted looking for HVAC help — [brief description]. Thought you\'d want to reach out. Here\'s what they said: [post details]. Let me know if you want the contact info.',
  'Electrical': 'Hey [Client Name] — potential electrical lead in [Location] posted on [Platform]. [Brief description]. Worth a reach out. Details: [post details].',
  'Plumbing': 'Hey [Client Name] — plumbing lead in [Location] on [Platform]. [Description]. Could be a good job for you. Details: [post details].',
  'Roofing': 'Hey [Client Name] — roofing lead in [Location] on [Platform]. [Description]. Could be a good job for you. Details: [post details].',
  'Landscaping': 'Hey [Client Name] — landscaping lead in [Location] on [Platform]. [Description]. Might be worth a quick message. Details: [post details].',
  'Cleaning': 'Hey [Client Name] — cleaning lead in [Location] on [Platform]. [Description]. Let me know if you want to follow up. Details: [post details].',
  'General Contractor': 'Hey [Client Name] — contractor lead in [Location] on [Platform]. [Description]. Looks like a solid opportunity. Details: [post details].',
  'Painting': 'Hey [Client Name] — painting lead in [Location] on [Platform]. [Description]. Worth a reach out. Details: [post details].',
  'Concrete': 'Hey [Client Name] — concrete work lead in [Location] on [Platform]. [Description]. Let me know if interested. Details: [post details].',
  'Gutters': 'Hey [Client Name] — gutter lead in [Location] on [Platform]. [Description]. Quick job potentially. Details: [post details].',
  'Pest Control': 'Hey [Client Name] — pest control lead in [Location] on [Platform]. [Description]. Let me know if you want the details.',
  'Handyman': 'Hey [Client Name] — handyman lead in [Location] on [Platform]. [Description]. Might be a good fit. Details: [post details].',
}

const urgencyOptions = [
  'Mentioned urgency (ASAP/today/emergency)',
  'Mentioned budget or price',
  'Already contacted others',
  'Repeat customer opportunity',
  'Commercial property',
]

const actionOptions = ['Alerted client by text', 'Alerted client by email', 'Logged for later', 'Not a fit — disqualified']

// ============ TYPES ============

type Lead = {
  id: string
  dateLogged: string
  platform: string
  postUrl: string
  trade: string
  description: string
  location: string
  urgencySignals: string[]
  clientToAlert: string
  contactAvailable: boolean
  contactInfo: string
  outreachMessage: string
  actionTaken: string
  disqualifyReason: string
  followUpDate: string
  notes: string
}

type LeadForm = Omit<Lead, 'id' | 'dateLogged'>

type ScheduleDay = { morning: boolean; evening: boolean; leadsLogged: boolean; clientsAlerted: boolean }
type ScheduleData = { weekStart: string; days: Record<string, ScheduleDay> }

const defaultForm: LeadForm = {
  platform: '', postUrl: '', trade: '', description: '', location: '',
  urgencySignals: [], clientToAlert: '', contactAvailable: false, contactInfo: '',
  outreachMessage: '', actionTaken: '', disqualifyReason: '', followUpDate: '', notes: '',
}

// ============ HELPERS ============

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getDayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getWeekDays(monday: Date): { date: Date; key: string; label: string }[] {
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push({ date: d, key: formatDate(d), label: getDayLabel(d) })
  }
  return days
}

function defaultSchedule(): ScheduleData {
  const monday = getMonday(new Date())
  const days: Record<string, ScheduleDay> = {}
  getWeekDays(monday).forEach(d => {
    days[d.key] = { morning: false, evening: false, leadsLogged: false, clientsAlerted: false }
  })
  return { weekStart: formatDate(monday), days }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7)
}

// ============ STYLES ============

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
const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: 'var(--blue)', letterSpacing: '0.12em',
  textTransform: 'uppercase', marginBottom: '20px',
}
const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px',
}

// ============ MAIN COMPONENT ============

export default function OpportunityWatch() {
  // Section 1
  const [selectedTrades, setSelectedTrades] = useState<string[]>([])

  // Section 3
  const [leads, setLeads] = useState<Lead[]>([])
  const [formData, setFormData] = useState<LeadForm>({ ...defaultForm })
  const [toast, setToast] = useState('')

  // Section 4
  const [filters, setFilters] = useState({ trade: '', platform: '', action: '', search: '', dateFrom: '', dateTo: '' })
  const [expandedLead, setExpandedLead] = useState<string | null>(null)
  const [sortField, setSortField] = useState<keyof Lead>('dateLogged')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Section 5
  const [schedule, setSchedule] = useState<ScheduleData>(defaultSchedule())

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('baratrust-opportunity-leads')
      if (stored) setLeads(JSON.parse(stored))
    } catch { /* ignore */ }

    try {
      const stored = localStorage.getItem('baratrust-monitoring-schedule')
      if (stored) {
        const parsed: ScheduleData = JSON.parse(stored)
        const currentMonday = formatDate(getMonday(new Date()))
        if (parsed.weekStart !== currentMonday) {
          const fresh = defaultSchedule()
          localStorage.setItem('baratrust-monitoring-schedule', JSON.stringify(fresh))
          setSchedule(fresh)
        } else {
          setSchedule(parsed)
        }
      }
    } catch { /* ignore */ }
  }, [])

  // Persist leads
  const saveLeads = useCallback((newLeads: Lead[]) => {
    setLeads(newLeads)
    localStorage.setItem('baratrust-opportunity-leads', JSON.stringify(newLeads))
  }, [])

  // Persist schedule
  const saveSchedule = useCallback((newSchedule: ScheduleData) => {
    setSchedule(newSchedule)
    localStorage.setItem('baratrust-monitoring-schedule', JSON.stringify(newSchedule))
  }, [])

  // Trade toggle
  function toggleTrade(trade: string) {
    setSelectedTrades(prev => prev.includes(trade) ? prev.filter(t => t !== trade) : [...prev, trade])
  }

  // Combined keywords
  const combinedKeywords = selectedTrades.flatMap(t => tradeData[t] || [])

  // Search URL builder
  function getSearchUrl(baseUrl: string): string {
    if (combinedKeywords.length > 0) {
      const q = encodeURIComponent(combinedKeywords[0])
      if (baseUrl.includes('craigslist.org')) return `${baseUrl}?query=${q}`
      if (baseUrl.includes('reddit.com')) return `${baseUrl}/search/?q=${q}`
    }
    return baseUrl
  }

  // Form update
  function updateForm(field: keyof LeadForm, value: LeadForm[keyof LeadForm]) {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'trade' && typeof value === 'string' && outreachTemplates[value]) {
        updated.outreachMessage = outreachTemplates[value]
      }
      return updated
    })
  }

  // Submit lead
  function handleSubmitLead(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.platform || !formData.trade || !formData.description) return

    const newLead: Lead = {
      ...formData,
      id: generateId(),
      dateLogged: new Date().toISOString(),
    }
    saveLeads([newLead, ...leads])
    setFormData({ ...defaultForm })
    setToast('Lead logged successfully')
    setTimeout(() => setToast(''), 3000)
  }

  // Filtered and sorted leads
  const filteredLeads = leads.filter(l => {
    if (filters.trade && l.trade !== filters.trade) return false
    if (filters.platform && l.platform !== filters.platform) return false
    if (filters.action && l.actionTaken !== filters.action) return false
    if (filters.dateFrom && l.dateLogged < filters.dateFrom) return false
    if (filters.dateTo && l.dateLogged > filters.dateTo + 'T23:59:59') return false
    if (filters.search && !l.description.toLowerCase().includes(filters.search.toLowerCase()) && !l.location.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    const aVal = a[sortField] || ''
    const bVal = b[sortField] || ''
    return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
  })

  // Stats
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thisMonthLeads = leads.filter(l => l.dateLogged >= monthStart)
  const alertedCount = thisMonthLeads.filter(l => l.actionTaken.includes('Alerted')).length
  const pendingCount = thisMonthLeads.filter(l => l.actionTaken === 'Logged for later').length
  const disqualifiedCount = thisMonthLeads.filter(l => l.actionTaken.includes('disqualified')).length

  // CSV export
  function exportCSV() {
    const headers = ['Date', 'Platform', 'Trade', 'Location', 'Description', 'Client', 'Action', 'Follow Up', 'Urgency Signals', 'Notes']
    const rows = filteredLeads.map(l => [
      new Date(l.dateLogged).toLocaleDateString(), l.platform, l.trade, l.location,
      `"${l.description.replace(/"/g, '""')}"`, l.clientToAlert, l.actionTaken,
      l.followUpDate, l.urgencySignals.join('; '), `"${l.notes.replace(/"/g, '""')}"`,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `opportunity-watch-${formatDate(new Date())}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Sort handler
  function handleSort(field: keyof Lead) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  // Schedule helpers
  const weekDays = getWeekDays(getMonday(new Date()))
  const sessionsCompleted = Object.values(schedule.days).filter(d => d.morning || d.evening).length
  const leadsLoggedCount = Object.values(schedule.days).filter(d => d.leadsLogged).length
  const clientsAlertedCount = Object.values(schedule.days).filter(d => d.clientsAlerted).length

  function toggleSchedule(dayKey: string, field: keyof ScheduleDay) {
    const updated = { ...schedule, days: { ...schedule.days, [dayKey]: { ...schedule.days[dayKey], [field]: !schedule.days[dayKey]?.[field] } } }
    saveSchedule(updated)
  }

  return (
    <>
      <nav>
        <a href="/" className="nav-brand">
          <div className="nav-logo-mark">{'\uD83E\uDDAB'}</div>
          BaraTrust
        </a>
        <a href="/" className="nav-back">{'\u2190'} Back to BaraTrust.com</a>
      </nav>

      <main style={{ background: 'var(--bg-deep)', minHeight: '100vh', padding: '100px 0 60px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>

          {/* PHASE 2 BANNER */}
          <div style={{
            background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)',
            borderRadius: '10px', padding: '12px 20px', marginBottom: '32px',
            display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--gold)',
          }}>
            <span>{'\u26A1'}</span>
            <span><strong>OpportunityWatch Phase 2</strong> — When BaraTrust reaches 5 clients, Go High Level will automate lead alerts directly to contractor clients via SMS and email. For now Todd monitors manually and alerts clients directly.</span>
          </div>

          {/* HEADER */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 900, color: 'var(--cream)' }}>OpportunityWatch</div>
              <span style={{
                background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)',
                borderRadius: '100px', padding: '3px 10px', fontSize: '10px', fontWeight: 600,
                color: 'var(--gold)', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>Internal Tool</span>
            </div>
            <p style={{ fontSize: '15px', color: 'var(--cream-dim)' }}>
              Find homeowners and businesses actively looking for contractor services right now.
            </p>
          </div>

          {/* ============ SECTION 1 — TRADE SELECTOR ============ */}
          <div style={{ marginBottom: '48px' }}>
            <div style={sectionHeadingStyle}>Select Trades to Monitor</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
              {Object.keys(tradeData).map(trade => {
                const selected = selectedTrades.includes(trade)
                return (
                  <button key={trade} onClick={() => toggleTrade(trade)} style={{
                    ...cardStyle, cursor: 'pointer', textAlign: 'center', fontSize: '13px', fontWeight: 600,
                    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                    background: selected ? 'var(--blue)' : 'var(--bg-card)',
                    borderColor: selected ? 'var(--border-accent)' : 'var(--border)',
                    color: selected ? 'var(--cream)' : 'var(--cream-dim)',
                    padding: '14px 16px',
                  }}>
                    {trade}
                  </button>
                )
              })}
            </div>

            {combinedKeywords.length > 0 && (
              <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {combinedKeywords.map((kw, i) => (
                  <span key={i} style={{
                    background: 'var(--blue-glow)', color: 'var(--blue-light)', fontSize: '11px',
                    padding: '4px 10px', borderRadius: '100px', fontWeight: 500,
                  }}>{kw}</span>
                ))}
              </div>
            )}
          </div>

          {/* ============ SECTION 2 — PLATFORMS ============ */}
          <div style={{ marginBottom: '48px' }}>
            <div style={sectionHeadingStyle}>Monitor These Platforms</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {platforms.map(p => {
                const isFB = p.name === 'Facebook Marketplace'
                return (
                  <div key={p.name} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{p.icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--cream)' }}>{p.name}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--cream-muted)', lineHeight: 1.6, flex: 1 }}>{p.description}</p>
                    {isFB ? (
                      <div style={{ fontSize: '11px', color: 'var(--cream-muted)', lineHeight: 1.7 }}>
                        <div style={{ fontWeight: 600, color: 'var(--cream-dim)', marginBottom: '4px' }}>Search these groups manually:</div>
                        {fbGroups.map(g => <div key={g} style={{ paddingLeft: '8px' }}>{'\u2192'} {g}</div>)}
                      </div>
                    ) : (
                      <a href={getSearchUrl(p.url)} target="_blank" rel="noopener noreferrer" className="btn-secondary"
                        style={{ display: 'block', textAlign: 'center', padding: '9px', fontSize: '12px' }}>
                        Monitor Now {'\u2192'}
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ============ SECTION 3 — LEAD LOGGER ============ */}
          <div style={{ marginBottom: '48px' }}>
            <div style={sectionHeadingStyle}>Log a Lead Opportunity</div>
            <div style={{ ...cardStyle, borderRadius: '20px', padding: '32px' }}>
              <form onSubmit={handleSubmitLead}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Platform Found On</label>
                    <select style={selectStyle} value={formData.platform} onChange={e => updateForm('platform', e.target.value)} required>
                      <option value="" disabled>Select platform</option>
                      {platforms.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>URL of Post (optional)</label>
                    <input style={inputStyle} value={formData.postUrl} onChange={e => updateForm('postUrl', e.target.value)} placeholder="https://..." />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  <div>
                    <label style={labelStyle}>Trade Category</label>
                    <select style={selectStyle} value={formData.trade} onChange={e => updateForm('trade', e.target.value)} required>
                      <option value="" disabled>Select trade</option>
                      {Object.keys(tradeData).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Location</label>
                    <input style={inputStyle} value={formData.location} onChange={e => updateForm('location', e.target.value)} placeholder="Louisville, KY" />
                  </div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <label style={labelStyle}>Lead Description</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={4} value={formData.description}
                    onChange={e => updateForm('description', e.target.value)} required
                    placeholder="What did the homeowner post? Include key details..." />
                </div>
                <div style={{ marginTop: '16px' }}>
                  <label style={labelStyle}>Urgency Signals</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {urgencyOptions.map(opt => (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--cream-dim)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData.urgencySignals.includes(opt)}
                          onChange={() => {
                            const signals = formData.urgencySignals.includes(opt)
                              ? formData.urgencySignals.filter(s => s !== opt)
                              : [...formData.urgencySignals, opt]
                            updateForm('urgencySignals', signals)
                          }}
                          style={{ accentColor: 'var(--blue)' }} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  <div>
                    <label style={labelStyle}>Which BaraTrust Client to Alert</label>
                    <input style={inputStyle} value={formData.clientToAlert} onChange={e => updateForm('clientToAlert', e.target.value)} placeholder="Client name" />
                  </div>
                  <div>
                    <label style={labelStyle}>Contact Info Available?</label>
                    <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
                      {['Yes', 'No'].map(opt => (
                        <button key={opt} type="button"
                          onClick={() => updateForm('contactAvailable', opt === 'Yes')}
                          style={{
                            flex: 1, padding: '8px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer',
                            fontFamily: 'var(--font-body)',
                            background: (formData.contactAvailable ? 'Yes' : 'No') === opt ? 'var(--blue)' : 'transparent',
                            color: (formData.contactAvailable ? 'Yes' : 'No') === opt ? 'var(--cream)' : 'var(--cream-muted)',
                          }}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {formData.contactAvailable && (
                  <div style={{ marginTop: '16px' }}>
                    <label style={labelStyle}>Contact Info</label>
                    <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={formData.contactInfo}
                      onChange={e => updateForm('contactInfo', e.target.value)} placeholder="Phone, email, or username..." />
                  </div>
                )}
                <div style={{ marginTop: '16px' }}>
                  <label style={labelStyle}>Suggested Outreach Message</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={4} value={formData.outreachMessage}
                    onChange={e => updateForm('outreachMessage', e.target.value)}
                    placeholder="Select a trade to auto-fill a template..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  <div>
                    <label style={labelStyle}>Action Taken</label>
                    <select style={selectStyle} value={formData.actionTaken} onChange={e => updateForm('actionTaken', e.target.value)}>
                      <option value="" disabled>Select action</option>
                      {actionOptions.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Follow Up Date</label>
                    <input style={inputStyle} type="date" value={formData.followUpDate} onChange={e => updateForm('followUpDate', e.target.value)} />
                  </div>
                </div>
                {formData.actionTaken.includes('disqualified') && (
                  <div style={{ marginTop: '16px' }}>
                    <label style={labelStyle}>Disqualify Reason</label>
                    <input style={inputStyle} value={formData.disqualifyReason} onChange={e => updateForm('disqualifyReason', e.target.value)} placeholder="Why is this not a fit?" />
                  </div>
                )}
                <div style={{ marginTop: '16px' }}>
                  <label style={labelStyle}>Notes</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={formData.notes}
                    onChange={e => updateForm('notes', e.target.value)} placeholder="Any additional context..." />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '24px', padding: '14px', fontSize: '14px', display: 'block', textAlign: 'center' }}>
                  Log This Lead
                </button>
              </form>
            </div>
          </div>

          {/* TOAST */}
          {toast && (
            <div style={{
              position: 'fixed', bottom: '24px', right: '24px', background: 'var(--sage)',
              color: 'var(--cream)', padding: '12px 20px', borderRadius: '10px', fontSize: '14px',
              fontWeight: 600, zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {'\u2713'} {toast}
            </div>
          )}

          {/* ============ SECTION 4 — DASHBOARD ============ */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={sectionHeadingStyle}>Recent Opportunities</div>
              {leads.length > 0 && (
                <button onClick={exportCSV} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                  Export CSV {'\u2193'}
                </button>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Leads This Month', value: thisMonthLeads.length, color: 'var(--blue-light)' },
                { label: 'Clients Alerted', value: alertedCount, color: 'var(--sage-light)' },
                { label: 'Pending Follow Up', value: pendingCount, color: 'var(--gold)' },
                { label: 'Disqualified', value: disqualifiedCount, color: 'var(--cream-muted)' },
              ].map(s => (
                <div key={s.label} style={{ ...cardStyle, textAlign: 'center', padding: '16px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: 'var(--cream-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ ...cardStyle, display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px', padding: '16px' }}>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ ...labelStyle, fontSize: '9px' }}>Trade</label>
                <select style={{ ...selectStyle, padding: '8px 10px', fontSize: '12px' }} value={filters.trade} onChange={e => setFilters(f => ({ ...f, trade: e.target.value }))}>
                  <option value="">All</option>
                  {Object.keys(tradeData).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label style={{ ...labelStyle, fontSize: '9px' }}>Platform</label>
                <select style={{ ...selectStyle, padding: '8px 10px', fontSize: '12px' }} value={filters.platform} onChange={e => setFilters(f => ({ ...f, platform: e.target.value }))}>
                  <option value="">All</option>
                  {platforms.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label style={{ ...labelStyle, fontSize: '9px' }}>Action</label>
                <select style={{ ...selectStyle, padding: '8px 10px', fontSize: '12px' }} value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}>
                  <option value="">All</option>
                  {actionOptions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 110px' }}>
                <label style={{ ...labelStyle, fontSize: '9px' }}>From</label>
                <input type="date" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
              </div>
              <div style={{ flex: '1 1 110px' }}>
                <label style={{ ...labelStyle, fontSize: '9px' }}>To</label>
                <input type="date" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label style={{ ...labelStyle, fontSize: '9px' }}>Search</label>
                <input style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search..." />
              </div>
              <button type="button" onClick={() => setFilters({ trade: '', platform: '', action: '', search: '', dateFrom: '', dateTo: '' })}
                style={{ padding: '8px 12px', fontSize: '11px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--cream-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Clear
              </button>
            </div>

            {/* Table */}
            {filteredLeads.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px', color: 'var(--cream-muted)', fontSize: '14px' }}>
                {leads.length === 0 ? 'No leads logged yet. Start monitoring platforms above and log your first opportunity.' : 'No leads match the current filters.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      {[
                        { key: 'dateLogged', label: 'Date' },
                        { key: 'platform', label: 'Platform' },
                        { key: 'trade', label: 'Trade' },
                        { key: 'location', label: 'Location' },
                        { key: 'clientToAlert', label: 'Client' },
                        { key: 'actionTaken', label: 'Action' },
                        { key: 'followUpDate', label: 'Follow Up' },
                      ].map(col => (
                        <th key={col.key} onClick={() => handleSort(col.key as keyof Lead)}
                          style={{ padding: '10px 12px', textAlign: 'left', background: 'var(--bg-card)', color: 'var(--cream-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '10px', borderBottom: '1px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {col.label} {sortField === col.key ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
                        </th>
                      ))}
                      <th style={{ padding: '10px 12px', textAlign: 'left', background: 'var(--bg-card)', color: 'var(--cream-muted)', fontWeight: 600, fontSize: '10px', borderBottom: '1px solid var(--border)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{'\u26A1'}</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', background: 'var(--bg-card)', color: 'var(--cream-muted)', fontWeight: 600, fontSize: '10px', borderBottom: '1px solid var(--border)', letterSpacing: '0.06em', textTransform: 'uppercase' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map(lead => {
                      const isPastDue = lead.followUpDate && new Date(lead.followUpDate) < new Date() && lead.actionTaken === 'Logged for later'
                      const actionColor = lead.actionTaken.includes('Alerted') ? 'var(--blue)' : lead.actionTaken === 'Logged for later' ? 'var(--sage)' : lead.actionTaken.includes('disqualified') ? 'var(--red-soft, #E05A5A)' : 'var(--cream-muted)'
                      return (
                        <tr key={lead.id}>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--cream-dim)' }}>{new Date(lead.dateLogged).toLocaleDateString()}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--cream-dim)' }}>{lead.platform}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--cream)' }}>{lead.trade}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--cream-dim)' }}>{lead.location}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--cream-dim)' }}>{lead.clientToAlert}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ background: actionColor, color: 'var(--cream)', fontSize: '10px', padding: '3px 8px', borderRadius: '100px', fontWeight: 600, whiteSpace: 'nowrap', opacity: 0.9 }}>
                              {lead.actionTaken.includes('text') ? 'Texted' : lead.actionTaken.includes('email') ? 'Emailed' : lead.actionTaken === 'Logged for later' ? 'Pending' : 'DQ'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: isPastDue ? '#E05A5A' : 'var(--cream-dim)', fontWeight: isPastDue ? 600 : 400 }}>
                            {lead.followUpDate || '—'}
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                            {lead.urgencySignals.length > 0 && <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{'\u26A1'}</span>}
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                            <button onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                              style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: 'var(--blue-light)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                              {expandedLead === lead.id ? 'Hide' : 'View'}
                            </button>
                          </td>
                          {expandedLead === lead.id && (
                            <td colSpan={9} style={{ padding: '0' }}>
                              <ExpandedLead lead={lead} />
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ============ SECTION 5 — SCHEDULE ============ */}
          <div style={{ marginBottom: '48px' }}>
            <div style={sectionHeadingStyle}>Stay Consistent</div>
            <div style={{ ...cardStyle, borderRadius: '20px', padding: '28px', overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', minWidth: '600px' }}>
                {weekDays.map(day => {
                  const dayData = schedule.days[day.key] || { morning: false, evening: false, leadsLogged: false, clientsAlerted: false }
                  const isToday = day.key === formatDate(new Date())
                  return (
                    <div key={day.key} style={{
                      background: isToday ? 'rgba(59,127,212,0.08)' : 'var(--bg-card2)',
                      border: `1px solid ${isToday ? 'var(--border-accent)' : 'var(--border)'}`,
                      borderRadius: '10px', padding: '14px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: isToday ? 'var(--blue-light)' : 'var(--cream-dim)', marginBottom: '10px' }}>{day.label}</div>
                      {([
                        { key: 'morning' as const, icon: '\u2600\uFE0F', label: 'AM' },
                        { key: 'evening' as const, icon: '\uD83C\uDF19', label: 'PM' },
                        { key: 'leadsLogged' as const, icon: '\uD83D\uDCCB', label: 'Leads' },
                        { key: 'clientsAlerted' as const, icon: '\uD83D\uDCF1', label: 'Alert' },
                      ]).map(item => (
                        <label key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px', color: 'var(--cream-muted)', cursor: 'pointer', marginBottom: '4px' }}>
                          <input type="checkbox" checked={dayData[item.key]} onChange={() => toggleSchedule(day.key, item.key)} style={{ accentColor: 'var(--blue)' }} />
                          <span>{item.icon}</span>
                        </label>
                      ))}
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: '20px', fontSize: '13px', color: 'var(--cream-muted)', textAlign: 'center' }}>
                This week: <strong style={{ color: 'var(--cream)' }}>{sessionsCompleted}</strong> monitoring sessions completed, <strong style={{ color: 'var(--cream)' }}>{leadsLoggedCount}</strong> days with leads logged, <strong style={{ color: 'var(--cream)' }}>{clientsAlertedCount}</strong> days with clients alerted.
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  )
}

// ============ EXPANDED LEAD VIEW ============

function ExpandedLead({ lead }: { lead: Lead }) {
  return (
    <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', margin: '8px 0 16px', fontSize: '13px', color: 'var(--cream-dim)', lineHeight: 1.7 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <strong style={{ color: 'var(--cream-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Platform</strong>
          <div>{lead.platform}</div>
        </div>
        <div>
          <strong style={{ color: 'var(--cream-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trade</strong>
          <div>{lead.trade}</div>
        </div>
        <div>
          <strong style={{ color: 'var(--cream-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Location</strong>
          <div>{lead.location || '—'}</div>
        </div>
        <div>
          <strong style={{ color: 'var(--cream-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Client Alerted</strong>
          <div>{lead.clientToAlert || '—'}</div>
        </div>
      </div>
      {lead.postUrl && (
        <div style={{ marginTop: '12px' }}>
          <strong style={{ color: 'var(--cream-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Post URL</strong>
          <div><a href={lead.postUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue-light)', textDecoration: 'none' }}>{lead.postUrl}</a></div>
        </div>
      )}
      <div style={{ marginTop: '12px' }}>
        <strong style={{ color: 'var(--cream-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</strong>
        <div style={{ whiteSpace: 'pre-wrap' }}>{lead.description}</div>
      </div>
      {lead.urgencySignals.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <strong style={{ color: 'var(--cream-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Urgency Signals</strong>
          <div>{lead.urgencySignals.join(', ')}</div>
        </div>
      )}
      {lead.contactAvailable && lead.contactInfo && (
        <div style={{ marginTop: '12px' }}>
          <strong style={{ color: 'var(--cream-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contact Info</strong>
          <div>{lead.contactInfo}</div>
        </div>
      )}
      {lead.outreachMessage && (
        <div style={{ marginTop: '12px' }}>
          <strong style={{ color: 'var(--cream-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Outreach Message</strong>
          <div style={{ whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', marginTop: '4px' }}>{lead.outreachMessage}</div>
        </div>
      )}
      {lead.actionTaken && (
        <div style={{ marginTop: '12px' }}>
          <strong style={{ color: 'var(--cream-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Action Taken</strong>
          <div>{lead.actionTaken}</div>
        </div>
      )}
      {lead.disqualifyReason && (
        <div style={{ marginTop: '12px' }}>
          <strong style={{ color: 'var(--cream-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Disqualify Reason</strong>
          <div>{lead.disqualifyReason}</div>
        </div>
      )}
      {lead.notes && (
        <div style={{ marginTop: '12px' }}>
          <strong style={{ color: 'var(--cream-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes</strong>
          <div style={{ whiteSpace: 'pre-wrap' }}>{lead.notes}</div>
        </div>
      )}
    </div>
  )
}
