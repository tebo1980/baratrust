'use client'
import { useEffect } from 'react'

export default function ClientScripts() {
  useEffect(() => {
    // CALCULATOR
    const callsSlider = document.getElementById('calls-slider') as HTMLInputElement
    const jobSlider = document.getElementById('job-slider') as HTMLInputElement
    const closeSlider = document.getElementById('close-slider') as HTMLInputElement

    function fmt(n: number) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
    }

    function updateCalc() {
      if (!callsSlider || !jobSlider || !closeSlider) return

      const calls = +callsSlider.value
      const job = +jobSlider.value
      const close = +closeSlider.value

      const callsVal = document.getElementById('calls-val')
      const jobVal = document.getElementById('job-val')
      const closeVal = document.getElementById('close-val')
      if (callsVal) callsVal.textContent = String(calls)
      if (jobVal) jobVal.textContent = fmt(job)
      if (closeVal) closeVal.textContent = close + '%'

      const callsFill = document.getElementById('calls-fill')
      const jobFill = document.getElementById('job-fill')
      const closeFill = document.getElementById('close-fill')
      if (callsFill) callsFill.style.width = ((calls - 1) / 29 * 100) + '%'
      if (jobFill) jobFill.style.width = ((job - 100) / 1900 * 100) + '%'
      if (closeFill) closeFill.style.width = ((close - 10) / 80 * 100) + '%'

      const missedYear = calls * 52
      const jobsLost = Math.round(missedYear * (close / 100))
      const total = jobsLost * job
      const monthly = Math.round(total / 12)
      const net = total - (599 * 12)

      const calcTotal = document.getElementById('calc-total')
      const calcMonthly = document.getElementById('calc-monthly')
      const calcNet = document.getElementById('calc-net')
      const calcSub = document.getElementById('calc-sub')
      if (calcTotal) calcTotal.textContent = fmt(total)
      if (calcMonthly) calcMonthly.textContent = fmt(monthly)
      if (calcNet) calcNet.textContent = fmt(net > 0 ? net : 0)
      if (calcSub) calcSub.textContent = `That's ${missedYear} missed calls × ${jobsLost} jobs × ${fmt(job)} avg`
    }

    if (callsSlider) callsSlider.addEventListener('input', updateCalc)
    if (jobSlider) jobSlider.addEventListener('input', updateCalc)
    if (closeSlider) closeSlider.addEventListener('input', updateCalc)

    // AGENT DEMOS
    async function demoAgent(agentName: string) {
      const input = document.getElementById(`input-${agentName}`) as HTMLTextAreaElement
      const btn = document.getElementById(`btn-${agentName}`) as HTMLButtonElement
      const resp = document.getElementById(`response-${agentName}`)
      const text = input?.value.trim()

      if (!text) {
        if (input) {
          input.style.borderColor = 'rgba(224,90,90,0.4)'
          setTimeout(() => { input.style.borderColor = '' }, 1500)
        }
        return
      }

      if (btn) {
        btn.disabled = true
        btn.textContent = 'Working...'
      }
      if (resp) {
        resp.className = 'agent-response loading'
        resp.textContent = `${agentName.charAt(0).toUpperCase() + agentName.slice(1)} is thinking...`
      }

      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)

        const res = await fetch('/api/agent-demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent: agentName, input: text }),
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()
        if (resp) {
          resp.className = 'agent-response active'
          resp.textContent = data.response || 'No response received.'
        }
      } catch {
        if (resp) {
          resp.className = 'agent-response active'
          resp.textContent = 'The AI Staff Portal is currently being updated. Please try again in a few minutes or contact Todd directly at 502-431-3285.'
        }
      }

      if (btn) {
        btn.disabled = false
        btn.textContent = `Ask ${agentName.charAt(0).toUpperCase() + agentName.slice(1)} →`
      }
    }

    // Attach to window for onclick handlers
    ;(window as any).demoAgent = demoAgent

    // ENTER KEY in textarea
    document.querySelectorAll('.agent-input').forEach(el => {
      el.addEventListener('keydown', (e: Event) => {
        const ke = e as KeyboardEvent
        if (ke.key === 'Enter' && !ke.shiftKey) {
          ke.preventDefault()
          const agentName = (el as HTMLElement).id.replace('input-', '')
          demoAgent(agentName)
        }
      })
    })

    // FADE IN ON SCROLL
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible')
        }
      })
    }, { threshold: 0.1 })

    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el))

    // FORMSPREE — handle form submission directly via fetch
    const formEl = document.getElementById('contact-form') as HTMLFormElement
    if (formEl) {
      formEl.addEventListener('submit', async (e) => {
        e.preventDefault()

        const submitBtn = formEl.querySelector('[type="submit"]') as HTMLButtonElement
        const successEl = formEl.parentElement?.querySelector('[data-fs-success]') as HTMLElement
        const errorEl = formEl.parentElement?.querySelector('[data-fs-error]') as HTMLElement

        if (submitBtn) {
          submitBtn.disabled = true
          submitBtn.textContent = 'Sending...'
        }

        try {
          const formData = new FormData(formEl)
          const data: Record<string, string> = {}
          formData.forEach((value, key) => { data[key] = value.toString() })

          const res = await fetch('https://formspree.io/f/xzdkqaap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(data),
          })

          if (res.ok) {
            if (successEl) successEl.style.display = 'block'
            if (errorEl) errorEl.style.display = 'none'
            formEl.reset()
          } else {
            const result = await res.json()
            if (errorEl) {
              errorEl.style.display = 'block'
              errorEl.textContent = result.errors?.map((err: { message: string }) => err.message).join(', ') || 'Something went wrong. Please try again.'
            }
          }
        } catch {
          if (errorEl) {
            errorEl.style.display = 'block'
            errorEl.textContent = 'Unable to send message. Please try again or call 502-431-3285.'
          }
        }

        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = 'Send Message →'
        }
      })
    }

    return () => {
      if (callsSlider) callsSlider.removeEventListener('input', updateCalc)
      if (jobSlider) jobSlider.removeEventListener('input', updateCalc)
      if (closeSlider) closeSlider.removeEventListener('input', updateCalc)
      observer.disconnect()
    }
  }, [])

  return null
}
