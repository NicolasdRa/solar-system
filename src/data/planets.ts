export type PlanetKind = 'rocky' | 'earth' | 'gas' | 'ice'

/** Distance beyond which volatiles freeze — gas/ice giants form out here. */
export const FROST_LINE_AU = 3.5

export interface MoonData {
  name: string
  /** equirectangular texture; procedural color is used when absent */
  textureUrl?: string
  /** visual radius as a fraction of the parent planet's visual radius */
  relRadius: number
  /** real semi-major axis of the orbit, in km (display scaling derives from this) */
  aKm: number
  eccentricity: number
  /** inclination in degrees to the parent's equator (≈ Laplace plane), or to the ecliptic when eclipticFrame */
  inclinationDeg: number
  /**
   * Earth's Moon only: its orbit precesses about the ecliptic pole and keeps
   * ~5° to the ecliptic, so it mounts outside the parent's axial-tilt frame.
   */
  eclipticFrame?: boolean
  /** ascending node longitude at J2000, degrees (0 where inclination is negligible) */
  nodeDeg: number
  /** longitude of periapsis at J2000, degrees (0 where e < 0.01) */
  periapsisDeg: number
  /** mean longitude at J2000, degrees — sets the real phase at any date */
  meanLongitudeDeg: number
  /** sidereal orbital period in Earth days (negative = retrograde) */
  period: number
  color: string
  /** a main moon: selectable, followable, and gets its own info panel */
  major?: boolean
  /** real mean radius in km — shown in the info panel of major moons */
  radiusKm?: number
  /** canonical English fun fact; other locales override via i18n moonFacts */
  funFact?: string
}

export interface AtmosphereData {
  /** glow color right at the limb — linear shader-space RGB, 0..1 */
  limbColor: [number, number, number]
  /** color of the faint outer fringe of the halo */
  fringeColor: [number, number, number]
  /** halo shell radius as a multiple of the planet's visual radius (~1.03 thin air, ~1.10 thick) */
  shell: number
  /** how far the glow wraps past the day/night terminator (0 = sharp cutoff) */
  terminatorBleed: number
  /** overall strength multiplier (1 = Earth-like prominence) */
  intensity: number
}

export interface RingData {
  /** inner/outer radius in multiples of the planet's visual radius */
  inner: number
  outer: number
  color: string
  /** radial ring strip texture; procedural bands are used when absent */
  textureUrl?: string
}

export interface PlanetData {
  name: string
  kind: PlanetKind
  /** real mean radius in km (visual size is derived from this) */
  radiusKm: number
  /** semi-major axis in AU */
  distanceAU: number
  /** orbital period in Earth days */
  orbitalPeriod: number
  /** sidereal rotation period in hours (negative = retrograde) */
  rotationPeriod: number
  /** axial tilt in degrees */
  axialTilt: number
  /** orbital inclination to the ecliptic in degrees */
  inclination: number
  eccentricity: number
  /** J2000 mean longitude in degrees (sets the real starting position) */
  meanLongitudeDeg: number
  /** J2000 longitude of perihelion in degrees */
  perihelionLongitudeDeg: number
  /** equirectangular surface map; the procedural painter is the fallback */
  textureUrl?: string
  /** colors used to paint the procedural texture, dark → light */
  palette: [string, string, string]
  features?: {
    /** Jupiter-style giant storm oval */
    spot?: boolean
    /** white polar ice caps */
    polarCaps?: boolean
  }
  atmosphere?: AtmosphereData
  ring?: RingData
  moons?: MoonData[]
  facts: {
    type: string
    dayLength: string
    yearLength: string
    temperature: string
    funFact: string
  }
}

