import { create } from 'zustand'
import type { PlanetData } from './data/planets'
import { randomPlanet } from './data/customPlanet'

export type DistanceMode = 'compressed' | 'realistic' | 'true'
export type SizeMode = 'balanced' | 'true'

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
  set: (partial: Partial<SimState>) => void
  addCustomPlanet: () => void
  removeCustomPlanet: (name: string) => void
}

export const useSim = create<SimState>((set, get) => ({
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
  set: (partial) => set(partial),
  addCustomPlanet: () => {
    const planet = randomPlanet(get().customCounter)
    set((s) => ({
      customPlanets: [...s.customPlanets, planet],
      customCounter: s.customCounter + 1,
      selected: planet.name,
    }))
  },
  removeCustomPlanet: (name) =>
    set((s) => ({
      customPlanets: s.customPlanets.filter((p) => p.name !== name),
      selected: s.selected === name ? null : s.selected,
      following: s.following === name ? null : s.following,
    })),
}))
