import { Playfair_Display, Inter, Bebas_Neue } from 'next/font/google'
import type { StyleVariant } from '@/lib/contractors'

// Subset weights aggressively — keeps total font payload ~50KB across all three.
export const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display-classic',
})

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '800'],
  display: 'swap',
  variable: '--font-display-modern',
})

export const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-display-bold',
})

export interface StyleTokens {
  /** CSS variable name to use for headings (`var(--font-display-...)`). */
  headingFontVar: string
  /** Body font keeps it neutral system-ish for all variants. */
  bodyFontFamily: string
  /** Heading transform — bold variant uses uppercase. */
  headingTextTransform: 'none' | 'uppercase'
  /** Heading letter-spacing. */
  headingLetterSpacing: string
  /** Default radius for cards and buttons. */
  radius: string
  /** Default heading weight. */
  headingWeight: number
  /** Section vertical padding. */
  sectionPaddingY: string
}

export const STYLE_TOKENS: Record<StyleVariant, StyleTokens> = {
  classic: {
    headingFontVar: 'var(--font-display-classic)',
    bodyFontFamily:
      "'Source Sans Pro', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    headingTextTransform: 'none',
    headingLetterSpacing: '-0.01em',
    radius: '6px',
    headingWeight: 700,
    sectionPaddingY: '88px',
  },
  modern: {
    headingFontVar: 'var(--font-display-modern)',
    bodyFontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    headingTextTransform: 'none',
    headingLetterSpacing: '-0.02em',
    radius: '14px',
    headingWeight: 800,
    sectionPaddingY: '96px',
  },
  bold: {
    headingFontVar: 'var(--font-display-bold)',
    bodyFontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    headingTextTransform: 'uppercase',
    headingLetterSpacing: '0.04em',
    radius: '0px',
    headingWeight: 400,
    sectionPaddingY: '80px',
  },
}

/** Returns the className string with all three font variables, so headings can pick via CSS var. */
export const fontClassName = `${playfair.variable} ${inter.variable} ${bebas.variable}`