export const PLANETS: PlanetData[] = [
  {
    name: 'Mercury',
    textureUrl: '/textures/2k_mercury.jpg',
    kind: 'rocky',
    radiusKm: 2440,
    distanceAU: 0.39,
    orbitalPeriod: 88,
    rotationPeriod: 1407.6,
    axialTilt: 0.03,
    inclination: 7,
    eccentricity: 0.206,
    meanLongitudeDeg: 252.25,
    perihelionLongitudeDeg: 77.46,
    palette: ['#5a5248', '#8c8378', '#b3aa9d'],
    facts: {
      type: 'Rocky planet',
      dayLength: '59 Earth days',
      yearLength: '88 Earth days',
      temperature: '-173 °C to 427 °C',
      funFact:
        'A Mercury day is two thirds of its year — and its surface swings through the largest temperature range in the solar system.',
    },
  },
  {
    name: 'Venus',
    textureUrl: '/textures/2k_venus_atmosphere.jpg',
    kind: 'rocky',
    radiusKm: 6052,
    distanceAU: 0.72,
    orbitalPeriod: 224.7,
    rotationPeriod: -5832.5,
    axialTilt: 177.4,
    inclination: 3.4,
    eccentricity: 0.007,
    meanLongitudeDeg: 181.98,
    perihelionLongitudeDeg: 131.53,
    palette: ['#a8722d', '#d9a85c', '#f0d9a8'],
    // 90x Earth's surface pressure: a creamy sulfuric-acid haze whose forward
    // scattering wraps the glow well past the terminator (high bleed)
    atmosphere: {
      limbColor: [1.0, 0.92, 0.72],
      fringeColor: [0.85, 0.55, 0.25],
      shell: 1.08,
      terminatorBleed: 0.65,
      intensity: 1.0,
    },
    facts: {
      type: 'Rocky planet',
      dayLength: '243 Earth days (retrograde)',
      yearLength: '225 Earth days',
      temperature: '~465 °C',
      funFact:
        'Venus spins backwards, and so slowly that its day is longer than its year. Its CO₂ atmosphere makes it hotter than Mercury.',
    },
  },
  {
    name: 'Earth',
    textureUrl: '/textures/2k_earth_daymap.jpg',
    kind: 'earth',
    radiusKm: 6371,
    distanceAU: 1,
    orbitalPeriod: 365.25,
    rotationPeriod: 23.93,
    axialTilt: 23.4,
    inclination: 0,
    eccentricity: 0.017,
    meanLongitudeDeg: 100.46,
    perihelionLongitudeDeg: 102.94,
    palette: ['#11355f', '#2e6ea8', '#3f8f4f'],
    atmosphere: {
      limbColor: [0.45, 0.7, 1.0],
      fringeColor: [0.1, 0.3, 0.85],
      shell: 1.1,
      terminatorBleed: 0.35,
      intensity: 1.0,
    },
    moons: [
      {
        name: 'Moon',
        relRadius: 0.27,
        aKm: 384400, eccentricity: 0.0554, inclinationDeg: 5.16, eclipticFrame: true, nodeDeg: 125.08, periapsisDeg: 83.2, meanLongitudeDeg: 218.5,
        period: 27.3217,
        color: '#b8b4ac',
        textureUrl: '/textures/2k_moon.jpg',
        major: true,
        radiusKm: 1737,
        funFact:
          'The largest moon relative to its planet — born when a Mars-sized world struck the young Earth. It always shows us the same face.',
      },
    ],
    facts: {
      type: 'Rocky planet · the home world',
      dayLength: '24 hours',
      yearLength: '365.25 days',
      temperature: '-88 °C to 58 °C',
      funFact:
        'The only place in the universe confirmed to host life — and the only planet not named after a god.',
    },
  },
  {
    name: 'Mars',
    textureUrl: '/textures/2k_mars.jpg',
    kind: 'rocky',
    radiusKm: 3390,
    distanceAU: 1.52,
    orbitalPeriod: 687,
    rotationPeriod: 24.6,
    axialTilt: 25.2,
    inclination: 1.9,
    eccentricity: 0.093,
    meanLongitudeDeg: 355.45,
    perihelionLongitudeDeg: 336.04,
    palette: ['#7a3520', '#b5552e', '#d98a5e'],
    // <1% of Earth's pressure: a whisper of haze, hugging the limb with a
    // sharp terminator — and blue, since fine dust scatters opposite to air
    atmosphere: {
      limbColor: [0.62, 0.72, 0.88],
      fringeColor: [0.5, 0.5, 0.65],
      shell: 1.035,
      terminatorBleed: 0.12,
      intensity: 0.45,
    },
    features: { polarCaps: true },
    moons: [
      { name: 'Phobos', relRadius: 0.12, aKm: 9375, eccentricity: 0.0151, inclinationDeg: 1.1, nodeDeg: 0, periapsisDeg: 25.5, meanLongitudeDeg: 215.2, period: 0.31891, color: '#8a7f72' },
      { name: 'Deimos', relRadius: 0.09, aKm: 23457, eccentricity: 0.0002, inclinationDeg: 1.8, nodeDeg: 0, periapsisDeg: 0, meanLongitudeDeg: 259.3, period: 1.26244, color: '#9c9184' },
    ],
    facts: {
      type: 'Rocky planet',
      dayLength: '24.6 hours',
      yearLength: '687 Earth days',
      temperature: '-153 °C to 20 °C',
      funFact:
        'Home to Olympus Mons, a volcano nearly three times the height of Everest, and Valles Marineris, a canyon as long as the USA is wide.',
    },
  },
  {
    name: 'Jupiter',
    textureUrl: '/textures/2k_jupiter.jpg',
    kind: 'gas',
    radiusKm: 69911,
    distanceAU: 5.2,
    orbitalPeriod: 4333,
    rotationPeriod: 9.93,
    axialTilt: 3.1,
    inclination: 1.3,
    eccentricity: 0.048,
    meanLongitudeDeg: 34.4,
    perihelionLongitudeDeg: 14.75,
    palette: ['#9c6f4a', '#cda57e', '#ead9bf'],
    features: { spot: true },
    moons: [
      {
        name: 'Io',
        relRadius: 0.12,
        aKm: 421800, eccentricity: 0.0041, inclinationDeg: 0.0, nodeDeg: 0, periapsisDeg: 49.1, meanLongitudeDeg: 20.0,
        period: 1.769138,
        color: '#d9c356',
        major: true,
        radiusKm: 1822,
        funFact:
          'The most volcanic world in the solar system — Jupiter kneads its insides like dough, and hundreds of volcanoes spray sulfur 500 km high.',
      },
      {
        name: 'Europa',
        relRadius: 0.1,
        aKm: 671100, eccentricity: 0.0094, inclinationDeg: 0.5, nodeDeg: 0, periapsisDeg: 229.0, meanLongitudeDeg: 214.4,
        period: 3.551181,
        color: '#c7b9a4',
        major: true,
        radiusKm: 1561,
        funFact:
          'Beneath its cracked ice shell hides a salty ocean with more water than all of Earth’s seas — a top candidate for life beyond Earth.',
      },
      {
        name: 'Ganymede',
        relRadius: 0.17,
        aKm: 1070400, eccentricity: 0.0011, inclinationDeg: 0.2, nodeDeg: 0, periapsisDeg: 0, meanLongitudeDeg: 221.6,
        period: 7.154553,
        color: '#9a8d7c',
        major: true,
        radiusKm: 2634,
        funFact:
          'The largest moon in the solar system — bigger than the planet Mercury — and the only one that generates its own magnetic field.',
      },
      {
        name: 'Callisto',
        relRadius: 0.16,
        aKm: 1882700, eccentricity: 0.0074, inclinationDeg: 0.3, nodeDeg: 0, periapsisDeg: 352.9, meanLongitudeDeg: 80.3,
        period: 16.689017,
        color: '#6f6557',
        major: true,
        radiusKm: 2410,
        funFact:
          'The most heavily cratered world known — its ancient face has barely changed in four billion years.',
      },
    ],
    facts: {
      type: 'Gas giant',
      dayLength: '9.9 hours',
      yearLength: '11.9 Earth years',
      temperature: '~-108 °C (cloud tops)',
      funFact:
        'More than twice as massive as all other planets combined. The Great Red Spot is a storm bigger than Earth that has raged for centuries.',
    },
  },
  {
    name: 'Saturn',
    textureUrl: '/textures/2k_saturn.jpg',
    kind: 'gas',
    radiusKm: 58232,
    distanceAU: 9.58,
    orbitalPeriod: 10759,
    rotationPeriod: 10.7,
    axialTilt: 26.7,
    inclination: 2.5,
    eccentricity: 0.056,
    meanLongitudeDeg: 49.94,
    perihelionLongitudeDeg: 92.43,
    palette: ['#a8895a', '#d6bb8a', '#efe2c2'],
    ring: { inner: 1.4, outer: 2.4, color: '#c9b690', textureUrl: '/textures/2k_saturn_ring_alpha.png' },
    moons: [
      { name: 'Mimas', relRadius: 0.045, aKm: 186000, eccentricity: 0.02, inclinationDeg: 1.6, nodeDeg: 0, periapsisDeg: 226.6, meanLongitudeDeg: 141.9, period: 0.942422, color: '#b5b2ac' },
      {
        name: 'Enceladus',
        relRadius: 0.05,
        aKm: 238400, eccentricity: 0.005, inclinationDeg: 0.0, nodeDeg: 0, periapsisDeg: 0, meanLongitudeDeg: 176.5,
        period: 1.370218,
        color: '#e8eef0',
        major: true,
        radiusKm: 252,
        funFact:
          'Geysers at its south pole blast ocean water into space, feeding one of Saturn’s rings — its fresh snow makes it the most reflective world we know.',
      },
      { name: 'Tethys', relRadius: 0.07, aKm: 295000, eccentricity: 0.001, inclinationDeg: 1.1, nodeDeg: 0, periapsisDeg: 0, meanLongitudeDeg: 248.3, period: 1.887802, color: '#c8c5be' },
      { name: 'Dione', relRadius: 0.07, aKm: 377700, eccentricity: 0.002, inclinationDeg: 0.0, nodeDeg: 0, periapsisDeg: 0, meanLongitudeDeg: 328.0, period: 2.736915, color: '#bdb9b0' },
      { name: 'Rhea', relRadius: 0.09, aKm: 527200, eccentricity: 0.001, inclinationDeg: 0.3, nodeDeg: 0, periapsisDeg: 0, meanLongitudeDeg: 209.5, period: 4.5175, color: '#b0aca3' },
      {
        name: 'Titan',
        relRadius: 0.18,
        aKm: 1221900, eccentricity: 0.029, inclinationDeg: 0.3, nodeDeg: 0, periapsisDeg: 156.9, meanLongitudeDeg: 168.6,
        period: 15.945421,
        color: '#cfa84e',
        major: true,
        radiusKm: 2575,
        funFact:
          'The only moon with a thick atmosphere — under its orange smog, methane rain falls on rivers and seas of liquid natural gas.',
      },
      { name: 'Iapetus', relRadius: 0.085, aKm: 3561700, eccentricity: 0.028, inclinationDeg: 15.5, nodeDeg: 0, periapsisDeg: 341.0, meanLongitudeDeg: 55.8, period: 79.331, color: '#8a7a66' },
    ],
    facts: {
      type: 'Gas giant',
      dayLength: '10.7 hours',
      yearLength: '29.4 Earth years',
      temperature: '~-139 °C (cloud tops)',
      funFact:
        'Its rings are over 270,000 km wide but in places only ~10 metres thick — mostly water ice. Saturn is less dense than water.',
    },
  },
  {
    name: 'Uranus',
    textureUrl: '/textures/2k_uranus.jpg',
    kind: 'ice',
    radiusKm: 25362,
    distanceAU: 19.2,
    orbitalPeriod: 30687,
    rotationPeriod: -17.2,
    axialTilt: 97.8,
    inclination: 0.8,
    eccentricity: 0.046,
    meanLongitudeDeg: 313.23,
    perihelionLongitudeDeg: 170.96,
    palette: ['#3e7f8f', '#6fb3c2', '#b7e0e8'],
    ring: { inner: 1.6, outer: 1.9, color: '#9fc4cc' },
    moons: [
      { name: 'Miranda', relRadius: 0.06, aKm: 129846, eccentricity: 0.001, inclinationDeg: 4.4, nodeDeg: 0, periapsisDeg: 0, meanLongitudeDeg: 328.7, period: 1.413479, color: '#b8bcc4' },
      { name: 'Ariel', relRadius: 0.09, aKm: 190929, eccentricity: 0.001, inclinationDeg: 0.0, nodeDeg: 0, periapsisDeg: 0, meanLongitudeDeg: 203.1, period: 2.520379, color: '#cfd2d6' },
      { name: 'Umbriel', relRadius: 0.09, aKm: 265986, eccentricity: 0.004, inclinationDeg: 0.1, nodeDeg: 0, periapsisDeg: 0, meanLongitudeDeg: 251.2, period: 4.144177, color: '#6e6a66' },
      {
        name: 'Titania',
        relRadius: 0.11,
        aKm: 436298, eccentricity: 0.002, inclinationDeg: 0.1, nodeDeg: 0, periapsisDeg: 0, meanLongitudeDeg: 281.6,
        period: 8.705872,
        color: '#b3a89c',
        major: true,
        radiusKm: 789,
        funFact:
          'Uranus’s largest moon, sliced by canyons up to 1,600 km long — and like its planet, it orbits tipped on its side.',
      },
      { name: 'Oberon', relRadius: 0.11, aKm: 583511, eccentricity: 0.002, inclinationDeg: 0.1, nodeDeg: 0, periapsisDeg: 0, meanLongitudeDeg: 352.6, period: 13.463239, color: '#a39588' },
    ],
    facts: {
      type: 'Ice giant',
      dayLength: '17.2 hours (retrograde)',
      yearLength: '84 Earth years',
      temperature: '~-197 °C',
      funFact:
        'Knocked almost completely onto its side by an ancient collision, Uranus rolls around the Sun — each pole gets 42 years of daylight.',
    },
  },
  {
    name: 'Neptune',
    textureUrl: '/textures/2k_neptune.jpg',
    kind: 'ice',
    radiusKm: 24622,
    distanceAU: 30.1,
    orbitalPeriod: 60190,
    rotationPeriod: 16.1,
    axialTilt: 28.3,
    inclination: 1.8,
    eccentricity: 0.01,
    meanLongitudeDeg: 304.88,
    perihelionLongitudeDeg: 44.97,
    palette: ['#1f3f9e', '#3a64d1', '#7e9ce8'],
    moons: [
      { name: 'Proteus', relRadius: 0.055, aKm: 117600, eccentricity: 0.0, inclinationDeg: 0.0, nodeDeg: 0, periapsisDeg: 0, meanLongitudeDeg: 276.8, period: 1.122315, color: '#8d8a85' },
      {
        name: 'Triton',
        relRadius: 0.11,
        aKm: 354800, eccentricity: 0.0, inclinationDeg: 157.3, nodeDeg: 0, periapsisDeg: 0, meanLongitudeDeg: 241.1,
        period: -5.876854,
        color: '#c4bdb2',
        major: true,
        radiusKm: 1353,
        funFact:
          'Orbits backwards — a captured Kuiper Belt world like Pluto. Its nitrogen geysers erupt at -235 °C, and one day Neptune will tear it apart.',
      },
    ],
    facts: {
      type: 'Ice giant',
      dayLength: '16.1 hours',
      yearLength: '165 Earth years',
      temperature: '~-201 °C',
      funFact:
        'The windiest place in the solar system — supersonic winds reach 2,100 km/h. Its moon Triton orbits backwards and is slowly spiralling inward.',
    },
  },
  {
    name: 'Pluto',
    kind: 'rocky',
    radiusKm: 1188,
    distanceAU: 39.5,
    orbitalPeriod: 90560,
    rotationPeriod: -153.3,
    axialTilt: 122.5,
    inclination: 17.2,
    eccentricity: 0.244,
    meanLongitudeDeg: 238.93,
    perihelionLongitudeDeg: 224.07,
    palette: ['#6e5a4a', '#a3866b', '#d9c4a8'],
    // New Horizons' famous backlit shot: tenuous photochemical smog that
    // glows cold blue and reaches high above the surface for its tiny size
    atmosphere: {
      limbColor: [0.55, 0.7, 1.0],
      fringeColor: [0.25, 0.4, 0.85],
      shell: 1.09,
      terminatorBleed: 0.25,
      intensity: 0.4,
    },
    moons: [
      {
        name: 'Charon',
        relRadius: 0.5,
        aKm: 19600, eccentricity: 0.0, inclinationDeg: 0.0, nodeDeg: 0, periapsisDeg: 0, meanLongitudeDeg: 304.1,
        period: 6.387221,
        color: '#8d8377',
        major: true,
        radiusKm: 606,
        funFact:
          'Half the size of Pluto itself — the pair waltz around a point in the space between them, forever showing each other the same face.',
      },
      { name: 'Styx', relRadius: 0.05, aKm: 43200, eccentricity: 0.025, inclinationDeg: 0.0, nodeDeg: 0, periapsisDeg: 322.5, meanLongitudeDeg: 320.6, period: 20.162, color: '#9a948c' },
      { name: 'Nix', relRadius: 0.06, aKm: 49300, eccentricity: 0.015, inclinationDeg: 0.0, nodeDeg: 0, periapsisDeg: 31.4, meanLongitudeDeg: 9.6, period: 24.855, color: '#b0a99f' },
      { name: 'Kerberos', relRadius: 0.05, aKm: 58300, eccentricity: 0.01, inclinationDeg: 0.4, nodeDeg: 0, periapsisDeg: 346.4, meanLongitudeDeg: 262.5, period: 32.168, color: '#7d776f' },
      { name: 'Hydra', relRadius: 0.06, aKm: 65200, eccentricity: 0.009, inclinationDeg: 0.3, nodeDeg: 0, periapsisDeg: 0, meanLongitudeDeg: 228.6, period: 38.202, color: '#a8a29a' },
    ],
    facts: {
      type: 'Dwarf planet (Kuiper Belt)',
      dayLength: '6.4 Earth days (retrograde)',
      yearLength: '248 Earth years',
      temperature: '~-229 °C',
      funFact:
        'Its orbit is so eccentric it sometimes comes closer to the Sun than Neptune. Charon is so large the pair orbit a point between them.',
    },
  },
]
