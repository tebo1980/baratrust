'use client'

import ClientScripts from '@/components/ClientScripts'

export default function HomePage() {
  return (
    <>
      {/* NAV */}
      <nav>
        <a href="#" className="nav-logo">
          <div className="nav-logo-mark">&#x1F9AB;</div>
          BaraTrust
        </a>
        <ul className="nav-links">
          <li><a href="#agents">AI Staff</a></li>
          <li><a href="#how">How It Works</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#guarantee">Guarantee</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="/health-score">Health Score</a></li>
          <li><a href="https://calendly.com/tebo1980/baratrust-consultation" target="_blank" rel="noopener noreferrer" className="nav-cta">Free Consultation</a></li>
        </ul>
      </nav>

      {/* HERO */}
      <section id="hero">
        <div className="container">
          <div className="hero-inner">
            <div className="hero-left fade-up">
              <div className="hero-badge">
                <span className="hero-badge-dot"></span>
                5 AI Agents Working 24/7
              </div>
              <h1>You can<br /><em>stop looking.</em></h1>
              <p className="hero-fear">We know you&apos;ve been burned before. So have we. That&apos;s exactly why we built this differently.</p>
              <p className="hero-sub">BaraTrust puts an <strong>AI staff in your service business</strong> — handling leads, reviews, follow-ups, and back office work while you&apos;re on the job. Guaranteed in 90 days.</p>
              <div className="hero-buttons">
                <a href="https://calendly.com/tebo1980/baratrust-consultation" target="_blank" rel="noopener noreferrer" className="btn-primary">Get Free Consultation</a>
                <a href="#agents" className="btn-secondary">Meet the AI Staff</a>
              </div>
              <div className="hero-proof">
                <div className="proof-item"><span className="proof-check">&#10003;</span> 90-Day Prove It Guarantee</div>
                <div className="proof-item"><span className="proof-check">&#10003;</span> 10 AI Agents Working 24/7</div>
                <div className="proof-item"><span className="proof-check">&#10003;</span> No Setup Fee — First 10 Clients</div>
              </div>
              <a href="#about" className="hero-story-link" onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }) }}>
                Read Todd&apos;s story &rarr;
              </a>
            </div>

            {/* CALCULATOR — desktop only */}
            <div className="hero-right hero-calc-desktop fade-up" style={{ animationDelay: '0.2s' }}>
              <div className="calc-card">
                <div className="calc-label">Revenue Left Behind — Live Calculator</div>

                <div className="slider-row">
                  <div className="slider-header">
                    <span className="slider-name">Missed calls per week</span>
                    <span className="slider-val" id="calls-val">5</span>
                  </div>
                  <div className="slider-track">
                    <div className="slider-fill" id="calls-fill" style={{ width: '16%' }}></div>
                    <input type="range" className="slider-input" id="calls-slider" min={1} max={30} defaultValue={5} />
                  </div>
                </div>

                <div className="slider-row">
                  <div className="slider-header">
                    <span className="slider-name">Average job value</span>
                    <span className="slider-val" id="job-val">$350</span>
                  </div>
                  <div className="slider-track">
                    <div className="slider-fill" id="job-fill" style={{ width: '17%' }}></div>
                    <input type="range" className="slider-input" id="job-slider" min={100} max={2000} step={50} defaultValue={350} />
                  </div>
                </div>

                <div className="slider-row">
                  <div className="slider-header">
                    <span className="slider-name">Your close rate</span>
                    <span className="slider-val" id="close-val">60%</span>
                  </div>
                  <div className="slider-track">
                    <div className="slider-fill" id="close-fill" style={{ width: '63%' }}></div>
                    <input type="range" className="slider-input" id="close-slider" min={10} max={90} step={5} defaultValue={60} />
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

            {/* MOBILE STAT BLOCK — shown below 768px instead of calculator */}
            <div className="hero-right hero-mobile-stats fade-up" style={{ animationDelay: '0.2s' }}>
              <div className="mobile-stat-grid">
                <div className="mobile-stat-card">
                  <div className="mobile-stat-num">90</div>
                  <div className="mobile-stat-label">Day Prove It Guarantee</div>
                </div>
                <div className="mobile-stat-card">
                  <div className="mobile-stat-num">10</div>
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

      {/* FEAR */}
      <section id="fear">
        <div className="container">
          <div className="fear-grid">
            <div className="fear-text fade-up">
              <h2>We know what <span>keeps you up</span> at 2am.</h2>
              <p>You took the leap. You left the steady paycheck and bet on yourself. And now some days you wonder if you made the biggest mistake of your life.</p>
              <p>You&apos;ve tried to get help before. You paid someone to promote your business and they disappeared. You built a website and the phone still didn&apos;t ring. Nobody delivered what they promised.</p>
              <p><strong>And now you&apos;re gun shy about spending another dollar.</strong> We know. We&apos;ve been there. That&apos;s exactly why we built BaraTrust the way we did.</p>
            </div>
            <div className="fear-cards fade-up" style={{ animationDelay: '0.15s' }}>
              <div className="fear-card">
                <div className="fear-icon">&#x1F4B8;</div>
                <div>
                  <div className="fear-card-title">Getting burned again</div>
                  <div className="fear-card-text">Another agency that talks a good game but vanishes when results don&apos;t show up. We built the 90-day guarantee specifically because we refused to be another broken promise.</div>
                </div>
              </div>
              <div className="fear-card">
                <div className="fear-icon">&#x1F4F5;</div>
                <div>
                  <div className="fear-card-title">Missing calls while on the job</div>
                  <div className="fear-card-text">You&apos;re under a sink or on a roof. Your phone rings. Nobody answers. That lead calls the next guy on the list. Nova catches every one of those calls automatically.</div>
                </div>
              </div>
              <div className="fear-card">
                <div className="fear-icon">&#x1F311;</div>
                <div>
                  <div className="fear-card-title">Not knowing if anything is working</div>
                  <div className="fear-card-text">Your live dashboard shows every call tracked, every ad dollar accounted for, your Business Health Score — updated in real time. No more guessing.</div>
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

      {/* REVENUE LOOP */}
      <section id="loop">
        <div className="container">
          <div className="fade-up">
            <div className="section-tag">The BaraTrust System</div>
            <h2 className="section-title">The Revenue Loop</h2>
            <p className="section-sub">Every BaraTrust client goes through the same four-step system. Every step feeds the next one. It runs continuously — not just in month one.</p>
          </div>
          <div className="loop-steps fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="loop-step">
              <div className="loop-step-icon">&#x1F3AF;</div>
              <div className="loop-num">01</div>
              <div className="loop-step-title">Get Found</div>
              <div className="loop-step-text">Complete local presence built from the ground up. Website, Google Business Profile, Bing, Apple Maps, directories. Every place a customer looks — you&apos;re there.</div>
            </div>
            <div className="loop-step">
              <div className="loop-step-icon">&#x1F4DE;</div>
              <div className="loop-num">02</div>
              <div className="loop-step-title">Capture Every Lead</div>
              <div className="loop-step-text">When your phone rings we track it. When you miss a call an instant text goes back automatically so they don&apos;t call the next guy on the list.</div>
            </div>
            <div className="loop-step">
              <div className="loop-step-icon">&#x1F4CA;</div>
              <div className="loop-num">03</div>
              <div className="loop-step-title">Prove What Works</div>
              <div className="loop-step-text">Your live BaraTrust dashboard shows exactly what&apos;s happening in real time. Which channels produce calls. Which ads are working. Check it anytime from your phone.</div>
            </div>
            <div className="loop-step">
              <div className="loop-step-icon">&#x1F4B0;</div>
              <div className="loop-num">04</div>
              <div className="loop-step-title">Know What&apos;s Profitable</div>
              <div className="loop-step-text">We tell you which customers are your best ones, which jobs actually made you money, and which ones cost you more than they were worth. That&apos;s not marketing — that&apos;s a business partner.</div>
            </div>
          </div>
        </div>
      </section>

      {/* AGENTS */}
      <section id="agents">
        <div className="container">
          <div className="agents-header fade-up">
            <div className="agents-header-text">
              <div className="section-tag">Your AI Staff</div>
              <h2 className="section-title" style={{ marginBottom: '8px' }}>10 Agents. Working 24/7.<br />While You&apos;re on the Job.</h2>
              <p className="agents-subtext">Type something into any agent below and watch them work. This is what&apos;s running in your business the moment you sign up.</p>
            </div>
          </div>

          <div className="bento-grid fade-up" style={{ animationDelay: '0.1s' }}>
            {/* NOVA — wide featured card */}
            <AgentCard name="nova" emoji="&#x1F31F;" title="Nova" role="Lead Capture & Website Intelligence" desc="Nova handles every website visitor and inbound lead — responding instantly, qualifying prospects, and making sure no opportunity slips through while you're on a job. She's the first voice your customers hear." placeholder="Try: 'Hi I need a quote for a roof repair in New Albany'" wide />
            {/* REX */}
            <AgentCard name="rex" emoji="&#x2B50;" title="Rex" role="Review Manager" desc="Monitors Google and Yelp every 6 hours. Drafts professional responses to every review — good or bad — in your voice." placeholder="Try: '1 star — technician was late and didn't fix the problem'" />
            {/* IRIS */}
            <AgentCard name="iris" emoji="&#x1F504;" title="Iris" role="Follow-Up Sequences" desc="Runs 3-touch follow-up sequences over 7 days. Prospects who didn't book get a second chance automatically — without you lifting a finger." placeholder="Try: 'Customer asked for a quote 3 days ago, no response'" />
            {/* MAX */}
            <AgentCard name="max" emoji="&#x2699;&#xFE0F;" title="Max" role="Back Office Automation" desc="Sends review requests after completed jobs, payment reminders for outstanding invoices, and keeps your back office running while you focus on the work." placeholder="Try: 'Job completed for Johnson residence, invoice unpaid 14 days'" />
            {/* DELLA */}
            <AgentCard name="della" emoji="&#x2709;&#xFE0F;" title="Della" role="Email Secretary" desc="Handles 10 email types — estimates, confirmations, thank-yous, appointment reminders, and more. Professional emails out the door without you typing a word." placeholder="Try: 'Write a thank you email after completing a furnace installation'" />
            {/* SAGE */}
            <AgentCard name="sage" emoji="&#x1F4F1;" title="Sage" role="Social Media Drafting" desc="Turns your completed jobs into social media content. Facebook posts, Google Business updates, Instagram captions — all written and ready to post." placeholder="Try: 'Replaced water heater for family in Louisville, same-day service'" />
            {/* FLYNN */}
            <AgentCard name="flynn" emoji="&#x1F69B;" title="Flynn" role="Fleet & Vehicle Intelligence" desc="Tracks vehicle maintenance schedules, mileage logs for tax purposes, and fuel costs. Makes sure your fleet is always job-ready and your deductions are maximized." placeholder="Try: 'F-250, 87,000 miles, last oil change at 84,500'" />
            {/* COLE */}
            <AgentCard name="cole" emoji="&#x1F4E6;" title="Cole" role="Cost & Inventory Intelligence" desc="Tracks cost of goods, monitors vendor pricing changes, and alerts you when materials are cutting into your margins. Know your real job profitability." placeholder="Try: 'Copper pipe up 18% this month, affects 60% of jobs'" />
            {/* RIVER */}
            <AgentCard name="river" emoji="&#x1F4C5;" title="River" role="Appointments & Reminders" desc="Manages appointment confirmations, sends reminders to both you and the customer, and proactively pings providers when schedules change. No more no-shows." placeholder="Try: 'Appointment tomorrow 9am, customer hasn't confirmed'" />
            {/* BOLT */}
            <AgentCard name="bolt" emoji="&#x26A1;" title="Bolt" role="Restaurant & Retail Intelligence" desc="Specialized intelligence for restaurants and retail businesses. Menu performance, peak hour analysis, seasonal trends, and competitive insights specific to food service and retail." placeholder="Try: 'Slow Tuesday lunches, down 30% vs last year'" />
            {/* BRIX */}
            <AgentCard name="brix" emoji="&#x1F4D0;" title="Brix" role="Bidding Intelligence Agent" desc="Helps contractors build accurate job bids fast and flags problem clients before they waste time on a quote. Asks one question at a time, generates a complete bid breakdown, and tells you what to watch out for." placeholder="Try: 'Need to bid a bathroom remodel, about 150 sq ft, full gut'" />
            {/* SHIELD */}
            <AgentCard name="shield" emoji="&#x1F6E1;&#xFE0F;" title="Shield" role="Small Business Insurance Navigator" desc="Helps local service business owners understand what coverage they actually need, what they can skip, and whether what they have makes sense — in plain English. No jargon, no sales pitch." placeholder="Try: 'I run a 4-person plumbing company, we work in client homes'" />
          </div>

          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <a href="https://nightwatch.baratrust.com" target="_blank" rel="noopener noreferrer" className="btn-secondary">View Full AI Staff Portal →</a>
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
              <div className="timeline-text">Your CallRail tracking number goes live and your dashboard connects. You can see it working before we&apos;ve built a single page. Proof before we start.</div>
            </div>
            <div className="timeline-step">
              <div className="timeline-day">Days 2–7</div>
              <div className="timeline-title">Full Presence Built</div>
              <div className="timeline-text">Website live. Google Business Profile optimized. Bing and Apple Maps claimed. Directories submitted. All 10 AI agents activated. Missed call text-back running.</div>
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

      {/* PROOF */}
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

            {/* HEALTH SCORE */}
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
            <h2 className="section-title">Pick What You Need.</h2>
            <p className="section-sub" style={{ margin: '0 auto 40px' }}>One-time productions. Monthly content. White label. No retainers required.</p>
          </div>

          {/* ONE-TIME PRODUCTIONS */}
          <div className="fade-up" style={{ marginBottom: '60px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--cream)', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)', letterSpacing: '0.02em' }}>One-Time Productions</h3>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>

              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '16px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--cream)' }}>Sizzle Reel</div>
                  <div style={{ fontSize: '13px', color: 'var(--cream-muted)', marginTop: '4px', maxWidth: '500px', lineHeight: 1.6 }}>One 8-second cinematic reel personalized to your business. 48-hour delivery. One revision included.</div>
                </div>
                <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: 'var(--cream)', lineHeight: 1 }}>$199</div>
                  <a href="https://buy.stripe.com/eVqcMY29q4ln9XF1NT5ZC1i" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-block', marginTop: '10px', whiteSpace: 'nowrap' as const }}>Order Now</a>
                </div>
              </div>

              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '16px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--cream)' }}>Social Starter Pack</div>
                  <div style={{ fontSize: '13px', color: 'var(--cream-muted)', marginTop: '4px', maxWidth: '500px', lineHeight: 1.6 }}>Three reels, three different scenes. Cut for Facebook, Instagram, and TikTok. One week delivery.</div>
                </div>
                <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: 'var(--cream)', lineHeight: 1 }}>$399</div>
                  <a href="https://buy.stripe.com/00w7sE9BS2df8TB6495ZC1j" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-block', marginTop: '10px', whiteSpace: 'nowrap' as const }}>Order Now</a>
                </div>
              </div>

              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '16px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--cream)' }}>Full Commercial</div>
                  <div style={{ fontSize: '13px', color: 'var(--cream-muted)', marginTop: '4px', maxWidth: '500px', lineHeight: 1.6 }}>One 30-second commercial from multiple scenes with voiceover, music, lower thirds, business name and phone number. Two weeks delivery.</div>
                </div>
                <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: 'var(--cream)', lineHeight: 1 }}>$599</div>
                  <a href="https://buy.stripe.com/bJecMY29q2df5Hp6495ZC1k" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-block', marginTop: '10px', whiteSpace: 'nowrap' as const }}>Order Now</a>
                </div>
              </div>

              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '16px' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--cream)' }}>Radio Spot</div>
                  <div style={{ fontSize: '13px', color: 'var(--cream-muted)', marginTop: '4px', maxWidth: '500px', lineHeight: 1.6 }}>Radio ad script plus AI voice delivered as MP3.</div>
                </div>
                <div style={{ textAlign: 'right' as const, flexShrink: 0, display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 900, color: 'var(--cream)', lineHeight: 1 }}>$149 <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--cream-muted)' }}>· 30-second</span></div>
                    <a href="https://buy.stripe.com/cNi4gs6pGaJL6Lt6495ZC1l" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-block', marginTop: '8px', whiteSpace: 'nowrap' as const }}>Order 30-Second</a>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 900, color: 'var(--cream)', lineHeight: 1 }}>$198 <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--cream-muted)' }}>· 60-second</span></div>
                    <a href="https://buy.stripe.com/eVq7sE3dubNP7Pxcsx5ZC1m" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-block', marginTop: '8px', whiteSpace: 'nowrap' as const }}>Order 60-Second</a>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--forest)', border: '1px solid var(--sage)', borderRadius: '12px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sage)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '4px' }}>Best Value</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--cream)' }}>Commercial + Radio Bundle</div>
                  <div style={{ fontSize: '13px', color: 'var(--cream-muted)', marginTop: '4px', maxWidth: '500px', lineHeight: 1.6 }}>Full 30-second commercial AND a 30-second radio spot. Everything you need to run in market.</div>
                </div>
                <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: 'var(--cream)', lineHeight: 1 }}>$699</div>
                  <div style={{ fontSize: '11px', color: 'var(--sage)', marginTop: '2px' }}>saves $49 vs. buying separate</div>
                  <a href="https://buy.stripe.com/7sY4gsdS819bfhZfEJ5ZC1n" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-block', marginTop: '10px', whiteSpace: 'nowrap' as const }}>Order Bundle</a>
                </div>
              </div>

            </div>
          </div>

          {/* RECURRING MONTHLY */}
          <div className="fade-up" style={{ animationDelay: '0.1s', marginBottom: '60px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--cream)', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)', letterSpacing: '0.02em' }}>Recurring Monthly</h3>
            <div className="pricing-grid">
              <div className="pricing-card">
                <div className="pricing-tier">Content Subscription</div>
                <div className="pricing-price">$299<span>/mo</span></div>
                <div className="pricing-term">Fresh content delivered every month</div>
                <ul className="pricing-features">
                  <li>Two new reels per month</li>
                  <li>Fresh angles, seasonal content, and promotional spots</li>
                  <li>Content tailored to your business and market</li>
                </ul>
                <div style={{ fontSize: '12px', color: 'var(--sage)', fontWeight: 600, padding: '12px 0', borderTop: '1px solid var(--border)', marginTop: '12px', lineHeight: 1.5 }}>BaraTrust Complete clients receive Content Subscription free for the first 90 days.</div>
                <a href="https://buy.stripe.com/6oU8wI9BS2dfedV9gl5ZC1o" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'block', textAlign: 'center' as const, padding: '14px', marginTop: '4px' }}>Subscribe — $299/mo</a>
              </div>
              <div className="pricing-card">
                <div className="pricing-tier">Social Management Add-On</div>
                <div className="pricing-price">$149<span>/mo</span></div>
                <div className="pricing-term">Add on to any plan</div>
                <ul className="pricing-features">
                  <li>Post and schedule content across Facebook, Instagram, and TikTok</li>
                  <li>Caption writing for every post</li>
                  <li>Monthly one-page performance report</li>
                </ul>
                <a href="https://buy.stripe.com/3cIfZa9BSf017Px9gl5ZC1p" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'block', textAlign: 'center' as const, padding: '14px', marginTop: '16px' }}>Add On — $149/mo</a>
              </div>
            </div>
          </div>

          {/* WHITE LABEL */}
          <div className="fade-up ai-staff-only-wrap" style={{ animationDelay: '0.2s' }}>
            <div className="pricing-card ai-staff-only-card">
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cream-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>White Label</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: 'var(--cream)', lineHeight: 1 }}>$499<span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--cream-muted)' }}>/mo</span></div>
                <div style={{ fontSize: '11px', color: 'var(--cream-muted)', marginTop: '8px', lineHeight: 1.5 }}>License the production workflow under your own brand. You produce. They bill their clients.</div>
                <div style={{ fontSize: '12px', color: 'var(--cream-muted)', marginTop: '8px' }}>Agency Tier · Monthly</div>
              </div>
              <div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: '7px' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'var(--cream-dim)' }}><span style={{ color: 'var(--sage)', fontWeight: 700, flexShrink: 0 }}>&#10003;</span>Full production workflow licensed under your brand</li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'var(--cream-dim)' }}><span style={{ color: 'var(--sage)', fontWeight: 700, flexShrink: 0 }}>&#10003;</span>Produce for your clients, bill at your rates</li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'var(--cream-dim)' }}><span style={{ color: 'var(--sage)', fontWeight: 700, flexShrink: 0 }}>&#10003;</span>White label deliverables — no BaraTrust branding</li>
                </ul>
              </div>
              <div style={{ textAlign: 'right' as const, minWidth: '200px' }}>
                <a href="https://buy.stripe.com/28E28keWc7xzb1JfEJ5ZC1q" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-block', whiteSpace: 'nowrap' as const }}>Get Agency Tier</a>
                <div style={{ fontSize: '11px', color: 'var(--cream-muted)', marginTop: '10px', lineHeight: 1.5 }}>Run your own production<br />business on our workflow.</div>
              </div>
            </div>
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
                <div className="about-stat-num">10</div>
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
            <p>Get a free 20-minute consultation. No pitch. No pressure. Just an honest conversation about what your business needs and whether BaraTrust is the right fit. If it&apos;s not — we&apos;ll tell you that too.</p>
            <div className="close-options">
              <a href="https://calendly.com/tebo1980/baratrust-consultation" target="_blank" rel="noopener noreferrer" className="btn-primary">Book Your Free Consultation</a>
              <a href="tel:5024313285" className="btn-secondary">Call 502-431-3285</a>
            </div>
            <div className="close-contact" style={{ marginBottom: '32px' }}>
              Prefer to text? <a href="sms:5024313285">Text us at 502-431-3285</a>
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
        <div className="footer-text">© 2026 BaraTrust. New Albany, Indiana.</div>
        <div className="footer-links">
          <a href="#about">Our Story</a>
          <a href="/terms">Terms</a>
          <a href="/health-score">Health Score</a>
          <a href="https://nightwatch.baratrust.com" target="_blank" rel="noopener noreferrer">AI Staff Portal</a>
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
        <textarea className="agent-input" id={`input-${name}`} placeholder={placeholder} maxLength={500}></textarea>
        <button className="agent-btn" onClick={() => (window as any).demoAgent(name)} id={`btn-${name}`}>Ask {title} →</button>
        <div className="agent-response" id={`response-${name}`}></div>
      </div>
    </div>
  )
}
