export const AGENT_COUNT = 12

export const PRICING = {
  foundation: { monthly: 499, twelve: 449, twentyFour: 424 },
  operations: { monthly: 899, twelve: 809, twentyFour: 764 },
  complete:   { monthly: 1499, twelve: 1349, twentyFour: 1274 },
} as const

export const FOUNDATION_MONTHLY = PRICING.foundation.monthly
export const FOUNDATION_ANNUAL = FOUNDATION_MONTHLY * 12

export function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
