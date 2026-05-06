'use client'

import { useState, useEffect } from 'react'

export default function RevenueCalculator() {
  // 1. Manage inputs as "State" instead of searching the DOM
  const [calls, setCalls] = useState(5)
  const [jobValue, setJobValue] = useState(350)
  const [closeRate, setCloseRate] = useState(60)

  // 2. Perform calculations automatically whenever state changes
  const missedYear = calls * 52
  const jobsLost = Math.round(missedYear * (closeRate / 100))
  const totalLost = jobsLost * jobValue
  const monthlyLost = Math.round(totalLost / 12)
  const netRecovery = totalLost - (599 * 12)

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { 
    style: 'currency', currency: 'USD', maximumFractionDigits: 0 
  }).format(n)

  return (
    <div className="calc-card">
      <div className="calc-label">Revenue Intelligence Preview — Live Calculator</div>

      {/* Missed Calls Slider */}
      <div className="slider-row">
        <div className="slider-header">
          <span className="slider-name">Missed calls per week</span>
          <span className="slider-val">{calls}</span>
        </div>
        <div className="slider-track">
          <div className="slider-fill" style={{ width: `${((calls - 1) / 29) * 100}%` }}></div>
          <input 
            type="range" className="slider-input" 
            min={1} max={30} value={calls} 
            onChange={(e) => setCalls(parseInt(e.target.value))} 
          />
        </div>
      </div>

      {/* Job Value Slider */}
      <div className="slider-row">
        <div className="slider-header">
          <span className="slider-name">Average job value</span>
          <span className="slider-val">{fmt(jobValue)}</span>
        </div>
        <div className="slider-track">
          <div className="slider-fill" style={{ width: `${((jobValue - 100) / 1900) * 100}%` }}></div>
          <input 
            type="range" className="slider-input" 
            min={100} max={2000} step={50} value={jobValue}
            onChange={(e) => setJobValue(parseInt(e.target.value))}
          />
        </div>
      </div>

      {/* Close Rate Slider */}
      <div className="slider-row">
        <div className="slider-header">
          <span className="slider-name">Your close rate</span>
          <span className="slider-val">{closeRate}%</span>
        </div>
        <div className="slider-track">
          <div className="slider-fill" style={{ width: `${((closeRate - 10) / 80) * 100}%` }}></div>
          <input 
            type="range" className="slider-input" 
            min={10} max={90} step={5} value={closeRate}
            onChange={(e) => setCloseRate(parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="calc-result">
        <div className="calc-result-label">Annual Revenue Left Behind</div>
        <div className="calc-result-number">{fmt(totalLost)}</div>
        <div className="calc-result-sub">
          That's {missedYear} missed calls × {jobsLost} jobs × {fmt(jobValue)} avg
        </div>
      </div>

      <div className="calc-compare">
        <div className="calc-compare-item">
          <div className="calc-compare-val" style={{ color: 'var(--red-soft)' }}>{fmt(monthlyLost)}</div>
          <div className="calc-compare-key">Per month lost</div>
        </div>
        <div className="calc-compare-item">
          <div className="calc-compare-val" style={{ color: 'var(--cream-muted)' }}>$7,188</div>
          <div className="calc-compare-key">BaraTrust / year</div>
        </div>
        <div className="calc-compare-item">
          <div className="calc-compare-val" style={{ color: 'var(--sage-light)' }}>{fmt(netRecovery > 0 ? netRecovery : 0)}</div>
          <div className="calc-compare-key">Net recovery</div>
        </div>
      </div>

      <button className="calc-cta" onClick={() => window.open('https://calendly.com/tebo1980/baratrust-consultation', '_blank')}>
        Stop Leaving Money Behind — Book Free Call
      </button>
    </div>
  )
}