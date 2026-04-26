'use client'

import ClientScripts from '@/components/ClientScripts'
import { EmailLink, SmsLink, CONTACT_PHONE_DISPLAY, CONTACT_EMAIL_DISPLAY } from '@/components/ContactLinks'

export default function HomePage() {
  return (
    <>
      {/* NAV */}
      <nav>
        <a href="/" className="nav-logo">
          <div className="nav-logo-mark">&#x1F9AB;</div>
          BaraTrust
        </a>
        <ul className="nav-links">
          <li><a href="#agents">AI Agents</a></li>
          <li><a href="#stack">The Stack</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="https://nightwatch.baratrust.com" target="_blank" rel="noopener noreferrer">Sign In</a></li>
          <li><a href="https://calendly.com/tebo1980/baratrust-consultation" target="_blank" rel="noopener noreferrer" className="nav-cta">Get Free Consultation</a></li>
        </ul>
      </nav>

      {/* HERO */}
      <section id="hero">
        <div className="container">
          <div className="hero-inner">
            <div className="hero-left fade-up">
              <div className="hero-badge">
                <span className="hero-badge-dot"></span>
                12 AI AGENTS WORKING 24/7
              </div>
              <h1>You can<br /><em>stop looking.</em></h1>
              <p className="hero-sub">The <strong>operating layer for local businesses</strong>. Intelligence, operations, and automation in one platform. An AI staff that runs the back half of your business so you can focus on the front half.</p>
              <p className="hero-fear">BaraTrust is not a marketing agency, a CRM, or a bookkeeping service. It&apos;s the intelligence platform that connects all three — built for contractors, salons, restaurants, gyms, auto shops, chiropractors, cleaners, and any local business where customers walk in or call.</p>
              <div className="hero-buttons">
                <a href="https://calendly.com/tebo1980/baratrust-consultation" target="_blank" rel="noopener noreferrer" className="btn-primary">Get Free Consultation</a>
                <a href="#agents" className="btn-secondary">Meet the AI Agents</a>
              </div>
              <div className="hero-proof">
                <div className="proof-item"><span className="proof-check">&#10003;</span> 90-Day Prove It Guarantee</div>
                <div className="proof-item"><span className="proof-check">&#10003;</span> 12 AI Agents Working 24/7</div>
                <div className="proof-item"><span className="proof-check">&#10003;</span> No Setup Fee — First 10 Clients</div>
              </div>
              <a href="#about" className="hero-story-link" onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }) }}>
                Read Todd&apos;s story &rarr;
              </a>
            </div>

            {/* CALCULATOR — desktop only */}
            <div className="hero-right hero-calc-desktop fade-up" style={{ animationDelay: '0.2s' }}>
              <div className="calc-card">
                <div className="calc-label">Revenue Intelligence Preview — Live Calculator</div>

                <div className="slider-row">
                  <div className="slider-header">
                    <span className="slider-name">Missed calls per week</span>
                    <span className="slider-val" id="calls-val">5</span>
                  </div>
                  <div className="slider-track">
                    <div className="slider-fill" id="calls-fill" style={{ width: '16%' }}></div>
                    <input type="range" className="slider-input" id="calls-slider" min={1} max={30} defaultValue={5} aria-label="Missed calls per week" />
                  </div>
                </div>

                <div className="slider-row">
                  <div className="slider-header">
                    <span className="slider-name">Average job value</span>
                    <span className="slider-val" id="job-val">$350</span>
                  </div>
                  <div className="slider-track">
                    <div className="slider-fill" id="job-fill" style={{ width: '17%' }}></div>
                    <input type="range" className="slider-input" id="job-slider" min={100} max={2000} step={50} defaultValue={350} aria-label="Average job value" />
                  </div>
                </div>

                <div className="slider-row">
                  <div className="slider-header">
                    <span className="slider-name">Your close rate</span>
                    <span className="slider-val" id="close-val">60%</span>
                  </div>
                  <div className="slider-track">
                    <div className="slider-fill" id="close-fill" style={{ width: '63%' }}></div>
                    <input type="range" className="slider-input" id="close-slider" min={10} max={90} step={5} defaultValue={60} aria-label="Your close rate" />
                  </div>
                </div>

                <div className="calc-result">
                  <div className="calc-result-label">Annual Revenue Left Behind</div>
                  <div className="calc-result-number" id="calc-total">$54,600</div>
                  <div className="calc-result-sub" id="calc-sub">That&apos;s 156 missed calls × 94 jobs × $350 avg</div>
                </div>

                <div className="calc-compare">
                  <div className="calc-compare-item">
                    <div className="calc-compare-val" id="calc-monthly" style={{ color: 'var(--red-soft)' }}>$4,550</div>
                    <div className="calc-compare-key">Per month lost</div>
                  </div>
                  <div className="calc-compare-item">
                    <div className="calc-compare-val" style={{ color: 'var(--cream-muted)' }}>$7,188</div>
                    <div className="calc-compare-key">BaraTrust / year</div>
                  </div>
                  <div className="calc-compare-item">
                    <div className="calc-compare-val" id="calc-net" style={{ color: 'var(--sage-light)' }}>$47,412</div>
                    <div className="calc-compare-key">Net recovery</div>
                  </div>
                </div>

                <button className="calc-cta" onClick={() => window.open('https://calendly.com/tebo1980/baratrust-consultation', '_blank')}>Stop Leaving Money Behind — Book Free Call</button>
              </div>
            </div>

            {/* MOBILE STAT BLOCK */}
            <div className="hero-right hero-mobile-stats fade-up" style={{ animationDelay: '0.2s' }}>
              <div className="mobile-stat-grid">
                <div className="mobile-stat-card">
                  <div className="mobile-stat-num">90</div>
                  <div className="mobile-stat-label">Day Prove It Guarantee</div>
                </div>
                <div className="mobile-stat-card">
                  <div className="mobile-stat-num">12</div>
                  <div className="mobile-stat-label">AI Agents Working 24/7</div>
                </div>
                <div className="mobile-stat-card">
                  <div className="mobile-stat-num">7</div>
                  <div className="mobile-stat-label">Day Full Presence Live</div>
                </div>
              </div>
            </div>
          </div>

          {/* SCROLL INDICATOR */}
          <div className="scroll-indicator" onClick={() => document.getElementById('fear')?.scrollIntoView({ behavior: 'smooth' })}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cream)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </section>

      <div className="section-divider"></div>

      {/* THREE PROBLEMS */}
      <section id="fear">
        <div className="container">
          <div className="fear-grid">
            <div className="fear-text fade-up">
              <h2>We know what <span>keeps you up</span> at 2am.</h2>
              <p>You took the leap. You built something real. And some days you wonder if you have any idea what&apos;s actually happening inside your own business. The revenue is there — or it isn&apos;t. The phone rings — or it doesn&apos;t. The money comes in and goes out and you&apos;re making decisions on gut because that&apos;s all you have time for.</p>
              <p><strong>That&apos;s not your fault. Nobody built the tools that would tell you.</strong></p>
            </div>
            <div className="fear-cards fade-up" style={{ animationDelay: '0.15s' }}>
              <div className="fear-card">
                <div className="fear-icon">&#x1F32B;&#xFE0F;</div>
                <div>
                  <div className="fear-card-title">Flying blind on your own business</div>
                  <div className="fear-card-text">You know your revenue. You don&apos;t know your profit per customer, per service, per month. You&apos;re making decisions from gut because nobody built a platform that would actually show you what&apos;s working.</div>
                </div>
              </div>
              <div className="fear-card">
                <div className="fear-icon">&#x2699;&#xFE0F;</div>
                <div>
                  <div className="fear-card-title">Doing four jobs you didn&apos;t sign up for</div>
                  <div className="fear-card-text">Marketing. Admin. Customer service. Bookkeeping. All work you do instead of the thing you actually love — and instead of the thing that actually makes you money.</div>
                </div>
              </div>
              <div className="fear-card">
                <div className="fear-icon">&#x1F4A7;</div>
                <div>
                  <div className="fear-card-title">Watching money leak with no idea where</div>
                  <div className="fear-card-text">The job that lost money. The vendor that quietly raised prices. The customer who costs more than they pay. All invisible until someone shows you. BaraTrust shows you.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAMILY */}
      <section id="family">
        <div className="container">
          <div className="family-inner fade-up">
            <h2>We didn&apos;t build this just for you.<br /><em>We built it for your family too.</em></h2>
            <p>Behind every stressed-out business owner is a spouse who feels it. Kids who notice when dad seems far away even when he&apos;s sitting right there. A partner who just wants things to feel okay again.</p>
            <p style={{ marginTop: '16px' }}>Peace of mind isn&apos;t just a business metric. It&apos;s coming home and being able to put the phone down.</p>
          </div>
        </div>
      </section>

      {/* INTELLIGENCE LOOP */}
      <section id="loop">
        <div className="container">
          <div className="fade-up">
            <div className="section-tag">The BaraTrust System</div>
            <h2 className="section-title">The Intelligence Loop</h2>
            <p className="section-sub">Every BaraTrust client goes through the same four-step system. Intelligence feeds operations. Operations feed marketing. Marketing feeds back into intelligence. The whole loop runs continuously.</p>
          </div>
          <div className="loop-steps fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="loop-step">
              <div className="loop-step-icon">&#x1F4CA;</div>
              <div className="loop-num">01</div>
              <div className="loop-step-title">Know What&apos;s Happening</div>
              <div className="loop-step-text">Your live dashboard shows every call tracked, every ad dollar accounted for, every lead captured, and your Business Health Score — updated in real time. No more guessing. No more end-of-month surprises. You open your phone and see exactly what&apos;s going on.</div>
            </div>
            <div className="loop-step">
              <div className="loop-step-icon">&#x1F4B0;</div>
              <div className="loop-num">02</div>
              <div className="loop-step-title">Know What&apos;s Profitable</div>
              <div className="loop-step-text">We tell you which customers are your best ones, which jobs made you money, which services carry the best margin, and which vendors are quietly raising prices. That&apos;s not marketing — that&apos;s a business partner showing you where the money actually is.</div>
            </div>
            <div className="loop-step">
              <div className="loop-step-icon">&#x1F916;</div>
              <div className="loop-num">03</div>
              <div className="loop-step-title">Automate What&apos;s Repetitive</div>
              <div className="loop-step-text">12 AI agents work in the background — capturing leads, responding to reviews, drafting social posts, sending follow-ups, tracking fleet costs, generating bids, running your back office. Work that used to take 20 hours a week happens without you lifting a finger.</div>
            </div>
            <div className="loop-step">
              <div className="loop-step-icon">&#x1F4C8;</div>
              <div className="loop-num">04</div>
              <div className="loop-step-title">Grow What&apos;s Working</div>
              <div className="loop-step-text">Once we know what&apos;s profitable and what&apos;s automated, marketing becomes amplification — not guessing. We invest your ad dollars into the customers and services that already make you money. Every dollar spent is tied to a metric you can see.</div>
            </div>
          </div>
        </div>
      </section>

      {/* AGENTS */}
      <section id="agents">
        <div className="container">
          <div className="agents-header fade-up">
            <div className="agents-header-text">
              <div className="section-tag">Your AI Agents</div>
              <h2 className="section-title" style={{ marginBottom: '8px' }}>12 Agents. Working 24/7.<br />While You&apos;re Running Your Business.</h2>
              <p className="agents-subtext">Type something into any agent below and watch them work. This is what&apos;s running in your business the moment you sign up. Intelligence agents come first — the ones that tell you what&apos;s happening. Operations agents next — the ones that do the work. Marketing agents last — the ones that amplify what&apos;s already working.</p>
            </div>
          </div>

          <div className="agents-group-label fade-up" style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--cream-muted)', margin: '32px 0 16px' }}>
            Intelligence
          </div>
          <div className="bento-grid fade-up" style={{ animationDelay: '0.05s' }}>
            <AgentCard name="cole" emoji="&#x1F4E6;" title="Cole" role="Cost & Inventory Intelligence" desc="Tracks cost of goods, monitors vendor pricing changes, and alerts you when materials are cutting into your margins. Know your real job profitability." placeholder="Try: 'Copper pipe up 18% this month, affects 60% of jobs'" />
            <AgentCard name="flynn" emoji="&#x1F69B;" title="Flynn" role="Fleet & Vehicle Intelligence" desc="Tracks vehicle maintenance schedules, mileage logs for tax purposes, and fuel costs. Makes sure your fleet is always job-ready and your deductions are maximized." placeholder="Try: 'F-250, 87,000 miles, last oil change at 84,500'" />
            <AgentCard name="brix" emoji="&#x1F4D0;" title="Brix" role="Bidding Intelligence Agent" desc="Helps contractors build accurate job bids fast and flags problem clients before they waste time on a quote. Asks one question at a time, generates a complete bid breakdown, and tells you what to watch out for." placeholder="Try: 'Need to bid a bathroom remodel, about 150 sq ft, full gut'" />
            <AgentCard name="shield" emoji="&#x1F6E1;&#xFE0F;" title="Shield" role="Small Business Insurance Navigator" desc="Helps local service business owners understand what coverage they actually need, what they can skip, and whether what they have makes sense — in plain English. No jargon, no sales pitch." placeholder="Try: 'I run a 4-person plumbing company, we work in client homes'" />
            <AgentCard name="bolt" emoji="&#x26A1;" title="Bolt" role="Restaurant & Retail Intelligence" desc="Specialized intelligence for restaurants and retail businesses. Menu performance, peak hour analysis, seasonal trends, and competitive insights specific to food service and retail." placeholder="Try: 'Slow Tuesday lunches, down 30% vs last year'" />
          </div>

          <div className="agents-group-label fade-up" style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--cream-muted)', margin: '40px 0 16px' }}>
            Operations
          </div>
          <div className="bento-grid fade-up" style={{ animationDelay: '0.05s' }}>
            <AgentCard name="max" emoji="&#x2699;&#xFE0F;" title="Max" role="Back Office Automation" desc="Sends review requests after completed jobs, payment reminders for outstanding invoices, and keeps your back office running while you focus on the work." placeholder="Try: 'Job completed for Johnson residence, invoice unpaid 14 days'" />
            <AgentCard name="della" emoji="&#x2709;&#xFE0F;" title="Della" role="Email Secretary" desc="Handles 10 email types — estimates, confirmations, thank-yous, appointment reminders, and more. Professional emails out the door without you typing a word." placeholder="Try: 'Write a thank you email after completing a furnace installation'" />
            <AgentCard name="river" emoji="&#x1F4C5;" title="River" role="Appointments & Reminders" desc="Manages appointment confirmations, sends reminders to both you and the customer, and proactively pings providers when schedules change. No more no-shows." placeholder="Try: 'Appointment tomorrow 9am, customer hasn't confirmed'" />
          </div>

          <div className="agents-group-label fade-up" style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--cream-muted)', margin: '40px 0 16px' }}>
            Marketing
          </div>
          <div className="bento-grid fade-up" style={{ animationDelay: '0.05s' }}>
            <AgentCard name="nova" emoji="&#x1F31F;" title="Nova" role="Lead Capture & Website Intelligence" desc="Nova handles every website visitor and inbound lead — responding instantly, qualifying prospects, and making sure no opportunity slips through while you're on a job. She's the first voice your customers hear." placeholder="Try: 'Hi I need a quote for a roof repair in New Albany'" wide />
            <AgentCard name="rex" emoji="&#x2B50;" title="Rex" role="Review Manager" desc="Monitors Google and Yelp every 6 hours. Drafts professional responses to every review — good or bad — in your voice." placeholder="Try: '1 star — technician was late and didn't fix the problem'" />
            <AgentCard name="iris" emoji="&#x1F504;" title="Iris" role="Follow-Up Sequences" desc="Runs 3-touch follow-up sequences over 7 days. Prospects who didn't book get a second chance automatically — without you lifting a finger." placeholder="Try: 'Customer asked for a quote 3 days ago, no response'" />
            <AgentCard name="sage" emoji="&#x1F4F1;" title="Sage" role="Social Media Drafting" desc="Turns your completed jobs into social media content. Facebook posts, Google Business updates, Instagram captions — all written and ready to post." placeholder="Try: 'Replaced water heater for family in Louisville, same-day service'" />
          </div>

          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <a href="https://nightwatch.baratrust.com" target="_blank" rel="noopener noreferrer" className="btn-secondary">View Full AI Agent Portal →</a>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how">
        <div className="container">
          <div className="fade-up">
            <div className="section-tag">The Timeline</div>
            <h2 className="section-title">What Happens After You Say Yes</h2>
            <p className="section-sub">No surprises. No waiting around. Here&apos;s exactly what the first 90 days look like.</p>
          </div>
          <div className="timeline fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="timeline-step">
              <div className="timeline-day">Day 1</div>
              <div className="timeline-title">Call Tracking Live</div>
              <div className="timeline-text">Your CallRail tracking number goes live, your dashboard connects, and 12 AI agents activate. You can see it working before we&apos;ve built a single page. Proof before we start.</div>
            </div>
            <div className="timeline-step">
              <div className="timeline-day">Days 2–7</div>
              <div className="timeline-title">Full Presence Built</div>
              <div className="timeline-text">Website live. Google Business Profile optimized. Bing and Apple Maps claimed. Directories submitted. All 12 AI agents running. Missed call text-back active.</div>
            </div>
            <div className="timeline-step">
              <div className="timeline-day">Day 30</div>
              <div className="timeline-title">First Monthly Report</div>
              <div className="timeline-text">Plain English report in your inbox. What happened, what it means, what&apos;s changing. Followed by a walkthrough call where we go through it together.</div>
            </div>
            <div className="timeline-step">
              <div className="timeline-day">Day 90</div>
              <div className="timeline-title">Guarantee Review</div>
              <div className="timeline-text">10 tracked calls in 90 days. We review together. If we hit it we celebrate. If we don&apos;t — Month 4 is completely free. The dashboard shows every call. Nothing to argue about.</div>
            </div>
            <div className="timeline-step">
              <div className="timeline-day">Every Month</div>
              <div className="timeline-title">Growing Intelligence</div>
              <div className="timeline-text">Dashboard updates in real time. Monthly report arrives on schedule. Business Health Score shows your progress. We&apos;re always one text or call away.</div>
            </div>
            <div className="timeline-step">
              <div className="timeline-day">Month 12+</div>
              <div className="timeline-title">Loyalty Rewards</div>
              <div className="timeline-text">Complete clients earn loyalty pricing, price locks, and early access to new agents. The longer we work together the more valuable the partnership becomes.</div>
            </div>
          </div>
        </div>
      </section>

      {/* PROOF — MONEY MAP DASHBOARD */}
      <section id="proof">
        <div className="container">
          <div className="fade-up">
            <div className="section-tag">The Money Map</div>
            <h2 className="section-title">Your Dashboard. Live. Always.</h2>
            <p className="section-sub">Most agencies don&apos;t show you this because if you could see exactly what was working and what wasn&apos;t you&apos;d know exactly what to cut — including them. We show you everything.</p>
          </div>
          <div className="proof-grid fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="dashboard-card">
              <div className="dashboard-card-label">Calls This Month</div>
              <div className="dashboard-stat" style={{ color: 'var(--blue-light)' }}>34</div>
              <div className="dashboard-change">&#8593; 28% vs last month</div>
              <div className="dashboard-bar"><div className="dashboard-bar-fill" style={{ width: '68%' }}></div></div>
            </div>
            <div className="dashboard-card">
              <div className="dashboard-card-label">Revenue This Month</div>
              <div className="dashboard-stat" style={{ color: 'var(--sage-light)' }}>$16,800</div>
              <div className="dashboard-change">12 booked jobs</div>
              <div className="dashboard-bar"><div className="dashboard-bar-fill" style={{ width: '84%', background: 'linear-gradient(90deg, var(--sage), var(--sage-light))' }}></div></div>
            </div>
            <div className="dashboard-card">
              <div className="dashboard-card-label">Ad Spend ROI</div>
              <div className="dashboard-stat" style={{ color: 'var(--gold)' }}>25x</div>
              <div className="dashboard-change">$650 spent this month</div>
              <div className="dashboard-bar"><div className="dashboard-bar-fill" style={{ width: '92%', background: 'linear-gradient(90deg, var(--gold), #E8C86A)' }}></div></div>
            </div>
            <div className="dashboard-card">
              <div className="dashboard-card-label">Cost Per Call</div>
              <div className="dashboard-stat" style={{ color: 'var(--cream)' }}>$19</div>
              <div className="dashboard-change">&#8595; from $47 at start</div>
              <div className="dashboard-bar"><div className="dashboard-bar-fill" style={{ width: '40%' }}></div></div>
            </div>

            <div className="dashboard-card health-score-card">
              <div className="health-score-main">
                <div className="health-score-num">74</div>
                <div className="health-score-label">Business Health Score</div>
                <div style={{ fontSize: '12px', color: 'var(--sage-light)', marginTop: '6px' }}>&#8593; from 42 at start</div>
              </div>
              <div className="health-cats">
                <div className="health-cat">
                  <span className="health-cat-name">Visibility</span>
                  <div className="health-bar"><div className="health-bar-fill" style={{ width: '78%', background: 'var(--blue)' }}></div></div>
                  <span className="health-cat-val">78</span>
                </div>
                <div className="health-cat">
                  <span className="health-cat-name">Lead Capture</span>
                  <div className="health-bar"><div className="health-bar-fill" style={{ width: '65%', background: 'var(--sage)' }}></div></div>
                  <span className="health-cat-val">65</span>
                </div>
                <div className="health-cat">
                  <span className="health-cat-name">Profitability</span>
                  <div className="health-bar"><div className="health-bar-fill" style={{ width: '72%', background: 'var(--gold)' }}></div></div>
                  <span className="health-cat-val">72</span>
                </div>
                <div className="health-cat">
                  <span className="health-cat-name">Customer Quality</span>
                  <div className="health-bar"><div className="health-bar-fill" style={{ width: '68%', background: '#8B5CF6' }}></div></div>
                  <span className="health-cat-val">68</span>
                </div>
                <div className="health-cat">
                  <span className="health-cat-name">Reputation</span>
                  <div className="health-bar"><div className="health-bar-fill" style={{ width: '82%', background: 'var(--red-soft)' }}></div></div>
                  <span className="health-cat-val">82</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE STACK — bundled with Complete */}
      <section id="stack">
        <div className="container">
          <div className="fade-up" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div className="section-tag">What&apos;s Included in Complete</div>
            <h2 className="section-title">Complete is more than a platform.<br />It&apos;s a stack.</h2>
            <p className="section-sub" style={{ margin: '0 auto' }}>Three additional services bundled into BaraTrust Complete that no other agency offers — and you&apos;d pay thousands for separately.</p>
          </div>

          <div className="stack-grid fade-up" style={{ animationDelay: '0.1s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div className="stack-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '32px', marginBottom: '14px' }}>&#x1F3AC;</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '8px' }}>BaraTrust Ads</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--cream)', marginBottom: '12px', lineHeight: 1.25 }}>AI-Generated Cinematic Commercials</h3>
              <p style={{ fontSize: '14px', color: 'var(--cream-dim)', lineHeight: 1.7, flex: 1, marginBottom: '16px' }}>One professionally produced commercial per quarter, free with annual Complete. AI-generated B-roll, avatar spokesperson, professional editing. The kind of commercial that used to cost $3,000 to produce, now part of your subscription.</p>
              <div style={{ fontSize: '12px', color: 'var(--cream-muted)', borderTop: '1px solid var(--border)', paddingTop: '14px', lineHeight: 1.6 }}>$499 per commercial as a standalone service. Free quarterly with annual Complete.</div>
            </div>

            <div className="stack-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '32px', marginBottom: '14px' }}>&#x1F4DA;</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '8px' }}>VisionToSOP</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--cream)', marginBottom: '12px', lineHeight: 1.25 }}>Custom Training & SOP Generator</h3>
              <p style={{ fontSize: '14px', color: 'var(--cream-dim)', lineHeight: 1.7, flex: 1, marginBottom: '16px' }}>Generate complete training courses and documented SOPs for your team in 60 seconds. Type the procedure, get back modules, quizzes, field missions, and certifications. Up to 10 employee seats included.</p>
              <div style={{ fontSize: '12px', color: 'var(--cream-muted)', borderTop: '1px solid var(--border)', paddingTop: '14px', lineHeight: 1.6 }}>$199/month standalone. Bundled with Complete. <a href="https://visiontosop.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Learn more →</a></div>
            </div>

            <div className="stack-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '32px', marginBottom: '14px' }}>&#x1F4B0;</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '8px' }}>FundsFetch</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--cream)', marginBottom: '12px', lineHeight: 1.25 }}>Capital Strategy & Funding Discovery</h3>
              <p style={{ fontSize: '14px', color: 'var(--cream-dim)', lineHeight: 1.7, flex: 1, marginBottom: '16px' }}>Annual Capital Strategy Session plus ongoing monitoring of grants, loans, and capital programs you qualify for. Find the money most business owners leave on the table.</p>
              <div style={{ fontSize: '12px', color: 'var(--cream-muted)', borderTop: '1px solid var(--border)', paddingTop: '14px', lineHeight: 1.6 }}>$199-799/month standalone. Annual session plus Discovery monitoring bundled with Complete. <a href="https://fundsfetch.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Learn more →</a></div>
            </div>
          </div>

          <p className="fade-up" style={{ animationDelay: '0.2s', textAlign: 'center', fontSize: '13px', color: 'var(--cream-muted)', maxWidth: '720px', margin: '32px auto 0', lineHeight: 1.7 }}>
            <a href="https://visiontosop.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cream-muted)', textDecoration: 'underline' }}>VisionToSOP</a> and <a href="https://fundsfetch.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cream-muted)', textDecoration: 'underline' }}>FundsFetch</a> are independent businesses with their own websites and direct customer bases. BaraTrust Complete clients receive bundled access as part of the Complete subscription.
          </p>
        </div>
      </section>

      {/* GUARANTEE */}
      <section id="guarantee">
        <div className="container">
          <div className="guarantee-inner fade-up">
            <div className="guarantee-badge">&#10003; The BaraTrust Promise</div>
            <div className="guarantee-stat">90</div>
            <div className="guarantee-stat-label" style={{ marginBottom: '24px' }}>Day Prove It Guarantee</div>
            <h2>10 tracked calls in 90 days<br />or Month 4 is free.</h2>
            <p>We&apos;ve been taken to the cleaners too. We know exactly what it feels like to pay for a promise that goes nowhere. We vowed never to do that to another person. Every call is tracked in your live dashboard — proof is always there. No questions asked. No fine print.</p>
            <a href="https://calendly.com/tebo1980/baratrust-consultation" target="_blank" rel="noopener noreferrer" className="btn-primary">Claim Your Guarantee</a>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing">
        <div className="container">
          <div className="fade-up" style={{ textAlign: 'center' }}>
            <div className="section-tag">Transparent Pricing</div>
            <h2 className="section-title">Three Tiers. One System.<br />No Setup Fees for First 10 Clients.</h2>
            <p className="section-sub" style={{ margin: '0 auto 48px' }}>Pick the tier that fits where you are right now. Move up as your business grows. Every tier includes the 90-day Prove It Guarantee.</p>
          </div>

          <div className="pricing-grid-3 fade-up">

            {/* FOUNDATION */}
            <div className="pricing-card">
              <div className="pricing-tier">Foundation</div>
              <div className="pricing-price">$499<span>/mo</span></div>
              <div className="pricing-term">Best for: solo operators and small teams</div>
              <p style={{ fontSize: '13px', color: 'var(--cream-dim)', lineHeight: 1.6, marginBottom: '24px' }}>The full AI agent staff and the dashboard you need to start running your business with intelligence.</p>
              <ul className="pricing-features">
                <li>Full AI agent staff (12 agents, all current and future)</li>
                <li>Basic dashboard with call tracking</li>
                <li>Email and review monitoring</li>
                <li>Missed call text-back automation</li>
                <li>Standard reporting</li>
                <li>90-Day Prove It Guarantee</li>
                <li>Email support</li>
              </ul>
              <a href="https://buy.stripe.com/7sYbIU6pG5pr7PxeAF5ZC1C" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'block', textAlign: 'center' as const, padding: '14px', marginTop: '28px' }}>Start Foundation</a>
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center' }}>
                <a href="https://buy.stripe.com/eVq00c29q6tvgm30JP5ZC1F" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--cream-muted)', textDecoration: 'none' }}>Save 10% — 12 month commitment ($449/mo) →</a>
                <a href="https://buy.stripe.com/9B614g7tKaJL4Dl78d5ZC1G" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--cream-muted)', textDecoration: 'none' }}>Save 15% — 24 month commitment ($424/mo) →</a>
              </div>
            </div>

            {/* OPERATIONS */}
            <div className="pricing-card pricing-card-featured">
              <div className="pricing-badge">Most Popular</div>
              <div className="pricing-tier">Operations</div>
              <div className="pricing-price">$899<span>/mo</span></div>
              <div className="pricing-term">Best for: growing local businesses</div>
              <p style={{ fontSize: '13px', color: 'var(--cream-dim)', lineHeight: 1.6, marginBottom: '24px' }}>Everything in Foundation plus the full local presence build, ad management, and live performance dashboard.</p>
              <ul className="pricing-features">
                <li>Everything in Foundation</li>
                <li>Full local presence build (website, GBP, directories)</li>
                <li>Bing and Apple Maps optimization</li>
                <li>Google Ads management</li>
                <li>Facebook Ads management</li>
                <li>Live performance dashboard</li>
                <li>Monthly reports and walkthrough call</li>
                <li>Business Health Score</li>
                <li>Review management and generation</li>
                <li>Social media scheduling</li>
              </ul>
              <a href="https://buy.stripe.com/eVq4gs9BSaJL1r91NT5ZC1D" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'block', textAlign: 'center' as const, padding: '14px', marginTop: '28px' }}>Start Operations</a>
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center' }}>
                <a href="https://buy.stripe.com/7sYeV6aFWbNP5Hpcsx5ZC1H" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--cream-muted)', textDecoration: 'none' }}>Save 10% — 12 month commitment ($809/mo) →</a>
                <a href="https://buy.stripe.com/9B6eV67tKdVX1r9dwB5ZC1I" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--cream-muted)', textDecoration: 'none' }}>Save 15% — 24 month commitment ($764/mo) →</a>
              </div>
            </div>

            {/* COMPLETE */}
            <div className="pricing-card">
              <div className="pricing-tier">Complete</div>
              <div className="pricing-price">$1,499<span>/mo</span></div>
              <div className="pricing-term">Best for: established operations · Worth $5,500+ standalone</div>
              <p style={{ fontSize: '13px', color: 'var(--cream-dim)', lineHeight: 1.6, marginBottom: '24px' }}>Everything in Operations plus the Money Map, Customer Intelligence CRM, and the full bundled stack: BaraTrust Ads, VisionToSOP, FundsFetch.</p>
              <ul className="pricing-features">
                <li>Everything in Operations</li>
                <li>Money Map profitability dashboard</li>
                <li>Customer Intelligence CRM (Gold list to Blacklist)</li>
                <li>Job and customer profitability tracking</li>
                <li>Vendor cost monitoring and alerts</li>
                <li>Expense and revenue intelligence</li>
                <li>OpportunityWatch lead generation</li>
                <li>BaraTrust Ads (1 commercial per quarter, free)</li>
                <li>VisionToSOP Team access (10 employee seats)</li>
                <li>FundsFetch Capital access (Annual Strategy Session + Discovery monitoring)</li>
                <li>Quarterly roadmap deliverable</li>
                <li>Direct phone access to your strategist</li>
              </ul>
              <a href="https://buy.stripe.com/28EdR24hy9FHd9R3W15ZC1E" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'block', textAlign: 'center' as const, padding: '14px', marginTop: '28px' }}>Start Complete</a>
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center' }}>
                <a href="https://buy.stripe.com/bJe14geWc7xz2vd5055ZC1J" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--cream-muted)', textDecoration: 'none' }}>Save 10% — 12 month commitment ($1,349/mo) →</a>
                <a href="https://buy.stripe.com/8x214g7tKbNP9XFbot5ZC1K" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--cream-muted)', textDecoration: 'none' }}>Save 15% — 24 month commitment ($1,274/mo) →</a>
              </div>
            </div>

          </div>

          {/* TERMS SUMMARY */}
          <div className="fade-up pricing-callout-secondary" style={{ animationDelay: '0.1s' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'var(--cream)', marginBottom: '12px', letterSpacing: '0.04em' }}>All tiers include:</div>
            <ul style={{ fontSize: '13px', color: 'var(--cream-muted)', lineHeight: 1.85, listStyle: 'none', padding: 0, margin: 0 }}>
              <li>· 6-month minimum initial term at standard rate</li>
              <li>· 12-month commitment available at 10% off (Foundation $449/mo, Operations $809/mo, Complete $1,349/mo)</li>
              <li>· 24-month commitment available at 15% off (Foundation $424/mo, Operations $764/mo, Complete $1,274/mo)</li>
              <li>· No setup fee for first 10 clients (any tier, any term)</li>
              <li>· Month-to-month available exclusively as a loyalty option after completing your first term</li>
            </ul>
          </div>

          {/* SETUP FEE CALLOUT */}
          <div className="fade-up pricing-callout-primary" style={{ animationDelay: '0.15s' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800, color: 'var(--cream)', marginBottom: '8px' }}>No setup fee for the first 10 clients.</div>
            <div style={{ fontSize: '14px', color: 'var(--cream-dim)', lineHeight: 1.7 }}>After that, setup fees apply. If you&apos;re reading this and spots are still available — this is the time.</div>
          </div>

          {/* ADD-ON */}
          <div className="fade-up" style={{ animationDelay: '0.2s', marginTop: '28px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: '1 1 320px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '6px' }}>Add-on Service</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--cream)', marginBottom: '6px' }}>BaraTrust Ads — Custom AI-Generated Commercial — $499</div>
              <div style={{ fontSize: '13px', color: 'var(--cream-muted)', lineHeight: 1.65 }}>Standalone purchase available without subscription. Free quarterly with annual Complete.</div>
            </div>
            <a href="https://baratrustads.com" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>Learn More</a>
          </div>

        </div>
      </section>

      {/* ABOUT */}
      <section id="about">
        <div className="container">
          <div className="about-grid">
            <div className="about-text fade-up">
              <h2>BaraTrust wasn&apos;t built by marketers.</h2>
              <p>It was built by someone who has worked <strong>security dispatch, retail management, restaurants, and recruiting for over twenty years</strong>. Someone who has seen small business owners get burned over and over again by agencies that charge thousands of dollars, send confusing reports, and disappear when the results don&apos;t show up.</p>
              <p>Someone who has been burned himself.</p>
              <p>I built BaraTrust because I got tired of watching good people — people who are great at what they do, who took the leap and bet on themselves — get taken advantage of by an industry that profits from their confusion.</p>
              <p>I know what it&apos;s like to work a job you hate to pay the bills while you build something of your own on the side. I know what it&apos;s like to lie awake at night wondering if you made a mistake. That&apos;s who I built this for.</p>
              <div className="about-sig">— Todd Tebo, Founder</div>
              <div style={{ marginTop: '28px' }}>
                <a href="https://calendly.com/tebo1980/baratrust-consultation" target="_blank" rel="noopener noreferrer" className="btn-primary">Talk to Todd — Free 20 Min</a>
              </div>
            </div>
            <div className="about-stats fade-up" style={{ animationDelay: '0.15s' }}>
              <div className="about-stat">
                <div className="about-stat-num">20+</div>
                <div className="about-stat-label">Years hiring, managing, and building businesses</div>
              </div>
              <div className="about-stat">
                <div className="about-stat-num">12</div>
                <div className="about-stat-label">AI agents working for your business 24/7</div>
              </div>
              <div className="about-stat">
                <div className="about-stat-num">90</div>
                <div className="about-stat-label">Day guarantee — 10 calls or Month 4 is free</div>
              </div>
              <div className="about-stat">
                <div className="about-stat-num">7</div>
                <div className="about-stat-label">Day launch — full presence live in one week</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLOSE CTA */}
      <section id="close">
        <div className="container">
          <div className="close-inner fade-up">
            <h2>Ready to stop wondering<br />if it&apos;s working?</h2>
            <p>Get a free 20-minute consultation. No pitch. No pressure. Just an honest conversation about what your business needs and whether BaraTrust is the right fit.</p>
            <div className="close-options">
              <a href="https://calendly.com/tebo1980/baratrust-consultation" target="_blank" rel="noopener noreferrer" className="btn-primary">Book Your Free Consultation</a>
              <SmsLink className="btn-secondary">Text us at {CONTACT_PHONE_DISPLAY}</SmsLink>
              <EmailLink className="btn-secondary">Email {CONTACT_EMAIL_DISPLAY}</EmailLink>
            </div>
            <div className="close-contact" style={{ marginBottom: '32px' }}>
              Prefer to look around first? Start with the dashboard demo and see exactly what your business could look like inside BaraTrust.<br />
              <a href="#proof" style={{ display: 'inline-block', marginTop: '12px' }} className="btn-secondary">See The Demo Dashboard</a>
            </div>

            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cream-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '16px', textAlign: 'left' as const }}>Or send us a message</div>
              <div data-fs-success="" style={{ display: 'none', background: 'rgba(90,143,110,0.12)', border: '1px solid rgba(90,143,110,0.25)', borderRadius: '12px', padding: '20px', textAlign: 'center' as const, fontSize: '14px', color: 'var(--sage-light)', marginBottom: '16px' }}>
                &#10003; Message sent — Todd will be in touch within 24 hours.
              </div>
              <div data-fs-error="" style={{ display: 'none', background: 'rgba(224,90,90,0.1)', border: '1px solid rgba(224,90,90,0.2)', borderRadius: '12px', padding: '16px', fontSize: '13px', color: '#E05A5A', marginBottom: '16px', textAlign: 'left' as const }}></div>
              <form id="contact-form" action="https://formspree.io/f/xzdkqaap" method="POST" style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px', textAlign: 'left' as const }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cream-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, display: 'block', marginBottom: '6px' }}>Your Name</label>
                    <input type="text" name="name" required placeholder="John Smith"
                      style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--cream)', fontFamily: 'var(--font-body)', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cream-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, display: 'block', marginBottom: '6px' }}>Your Email</label>
                    <input type="email" name="email" required placeholder="john@yourbusiness.com"
                      style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--cream)', fontFamily: 'var(--font-body)', outline: 'none' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cream-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, display: 'block', marginBottom: '6px' }}>Your Message</label>
                  <textarea name="message" required rows={4} placeholder="Tell us about your business and what you're looking to improve..."
                    style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: 'var(--cream)', fontFamily: 'var(--font-body)', outline: 'none', resize: 'vertical' }}></textarea>
                </div>
                <input type="hidden" name="_subject" value="New BaraTrust inquiry from website" />
                <button type="submit" data-fs-submit-btn=""
                  style={{ background: 'var(--blue)', color: 'var(--cream)', padding: '13px 24px', borderRadius: '10px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', letterSpacing: '0.02em' }}>
                  Send Message →
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-logo">BaraTrust</div>
        <div className="footer-seal">&#x1F9AB;</div>
        <div className="footer-text">© 2026 BaraTrust. New Albany, Indiana. Serving local businesses across the United States.</div>
        <div className="footer-links">
          <a href="#agents">AI Agents</a>
          <a href="#stack">The Stack</a>
          <a href="#pricing">Pricing</a>
          <a href="#about">Our Story</a>
          <a href="/terms">Terms</a>
          <a href="/health-score">Health Score</a>
          <a href="https://nightwatch.baratrust.com" target="_blank" rel="noopener noreferrer">AI Agent Portal</a>
          <a href="https://baratrustads.com" target="_blank" rel="noopener noreferrer">BaraTrust Ads</a>
          <a href="https://visiontosop.com" target="_blank" rel="noopener noreferrer">VisionToSOP — AI Training & SOP Platform</a>
          <a href="https://fundsfetch.com" target="_blank" rel="noopener noreferrer">FundsFetch — Capital Strategy for Small Businesses</a>
          <a href="https://getstackcheck.com" target="_blank" rel="noopener noreferrer">GetStackCheck</a>
          <a href="#close">Contact</a>
        </div>
      </footer>

      <ClientScripts />
    </>
  )
}

function AgentCard({ name, emoji, title, role, desc, placeholder, wide }: {
  name: string
  emoji: string
  title: string
  role: string
  desc: string
  placeholder: string
  wide?: boolean
}) {
  return (
    <div className={`agent-card agent-${name}${wide ? ' agent-card-wide' : ''}`}>
      <div className="agent-header">
        <div className="agent-avatar" dangerouslySetInnerHTML={{ __html: emoji }} />
        <div className="agent-info">
          <div className="agent-name">{title}</div>
          <div className="agent-role">{role}</div>
        </div>
        <div className="agent-status"><span className="agent-status-dot"></span>Live</div>
      </div>
      <div className="agent-desc">{desc}</div>
      <div className="agent-demo">
        <textarea className="agent-input" id={`input-${name}`} placeholder={placeholder} maxLength={500} aria-label={`Ask ${title}`}></textarea>
        <button className="agent-btn" onClick={() => (window as any).demoAgent(name)} id={`btn-${name}`}>Ask {title} →</button>
        <div className="agent-response" id={`response-${name}`}></div>
      </div>
    </div>
  )
}
