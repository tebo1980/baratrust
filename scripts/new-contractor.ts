/* eslint-disable no-console */
/**
 * Interactive CLI to scaffold a contractor preview config.
 *
 * Run:
 *   npx tsx scripts/new-contractor.ts
 *
 * Output:
 *   configs/<business-slug>-<random4>.json
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { createInterface } from 'readline/promises'
import { stdin as input, stdout as output } from 'process'

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

const STYLE_DEFAULTS = {
  classic:     { primary: '#1B2D4F', accent: '#C9A84C' },
  modern:      { primary: '#0F8C8C', accent: '#E27431' },
  bold:        { primary: '#C0392B', accent: '#1A1A1A' },
} as const

const PRESET_TRADES: Record<string, { services: { name: string; description: string; icon: string }[]; style: keyof typeof STYLE_DEFAULTS }> = {
  roofing: {
    style: 'classic',
    services: [
      { name: 'Roof Replacement', description: 'Full tear-off and re-roof. Asphalt, metal, and architectural shingles. Manufacturer-backed warranties.', icon: '🏠' },
      { name: 'Storm Damage Repair', description: 'Same-week response for hail, wind, and tree damage. We handle the insurance paperwork.', icon: '⛈️' },
      { name: 'Roof Inspections', description: 'Honest, no-pressure inspections. Photos, written report, and a clear path forward — even if that path is "you don\'t need a new roof yet."', icon: '🔍' },
    ],
  },
  hvac: {
    style: 'modern',
    services: [
      { name: 'AC Repair & Install', description: 'Same-day diagnostics. Honest pricing. We fix what we can and only replace what truly needs replacing.', icon: '❄️' },
      { name: 'Heating Systems', description: 'Furnace and heat pump service, repair, and installation. Local techs you can actually reach.', icon: '🔥' },
      { name: 'Maintenance Plans', description: 'Two visits a year, priority scheduling, and 15% off any repairs. The cheapest insurance you\'ll ever buy.', icon: '🛠️' },
    ],
  },
  landscaping: {
    style: 'bold',
    services: [
      { name: 'Lawn Care', description: 'Weekly mowing, edging, and cleanup. Show up, look good, leave it better than we found it.', icon: '🌱' },
      { name: 'Hardscaping', description: 'Patios, retaining walls, fire pits, and walkways. Built to last decades, not seasons.', icon: '🧱' },
      { name: 'Tree & Shrub Service', description: 'Pruning, removal, and stump grinding. Insured climbers, clean cleanup.', icon: '🌳' },
    ],
  },
}

async function main() {
  const rl = createInterface({ input, output })
  const ask = async (q: string, def?: string): Promise<string> => {
    const suffix = def !== undefined ? ` [${def}]` : ''
    const a = (await rl.question(`${q}${suffix}: `)).trim()
    return a || def || ''
  }
  const askRequired = async (q: string): Promise<string> => {
    while (true) {
      const a = (await rl.question(`${q}: `)).trim()
      if (a) return a
      console.log('  (required)')
    }
  }
  const askYesNo = async (q: string, def: boolean): Promise<boolean> => {
    const a = (await rl.question(`${q} [${def ? 'Y/n' : 'y/N'}]: `)).trim().toLowerCase()
    if (!a) return def
    return a === 'y' || a === 'yes'
  }
  const askHex = async (q: string, def: string): Promise<string> => {
    while (true) {
      const a = (await rl.question(`${q} [${def}]: `)).trim() || def
      if (HEX_RE.test(a)) return a
      console.log(`  Invalid hex color. Use #RRGGBB (e.g. ${def}).`)
    }
  }
  const askStyle = async (def: keyof typeof STYLE_DEFAULTS): Promise<keyof typeof STYLE_DEFAULTS> => {
    while (true) {
      const a = ((await rl.question(`Style — classic / modern / bold [${def}]: `)).trim() || def).toLowerCase()
      if (a === 'classic' || a === 'modern' || a === 'bold') return a
      console.log('  Choose one of: classic, modern, bold')
    }
  }

  console.log('\n— New BaraTrust contractor preview —\n')

  const businessName = await askRequired('Business name')
  const baseSlug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const suffix = randomBytes(2).toString('hex')
  const slug = `${baseSlug}-${suffix}`
  console.log(`  → Slug: ${slug}\n`)

  const phone = await askRequired('Phone (e.g. (502) 555-0123)')
  const email = await askRequired('Email')
  const yearEstablished = parseInt((await askRequired('Year established (e.g. 2008)')) || '0', 10)
  const licenseNumber = await ask('License number (optional)')
  const insured = await askYesNo('Insured?', true)

  const city = await askRequired('Primary city')
  const state = (await askRequired('State (e.g. KY)')).toUpperCase().slice(0, 2)
  const serviceAreasRaw = await askRequired('Service areas (comma-separated, e.g. "Louisville, St. Matthews, Anchorage")')
  const serviceAreas = serviceAreasRaw.split(',').map((s) => s.trim()).filter(Boolean)
  const primaryGoogleSearchTerm = await ask('Primary Google search term', `${baseSlug.split('-')[0]} ${city}`)

  const tradeKey = (await ask('Trade preset — roofing / hvac / landscaping (or blank for custom)')).toLowerCase()
  const preset = PRESET_TRADES[tradeKey]
  let services = preset?.services
  if (!services) {
    services = []
    const count = Math.max(1, parseInt(await ask('How many services?', '3'), 10) || 3)
    for (let i = 0; i < count; i++) {
      console.log(`\n  Service ${i + 1}:`)
      const name = await askRequired('  Name')
      const description = await askRequired('  Description (1–2 sentences)')
      const icon = (await ask('  Icon (emoji)', '🔧')) || '🔧'
      services.push({ name, description, icon })
    }
  }

  console.log('\n  Reviews — paste 2–3 real Google review snippets. Press enter on a blank author line to stop.\n')
  const reviews: { author: string; rating: number; text: string; source: 'Google' | 'Facebook' | 'Yelp'; date: string }[] = []
  while (true) {
    const author = (await rl.question(`  Review ${reviews.length + 1} — author (blank to stop): `)).trim()
    if (!author) break
    const rating = Math.max(1, Math.min(5, parseInt((await ask('  Rating (1–5)', '5')) || '5', 10) || 5))
    const text = await askRequired('  Review text')
    const sourceRaw = ((await ask('  Source — Google / Facebook / Yelp', 'Google')) || 'Google').toLowerCase()
    const source: 'Google' | 'Facebook' | 'Yelp' =
      sourceRaw.startsWith('f') ? 'Facebook' : sourceRaw.startsWith('y') ? 'Yelp' : 'Google'
    const date = await ask('  Date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10))
    const consent = await askYesNo('  ✓ Confirm Todd has permission to display this review on a third-party preview site?', false)
    if (!consent) {
      console.log('  Skipping review (no consent confirmed).\n')
      continue
    }
    reviews.push({ author, rating, text, source, date })
  }

  console.log('')
  const ownerName = await askRequired('Owner full name')
  const yearsExperience = parseInt((await ask('Owner years of experience', String(new Date().getFullYear() - yearEstablished))) || '0', 10)
  const story = await askRequired('Owner story (2–4 sentences in their voice)')

  const style = await askStyle((preset?.style as keyof typeof STYLE_DEFAULTS) ?? 'modern')
  const defaults = STYLE_DEFAULTS[style]
  const primaryColor = await askHex('Primary color', defaults.primary)
  const accentColor = await askHex('Accent color', defaults.accent)

  const primaryButtonText = await ask('Primary button text', 'Call Now')
  const secondaryButtonText = await ask('Secondary button text', 'Get a Free Estimate')

  const taglineDefault = `${city}'s trusted ${services[0]?.name?.toLowerCase() ?? 'local'} pros since ${yearEstablished}`
  const tagline = await ask('Tagline', taglineDefault)

  rl.close()

  const now = new Date().toISOString()
  const config = {
    slug,
    generatedAt: now,
    lastTouched: now,
    status: 'Sent' as const,
    notes: '',
    indexable: false,
    validUntilDays: 60,
    business: {
      name: businessName,
      tagline,
      phone,
      email,
      yearEstablished,
      ...(licenseNumber ? { licenseNumber } : {}),
      insured,
    },
    location: {
      city,
      state,
      serviceAreas,
      primaryGoogleSearchTerm,
    },
    services,
    reviews,
    about: {
      ownerName,
      yearsExperience,
      story,
    },
    branding: {
      primaryColor,
      accentColor,
      style,
    },
    callToAction: {
      primaryButtonText,
      secondaryButtonText,
    },
  }

  const dir = join(process.cwd(), 'configs')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const file = join(dir, `${slug}.json`)
  if (existsSync(file)) {
    console.error(`\n✗ ${file} already exists. Aborting to avoid overwrite.`)
    process.exit(1)
  }
  writeFileSync(file, JSON.stringify(config, null, 2) + '\n', 'utf8')

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✓ Wrote configs/${slug}.json`)
  console.log('')
  console.log(`Preview URL (after deploy): https://baratrust.com/preview/${slug}`)
  console.log(`Local preview:              http://localhost:3000/preview/${slug}`)
  console.log('')
  console.log('NEXT STEPS:')
  console.log('  1. Run `npm run dev` and open the local preview URL above.')
  console.log('  2. ⚠️  Test on mobile (Chrome DevTools or a real phone) before sending.')
  console.log('     Contractors view previews on phones from job sites — broken mobile = lost deal.')
  console.log('  3. Commit and push to deploy.')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
