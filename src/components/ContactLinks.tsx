'use client'

import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'

export const CONTACT_PHONE_DISPLAY = '502-418-2431'
export const CONTACT_PHONE_DIGITS = '5024182431'
export const CONTACT_EMAIL_DISPLAY = 'todd@baratrust.com'

const GMAIL_TARGET = 'tebo1980@gmail.com'
const GMAIL_COMPOSE_URL = `https://mail.google.com/mail/?view=cm&to=${GMAIL_TARGET}`

function isMobileDevice() {
  if (typeof navigator === 'undefined') return false
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
}

type LinkProps = {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export function EmailLink({ className, style, children }: LinkProps) {
  return (
    <a
      href={GMAIL_COMPOSE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
    >
      {children ?? CONTACT_EMAIL_DISPLAY}
    </a>
  )
}

function ContactModal({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,15,26,0.78)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 9999,
        animation: 'baratrust-modal-fade 160ms ease-out',
      }}
    >
      <style>{`
        @keyframes baratrust-modal-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes baratrust-modal-rise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card, #111D2C)',
          border: '1px solid var(--border-accent, rgba(59,127,212,0.25))',
          borderRadius: '16px',
          padding: '28px 28px 24px',
          maxWidth: '380px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
          textAlign: 'center',
          fontFamily: 'var(--font-body)',
          color: 'var(--cream, #F0EBE0)',
          animation: 'baratrust-modal-rise 200ms ease-out',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--blue-light, #5B9FE4)',
            marginBottom: '12px',
          }}
        >
          BaraTrust
        </div>
        <div style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--cream-dim, #B8B0A4)', marginBottom: '22px' }}>
          {message}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'var(--blue, #3B7FD4)',
            color: 'var(--cream, #F0EBE0)',
            border: 'none',
            borderRadius: '10px',
            padding: '11px 24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.02em',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}

function MobileGatedLink({
  scheme,
  desktopMessage,
  className,
  style,
  children,
}: {
  scheme: 'tel' | 'sms'
  desktopMessage: string
} & LinkProps) {
  const [showModal, setShowModal] = useState(false)
  const href = `${scheme}:${CONTACT_PHONE_DIGITS}`

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (isMobileDevice()) {
      e.preventDefault()
      window.location.href = href
      return
    }
    e.preventDefault()
    setShowModal(true)
  }

  return (
    <>
      <a href={href} onClick={handleClick} className={className} style={style}>
        {children ?? CONTACT_PHONE_DISPLAY}
      </a>
      {showModal && <ContactModal message={desktopMessage} onClose={() => setShowModal(false)} />}
    </>
  )
}

export function PhoneLink({ className, style, children }: LinkProps) {
  return (
    <MobileGatedLink
      scheme="tel"
      desktopMessage={`Phone calls are available on mobile devices. Call us at ${CONTACT_PHONE_DISPLAY}.`}
      className={className}
      style={style}
    >
      {children}
    </MobileGatedLink>
  )
}

export function SmsLink({ className, style, children }: LinkProps) {
  return (
    <MobileGatedLink
      scheme="sms"
      desktopMessage={`Text messages are available on mobile devices. Text us at ${CONTACT_PHONE_DISPLAY}.`}
      className={className}
      style={style}
    >
      {children}
    </MobileGatedLink>
  )
}
