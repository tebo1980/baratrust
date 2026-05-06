import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

export type ContractorStatus = 'Sent' | 'Replied' | 'Signed' | 'Cold' | 'Warm'
export type StyleVariant = 'classic' | 'modern' | 'bold'

export interface ContractorConfig {
  slug: string
  generatedAt: string
  lastTouched: string
  status: ContractorStatus
  notes?: string
  indexable?: boolean
  validUntilDays?: number
  business: {
    name: string
    tagline: string
    phone: string
    email: string
    yearEstablished: number
    licenseNumber?: string
    insured: boolean
  }
  location: {
    city: string
    state: string
    serviceAreas: string[]
    primaryGoogleSearchTerm: string
  }
  services: { name: string; description: string; icon: string }[]
  reviews: {
    author: string
    rating: number
    text: string
    source: 'Google' | 'Facebook' | 'Yelp'
    date: string
  }[]
  about: {
    ownerName: string
    yearsExperience: number
    story: string
  }
  branding: {
    primaryColor: string
    accentColor: string
    style: StyleVariant
  }
  callToAction: {
    primaryButtonText: string
    secondaryButtonText: string
  }
}

const CONFIGS_DIR = join(process.cwd(), 'configs')
const DEFAULT_VALID_DAYS = 60

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

export function isValidHex(s: string): boolean {
  return HEX_RE.test(s)
}

function isContractorConfig(o: unknown): o is ContractorConfig {
  if (!o || typeof o !== 'object') return false
  const c = o as Partial<ContractorConfig>
  return Boolean(
    typeof c.slug === 'string' &&
    typeof c.status === 'string' &&
    c.business && typeof c.business === 'object' &&
    c.location && Array.isArray(c.location.serviceAreas) &&
    Array.isArray(c.services) &&
    Array.isArray(c.reviews) &&
    c.branding && typeof c.branding === 'object' &&
    isValidHex(c.branding.primaryColor) &&
    isValidHex(c.branding.accentColor),
  )
}

async function listConfigFiles(): Promise<string[]> {
  try {
    const entries = await readdir(CONFIGS_DIR)
    return entries.filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }
}

export async function getAllContractorConfigs(): Promise<ContractorConfig[]> {
  const files = await listConfigFiles()
  const configs: ContractorConfig[] = []
  for (const file of files) {
    try {
      const raw = await readFile(join(CONFIGS_DIR, file), 'utf8')
      const parsed = JSON.parse(raw)
      if (isContractorConfig(parsed)) {
        configs.push(parsed)
      } else {
        console.warn(`[contractors] skipping malformed config: ${file}`)
      }
    } catch (err) {
      console.warn(`[contractors] failed to read ${file}:`, err)
    }
  }
  return configs
}

export async function getAllContractorSlugs(): Promise<string[]> {
  const configs = await getAllContractorConfigs()
  return configs.map((c) => c.slug)
}

export async function getContractorConfig(slug: string): Promise<ContractorConfig | null> {
  const configs = await getAllContractorConfigs()
  return configs.find((c) => c.slug === slug) ?? null
}

export function isExpired(config: ContractorConfig): boolean {
  if (config.status !== 'Cold') return false
  const days = config.validUntilDays ?? DEFAULT_VALID_DAYS
  const generated = Date.parse(config.generatedAt)
  if (Number.isNaN(generated)) return false
  const ageDays = (Date.now() - generated) / (1000 * 60 * 60 * 24)
  return ageDays > days
}

export function statusOrder(s: ContractorStatus): number {
  return { Replied: 0, Warm: 1, Sent: 2, Signed: 3, Cold: 4 }[s]
}
