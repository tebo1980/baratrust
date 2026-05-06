/**
 * Pick a readable foreground color (white or near-black) for a given hex background.
 * Uses WCAG-style relative luminance.
 */
export function contrastTextColor(hex: string): string {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex)
  if (!m) return '#FFFFFF'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff

  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  return luminance > 0.55 ? '#111111' : '#FFFFFF'
}
