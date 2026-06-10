import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PLANETS, type PlanetData } from './data/planets'
import { randomPlanet } from './data/customPlanet'
// type-only import — erased at runtime, so no store ⇄ i18n module cycle
import type { Locale } from './i18n'

export type DistanceMode = 'compressed' | 'realistic' | 'true'
export type SizeMode = 'balanced' | 'true'

/** first visit speaks the browser's language; persisted once the user picks */
function detectLocale(): Locale {
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es')
    ? 'es'
    : 'en'
}

interface SimState {
  /** simulation speed in Earth days per real second */
  timeScale: number
  /** 1 = forward, -1 = into the past */
  timeDirection: 1 | -1
  paused: boolean
  showOrbits: boolean
  showLabels: boolean
  showBelts: boolean
  /** animated solar surface, flares and prominences */
  showStorms: boolean
  distanceMode: DistanceMode
  sizeMode: SizeMode
  /** multiplier applied to every planet's visual radius */
  planetScale: number
  /** name of the body whose info panel is open */
  selected: string | null
  /** name of the body the camera is tracking */
  following: string | null
  customPlanets: PlanetData[]
  /** monotonic counter so deleted planets never cause name collisions */
  customCounter: number
  /** UI language */
  locale: Locale
  /** touch gesture coach line was dismissed (or outgrown) */
  coachDismissed: boolean
  /** last deleted custom planet, held for the undo window (not persisted) */
  removedPlanet: PlanetData | null
  set: (partial: Partial<SimState>) => void
  addCustomPlanet: () => void
  removeCustomPlanet: (name: string) => void
  restoreRemovedPlanet: () => void
  dismissRemovedPlanet: () => void
}

export const useSim = create<SimState>()(
  persist(
    (set, get) => ({
      timeScale: 1 / 24, // 1 real second = 1 simulated hour
      timeDirection: 1,
      paused: false,
      showOrbits: true,
      showLabels: true,
      showBelts: true,
      showStorms: true,
      distanceMode: 'compressed',
      sizeMode: 'balanced',
      planetScale: 1,
      selected: null,
      following: null,
      customPlanets: [],
      customCounter: 0,
      locale: detectLocale(),
      coachDismissed: false,
      set: (partial) => set(partial),
      addCustomPlanet: () => {
        const planet = randomPlanet(get().customCounter)
        set((s) => ({
          customPlanets: [...s.customPlanets, planet],
          customCounter: s.customCounter + 1,
          selected: planet.name,
        }))
      },
      removedPlanet: null,
      removeCustomPlanet: (name) =>
        set((s) => ({
          customPlanets: s.customPlanets.filter((p) => p.name !== name),
          selected: s.selected === name ? null : s.selected,
          following: s.following === name ? null : s.following,
          removedPlanet: s.customPlanets.find((p) => p.name === name) ?? null,
        })),
      restoreRemovedPlanet: () =>
        set((s) =>
          s.removedPlanet
            ? {
                customPlanets: [...s.customPlanets, s.removedPlanet],
                selected: s.removedPlanet.name,
                removedPlanet: null,
              }
            : {},
        ),
      dismissRemovedPlanet: () => set({ removedPlanet: null }),
    }),
    {
      name: 'solar-system-settings',
      version: 1,
      partialize: (s) => ({
        timeScale: s.timeScale,
        timeDirection: s.timeDirection,
        paused: s.paused,
        showOrbits: s.showOrbits,
        showLabels: s.showLabels,
        showBelts: s.showBelts,
        showStorms: s.showStorms,
        distanceMode: s.distanceMode,
        sizeMode: s.sizeMode,
        planetScale: s.planetScale,
        selected: s.selected,
        following: s.following,
        customPlanets: s.customPlanets,
        customCounter: s.customCounter,
        locale: s.locale,
        coachDismissed: s.coachDismissed,
      }),
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<SimState>) }
        // a saved selection may reference a body that no longer exists
        // (renamed planet, custom planet from an older data shape)
        const names = new Set([
          'Sun',
          ...PLANETS.map((p) => p.name),
          ...PLANETS.flatMap((p) => p.moons?.filter((m) => m.major).map((m) => m.name) ?? []),
          ...merged.customPlanets.map((p) => p.name),
        ])
        if (merged.following && !names.has(merged.following)) merged.following = null
        if (merged.selected && !names.has(merged.selected)) merged.selected = null
        return merged
      },
    },
  ),
)
