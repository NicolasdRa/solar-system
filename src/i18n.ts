import { useSim } from './store'
import { FROST_LINE_AU, type MoonData, type PlanetData } from './data/planets'

export type Locale = 'en' | 'es'
export type BodyFacts = PlanetData['facts']

/**
 * English is the canonical locale: planet facts live in data/planets.ts and
 * `bodyNames` is empty (canonical names pass through). Other locales override
 * both. Parameterised strings are functions so each language owns its own
 * word order and grammar.
 */
const en = {
  code: 'en' as Locale,
  app: {
    title: 'Solar System & Beyond',
    tagline: 'drag to orbit · scroll to zoom · click a body for details',
    coach: 'drag to orbit · pinch to zoom · tap a planet',
    coachDismiss: 'Got it',
  },
  error: {
    title: 'Lost contact with the simulation',
    body: 'The 3D view hit a snag it could not recover from. Re-establishing the link restarts the scene — your settings and discovered planets are safe.',
    details: 'Technical details',
    reload: 'Re-establish link',
  },
  controls: {
    title: 'Mission Control',
    openSheet: 'Controls',
    closeSheet: 'Close',
    language: 'Language',
    today: 'Today',
    dateAria: 'Simulated date — pick one to travel in time',
    timeForwardTitle: 'Time runs forward — click to reverse',
    timeBackwardTitle: 'Time runs backward — click for forward',
    resume: 'Resume',
    pause: 'Pause',
    timeWarp: 'Time warp',
    pausedHint: 'paused — resume to let time flow',
    speedHint: (span: string, forward: boolean) =>
      `1 second here ≈ ${span} ${forward ? 'into the future' : 'into the past'}`,
    planetSize: (factor: string) => `Planet size ×${factor}`,
    orbits: 'Orbits',
    labels: 'Labels',
    belts: 'Belts',
    storms: 'Storms',
    stormsTitle: 'Animated solar surface, flares and prominences',
    scale: 'Scale',
    distances: 'Distances',
    compressed: 'Compressed',
    realistic: 'Realistic',
    toScale: 'To scale',
    toScaleTitle: 'Sun, planets and distances on one true ruler — space gets very empty',
    sizes: 'Sizes',
    balanced: 'Balanced',
    trueRatio: 'True ratio',
    trueRatioTitle:
      "True size ratios; the Sun grows toward its real 109× Earth, capped just inside Mercury's orbit",
    sizesLockedTitle: 'Sizes are always true in To-scale mode',
    bodies: 'Bodies',
    discover: 'Discover a new planet',
    stopFollowing: (name: string) => `Stop following ${name}`,
    overviewTitle: 'Return to the solar system overview',
    credits: 'Planet maps:',
  },
  toast: {
    removed: (name: string) => `${name} left the sky`,
    restore: 'Bring it back',
  },
  units: {
    years: (n: string) => `${n} years`,
    days: (n: string) => `${n} days`,
    hours: (n: string) => `${n} hours`,
    minutes: (n: string) => `${n} minutes`,
    au: 'AU',
    km: 'km',
  },
  info: {
    close: 'Close',
    meanRadius: 'Mean radius',
    distanceFromSun: 'Distance from Sun',
    moonsShown: 'Moons shown',
    dayLength: 'Day length',
    yearLength: 'Year length',
    temperature: 'Temperature',
    moonOf: (parent: string) => `Moon of ${parent}`,
    orbitalPeriod: 'Orbital period',
    retrograde: 'retrograde',
    follow: (name: string) => `Follow ${name}`,
    stopFollowing: 'Stop following',
    remove: (name: string) => `Remove ${name} from the sky`,
  },
  /** facts for generated planets are derived from data — see customFactsFor */
  custom: {
    kind: {
      rocky: 'Custom rocky planet',
      earth: 'Custom rocky planet',
      gas: 'Custom gas giant',
      ice: 'Custom ice giant',
    },
    unsurveyed: 'unsurveyed',
    yearLength: (years: string) => `${years} Earth years`,
    scorching: 'scorching',
    temperate: 'temperate band',
    deepCold: 'deep cold',
    funFact: 'A world of your own making — discovered just now, by you.',
  },
  /** canonical names pass through untranslated */
  bodyNames: {} as Record<string, string>,
  /** overrides for the moon funFacts in data/planets.ts; English is canonical */
  moonFacts: {} as Record<string, string>,
  /** overrides for data/planets.ts facts; English only needs the Sun */
  facts: {
    Sun: {
      type: 'G-type main-sequence star',
      dayLength: '~27 Earth days (at equator)',
      yearLength: '230 million years around the galaxy',
      temperature: '5,505 °C surface · 15M °C core',
      funFact:
        'The Sun holds 99.86% of all mass in the solar system. A million Earths would fit inside it.',
    },
  } as Record<string, BodyFacts>,
}

