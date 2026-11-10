'use client'

import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { trackPublicConversionEvent, type PublicAnalyticsSurface } from '@/lib/analytics'

export const CONTACT_PHONE_DISPLAY = '502-418-2431'
export const CONTACT_PHONE_DIGITS = '5024182431'
export const CONTACT_EMAIL_DISPLAY = 'todd@baratrust.com'
export const BUSINESS_PULSE_STRIPE_URL = 'https://buy.stripe.com/8x2dR2dS8f01gm3akp5ZC1Q'
export const BOOKING_REQUEST_EMAIL_URL = 'mailto:todd@baratrust.com?subject=BaraTrust%20%E2%80%94%20Request%20a%2015-Minute%20Conversation&body=Hi%20BaraTrust%2C%0A%0AI%27d%20like%20to%20arrange%20a%20free%2015-minute%20conversation.%0A%0AMy%20business%3A%20%0APreferred%20days%2Ftimes%3A%20%0A%0AThank%20you.'
export const GOOGLE_CALENDAR_BOOKING_URL =
  process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_BOOKING_URL?.trim() || ''
export const BOOKING_URL = GOOGLE_CALENDAR_BOOKING_URL || BOOKING_REQUEST_EMAIL_URL
export const DEFAULT_BOOKING_LABEL = 'Book a Free 15-Minute Conversation'

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

export function BookingLink({
  surface,
  className,
  style,
  children,
}: LinkProps & { surface: PublicAnalyticsSurface }) {
  const isExternalCalendarUrl = /^https?:\/\//i.test(BOOKING_URL)
  return (
    <a
      href={BOOKING_URL}
      target={isExternalCalendarUrl ? '_blank' : undefined}
      rel={isExternalCalendarUrl ? 'noopener noreferrer' : undefined}
      className={className}
      style={style}
      onClick={() => trackPublicConversionEvent('booking_link_clicked', surface)}
    >
      {children ?? DEFAULT_BOOKING_LABEL}
    </a>
  )
}

export function PulseCheckoutLink({
  surface,
  className,
  style,
  children,
}: LinkProps & { surface: PublicAnalyticsSurface }) {
  return (
    <a
      href={BUSINESS_PULSE_STRIPE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      onClick={() => trackPublicConversionEvent('pulse_checkout_clicked', surface)}
    >
      {children ?? 'Start Business Pulse — $99/month'}
    </a>
  )
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
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
