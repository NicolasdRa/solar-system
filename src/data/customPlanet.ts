import type { MoonData, PlanetData, PlanetKind } from './planets'

const NAMES = [
  'Aurelia', 'Borealis', 'Cygnus X', 'Drakon', 'Elysium',
  'Faunus', 'Gallifrey IV', 'Hyperia', 'Ithaca', 'Janus Prime',
]

const MOON_NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta']

/** Distance beyond which volatiles freeze — gas/ice giants form out here. */
const FROST_LINE_AU = 3.5

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function channel(value: number): string {
  return Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, '0')
}

function rgb(r: number, g: number, b: number): string {
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

/**
 * Palette from equilibrium temperature: scorched worlds are charcoal and
 * lava-toned, temperate ones earthy, cold ones icy blue-white.
 */
function paletteFor(kind: PlanetKind, distanceAU: number): [string, string, string] {
  const jitter = () => rand(-18, 18)
  if (distanceAU < 0.8) {
    return [rgb(60 + jitter(), 45, 40), rgb(140 + jitter(), 90, 55), rgb(220, 160 + jitter(), 90)]
  }
  if (distanceAU < FROST_LINE_AU) {
    return [rgb(90 + jitter(), 70, 50), rgb(150, 110 + jitter(), 75), rgb(205, 175 + jitter(), 135)]
  }
  if (kind === 'gas') {
    return [rgb(150 + jitter(), 115, 80), rgb(200, 170 + jitter(), 125), rgb(235, 220 + jitter(), 190)]
  }
  return [rgb(50, 90 + jitter(), 150), rgb(95, 145 + jitter(), 200), rgb(170, 210 + jitter(), 235)]
}

/**
 * Generates planets that follow the architecture of real systems:
 * rocky worlds inside the frost line, giants beyond it, size and kind
 * correlated, Kepler's third law for the period, and rings/moons that
 * favour massive planets.
 */
export function randomPlanet(index: number): PlanetData {
  // bias outward: most of a disk's area (and its planets) lies far out
  const distanceAU = 0.35 + 45 * Math.pow(Math.random(), 1.6)

  let kind: PlanetKind
  let radiusKm: number
  if (distanceAU < FROST_LINE_AU) {
    kind = 'rocky'
    radiusKm = rand(1800, 8500)
  } else if (Math.random() < 0.45) {
    kind = 'gas'
    radiusKm = rand(45000, 78000)
  } else {
    kind = 'ice'
    radiusKm = rand(14000, 30000)
  }

  // Kepler's third law: P² ∝ a³ (in Earth years and AU)
  const orbitalPeriod = 365.25 * Math.pow(distanceAU, 1.5)

  // massive planets hold onto rings and moons
  const massFactor = radiusKm / 78000
  const ring =
    Math.random() < massFactor * 0.85
      ? { inner: rand(1.4, 1.7), outer: rand(2.0, 2.6), color: paletteFor(kind, distanceAU)[2] }
      : undefined
  const moonCount = Math.min(MOON_NAMES.length, Math.floor(massFactor * rand(2, 7)))
  const name = `${NAMES[index % NAMES.length]}${index >= NAMES.length ? ` ${index}` : ''}`
  const moons: MoonData[] | undefined = moonCount
    ? MOON_NAMES.slice(0, moonCount).map((suffix, i) => ({
        name: `${name} ${suffix}`,
        relRadius: rand(0.08, 0.2),
        distance: 2.2 + i * rand(0.7, 1.1),
        period: rand(1, 4) * Math.pow(2.2 + i, 1.5),
        color: rgb(rand(120, 200), rand(120, 200), rand(120, 200)),
      }))
    : undefined

  const yearsRound = (orbitalPeriod / 365.25).toFixed(1)
  return {
    name,
    kind,
    radiusKm,
    distanceAU: Number(distanceAU.toFixed(2)),
    orbitalPeriod,
    rotationPeriod: kind === 'rocky' ? rand(18, 300) : rand(8, 20),
    axialTilt: Math.random() < 0.08 ? rand(85, 178) : rand(0, 35),
    inclination: rand(0, 6) + (distanceAU > 30 ? rand(0, 12) : 0),
    eccentricity: Math.pow(Math.random(), 2) * 0.22,
    meanLongitudeDeg: rand(0, 360),
    perihelionLongitudeDeg: rand(0, 360),
    palette: paletteFor(kind, distanceAU),
    features: {
      spot: kind === 'gas' && Math.random() < 0.5,
      polarCaps: kind === 'rocky' && distanceAU > 1.2,
    },
    ring,
    moons,
    facts: {
      type: `Custom ${kind === 'gas' ? 'gas giant' : kind === 'ice' ? 'ice giant' : 'rocky planet'}`,
      dayLength: 'unsurveyed',
      yearLength: `${yearsRound} Earth years`,
      temperature: distanceAU < 0.8 ? 'scorching' : distanceAU < FROST_LINE_AU ? 'temperate band' : 'deep cold',
      funFact: 'A world of your own making — discovered just now, by you.',
    },
  }
}