export type Translation = typeof en

const es: Translation = {
  code: 'es',
  app: {
    title: 'Sistema Solar y Más Allá',
    tagline: 'arrastra para orbitar · rueda para acercar · pulsa un cuerpo para ver detalles',
    coach: 'arrastra para orbitar · pellizca para acercar · toca un planeta',
    coachDismiss: 'Entendido',
  },
  error: {
    title: 'Se perdió el contacto con la simulación',
    body: 'La vista 3D encontró un problema del que no pudo recuperarse. Restablecer el enlace reinicia la escena — tus ajustes y planetas descubiertos están a salvo.',
    details: 'Detalles técnicos',
    reload: 'Restablecer el enlace',
  },
  controls: {
    title: 'Control de Misión',
    openSheet: 'Controles',
    closeSheet: 'Cerrar',
    language: 'Idioma',
    today: 'Hoy',
    dateAria: 'Fecha simulada — elige una para viajar en el tiempo',
    timeForwardTitle: 'El tiempo avanza — pulsa para invertirlo',
    timeBackwardTitle: 'El tiempo retrocede — pulsa para que avance',
    resume: 'Reanudar',
    pause: 'Pausar',
    timeWarp: 'Velocidad del tiempo',
    pausedHint: 'en pausa — reanuda para que el tiempo fluya',
    speedHint: (span, forward) =>
      `1 segundo aquí ≈ ${span} ${forward ? 'hacia el futuro' : 'hacia el pasado'}`,
    planetSize: (factor) => `Tamaño de planetas ×${factor}`,
    orbits: 'Órbitas',
    labels: 'Etiquetas',
    belts: 'Cinturones',
    storms: 'Tormentas',
    stormsTitle: 'Superficie solar animada, fulguraciones y protuberancias',
    scale: 'Escala',
    distances: 'Distancias',
    compressed: 'Comprimidas',
    realistic: 'Realistas',
    toScale: 'A escala',
    toScaleTitle:
      'Sol, planetas y distancias en una sola regla real — el espacio se vuelve muy vacío',
    sizes: 'Tamaños',
    balanced: 'Equilibrados',
    trueRatio: 'Proporción real',
    trueRatioTitle:
      'Proporciones reales; el Sol crece hacia sus verdaderas 109× la Tierra, limitado justo dentro de la órbita de Mercurio',
    sizesLockedTitle: 'En el modo a escala los tamaños siempre son reales',
    bodies: 'Cuerpos',
    discover: 'Descubrir un planeta nuevo',
    stopFollowing: (name) => `Dejar de seguir a ${name}`,
    overviewTitle: 'Volver a la vista general del sistema solar',
    credits: 'Mapas planetarios:',
  },
  toast: {
    removed: (name) => `${name} se fue del cielo`,
    restore: 'Devolverlo al cielo',
  },
  units: {
    years: (n) => `${n} años`,
    days: (n) => `${n} días`,
    hours: (n) => `${n} horas`,
    minutes: (n) => `${n} minutos`,
    au: 'UA',
    km: 'km',
  },
  info: {
    close: 'Cerrar',
    meanRadius: 'Radio medio',
    distanceFromSun: 'Distancia al Sol',
    moonsShown: 'Lunas mostradas',
    dayLength: 'Duración del día',
    yearLength: 'Duración del año',
    temperature: 'Temperatura',
    moonOf: (parent) => `Luna de ${parent}`,
    orbitalPeriod: 'Período orbital',
    retrograde: 'retrógrado',
    follow: (name) => `Seguir a ${name}`,
    stopFollowing: 'Dejar de seguir',
    remove: (name) => `Borrar ${name} del cielo`,
  },
  custom: {
    kind: {
      rocky: 'Planeta rocoso personalizado',
      earth: 'Planeta rocoso personalizado',
      gas: 'Gigante gaseoso personalizado',
      ice: 'Gigante de hielo personalizado',
    },
    unsurveyed: 'sin explorar',
    yearLength: (years) => `${years} años terrestres`,
    scorching: 'abrasador',
    temperate: 'franja templada',
    deepCold: 'frío profundo',
    funFact: 'Un mundo creado por ti — descubierto ahora mismo, por ti.',
  },
  bodyNames: {
    Sun: 'Sol',
    Mercury: 'Mercurio',
    Venus: 'Venus',
    Earth: 'Tierra',
    Mars: 'Marte',
    Jupiter: 'Júpiter',
    Saturn: 'Saturno',
    Uranus: 'Urano',
    Neptune: 'Neptuno',
    Pluto: 'Plutón',
    Moon: 'Luna',
    Phobos: 'Fobos',
    Deimos: 'Deimos',
    Io: 'Ío',
    Europa: 'Europa',
    Ganymede: 'Ganímedes',
    Callisto: 'Calisto',
    Mimas: 'Mimas',
    Enceladus: 'Encélado',
    Tethys: 'Tetis',
    Dione: 'Dione',
    Rhea: 'Rea',
    Titan: 'Titán',
    Iapetus: 'Jápeto',
    Miranda: 'Miranda',
    Ariel: 'Ariel',
    Umbriel: 'Umbriel',
    Titania: 'Titania',
    Oberon: 'Oberón',
    Proteus: 'Proteo',
    Triton: 'Tritón',
    Charon: 'Caronte',
    Styx: 'Estigia',
    Nix: 'Nix',
    Kerberos: 'Cerbero',
    Hydra: 'Hidra',
  },
  moonFacts: {
    Moon: 'La luna más grande en relación con su planeta — nació cuando un mundo del tamaño de Marte chocó contra la joven Tierra. Siempre nos muestra la misma cara.',
    Io: 'El mundo más volcánico del sistema solar — Júpiter amasa su interior como si fuera masa de pan, y cientos de volcanes lanzan azufre a 500 km de altura.',
    Europa: 'Bajo su corteza de hielo agrietado se esconde un océano salado con más agua que todos los mares de la Tierra — uno de los mejores candidatos para encontrar vida.',
    Ganymede: 'La luna más grande del sistema solar — mayor que el planeta Mercurio — y la única que genera su propio campo magnético.',
    Callisto: 'El mundo con más cráteres que se conoce — su antiguo rostro apenas ha cambiado en cuatro mil millones de años.',
    Enceladus: 'Los géiseres de su polo sur lanzan agua de su océano al espacio y alimentan uno de los anillos de Saturno — su nieve fresca lo hace el mundo más reflectante que conocemos.',
    Titan: 'La única luna con una atmósfera densa — bajo su niebla naranja, llueve metano sobre ríos y mares de gas natural líquido.',
    Titania: 'La luna más grande de Urano, surcada por cañones de hasta 1.600 km — y como su planeta, orbita volcada de lado.',
    Triton: 'Orbita al revés — un mundo capturado del cinturón de Kuiper, como Plutón. Sus géiseres de nitrógeno brotan a -235 °C, y algún día Neptuno lo despedazará.',
    Charon: 'La mitad del tamaño del propio Plutón — la pareja baila alrededor de un punto en el espacio entre ambos, mostrándose siempre la misma cara.',
  },
  facts: {
    Sun: {
      type: 'Estrella de tipo G de la secuencia principal',
      dayLength: '~27 días terrestres (en el ecuador)',
      yearLength: '230 millones de años alrededor de la galaxia',
      temperature: '5.505 °C en superficie · 15M °C en el núcleo',
      funFact:
        'El Sol concentra el 99,86 % de toda la masa del sistema solar. En su interior cabría un millón de Tierras.',
    },
    Mercury: {
      type: 'Planeta rocoso',
      dayLength: '59 días terrestres',
      yearLength: '88 días terrestres',
      temperature: '-173 °C a 427 °C',
      funFact:
        'Un día en Mercurio dura dos tercios de su año — y su superficie sufre la mayor oscilación de temperatura del sistema solar.',
    },
    Venus: {
      type: 'Planeta rocoso',
      dayLength: '243 días terrestres (retrógrado)',
      yearLength: '225 días terrestres',
      temperature: '~465 °C',
      funFact:
        'Venus gira al revés, y tan despacio que su día dura más que su año. Su atmósfera de CO₂ lo hace más caliente que Mercurio.',
    },
    Earth: {
      type: 'Planeta rocoso · el mundo natal',
      dayLength: '24 horas',
      yearLength: '365,25 días',
      temperature: '-88 °C a 58 °C',
      funFact:
        'El único lugar del universo donde se ha confirmado la vida — y el único planeta que no lleva nombre de un dios.',
    },
    Mars: {
      type: 'Planeta rocoso',
      dayLength: '24,6 horas',
      yearLength: '687 días terrestres',
      temperature: '-153 °C a 20 °C',
      funFact:
        'Alberga el Monte Olimpo, un volcán casi tres veces más alto que el Everest, y Valles Marineris, un cañón tan largo como el ancho de EE. UU.',
    },
    Jupiter: {
      type: 'Gigante gaseoso',
      dayLength: '9,9 horas',
      yearLength: '11,9 años terrestres',
      temperature: '~-108 °C (cimas de nubes)',
      funFact:
        'Tiene más del doble de masa que todos los demás planetas juntos. La Gran Mancha Roja es una tormenta mayor que la Tierra que ruge desde hace siglos.',
    },
    Saturn: {
      type: 'Gigante gaseoso',
      dayLength: '10,7 horas',
      yearLength: '29,4 años terrestres',
      temperature: '~-139 °C (cimas de nubes)',
      funFact:
        'Sus anillos miden más de 270.000 km de ancho pero en algunos puntos solo ~10 metros de grosor — casi todo hielo de agua. Saturno es menos denso que el agua.',
    },
    Uranus: {
      type: 'Gigante de hielo',
      dayLength: '17,2 horas (retrógrado)',
      yearLength: '84 años terrestres',
      temperature: '~-197 °C',
      funFact:
        'Volcado casi por completo por una colisión antigua, Urano rueda alrededor del Sol — cada polo recibe 42 años de luz diurna.',
    },
    Neptune: {
      type: 'Gigante de hielo',
      dayLength: '16,1 horas',
      yearLength: '165 años terrestres',
      temperature: '~-201 °C',
      funFact:
        'El lugar más ventoso del sistema solar — los vientos supersónicos alcanzan 2.100 km/h. Su luna Tritón orbita al revés y cae lentamente en espiral.',
    },
    Pluto: {
      type: 'Planeta enano (cinturón de Kuiper)',
      dayLength: '6,4 días terrestres (retrógrado)',
      yearLength: '248 años terrestres',
      temperature: '~-229 °C',
      funFact:
        'Su órbita es tan excéntrica que a veces se acerca al Sol más que Neptuno. Caronte es tan grande que ambos orbitan un punto situado entre los dos.',
    },
  },
}

export const TRANSLATIONS: Record<Locale, Translation> = { en, es }

export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
]

/** Reactive hook — re-renders the component when the locale changes. */
export function useT(): Translation {
  return TRANSLATIONS[useSim((s) => s.locale)]
}

/** Display name for any body; canonical (data) names are the fallback. */
export function bodyName(name: string, t: Translation): string {
  return t.bodyNames[name] ?? name
}

export const ONE_DECIMAL: Intl.NumberFormatOptions = {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
}

// Intl.NumberFormat construction is not free and some call sites format on
// every render — cache one instance per locale + options combination
const numberFormats = new Map<string, Intl.NumberFormat>()

/** Locale-aware number formatting: 1.5 / 2,440 in English, 1,5 / 2.440 in Spanish. */
export function fmt(value: number, t: Translation, options?: Intl.NumberFormatOptions): string {
  const key = `${t.code}:${JSON.stringify(options ?? {})}`
  let nf = numberFormats.get(key)
  if (!nf) {
    nf = new Intl.NumberFormat(t.code, options)
    numberFormats.set(key, nf)
  }
  return nf.format(value)
}

/**
 * Facts shown for a known body: locale override first (the Sun, the nine
 * planets in Spanish), then the canonical English facts from the data file.
 */
export function factsFor(name: string, planet: PlanetData | undefined, t: Translation) {
  return t.facts[name] ?? planet?.facts
}

/** Fun fact for a moon: locale override first, then the canonical English one. */
export function moonFactFor(moon: MoonData, t: Translation): string | undefined {
  return t.moonFacts[moon.name] ?? moon.funFact
}

/**
 * Custom planets are generated at runtime, so their stored fact strings are
 * frozen in English inside localStorage. Everything in them is derivable
 * from the planet's physical data, so we rebuild them in the current locale
 * at render time instead of translating stored prose.
 */
export function customFactsFor(planet: PlanetData, t: Translation): BodyFacts {
  return {
    type: t.custom.kind[planet.kind],
    dayLength: t.custom.unsurveyed,
    yearLength: t.custom.yearLength(fmt(planet.orbitalPeriod / 365.25, t, ONE_DECIMAL)),
    temperature:
      planet.distanceAU < 0.8
        ? t.custom.scorching
        : planet.distanceAU < FROST_LINE_AU
          ? t.custom.temperate
          : t.custom.deepCold,
    funFact: t.custom.funFact,
  }
}
