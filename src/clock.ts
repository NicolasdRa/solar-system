import * as THREE from 'three'

/**
 * Simulation time lives OUTSIDE React state on purpose: it changes every
 * frame, and pushing it through setState would re-render the whole tree
 * 60 times a second. Components read it inside useFrame instead.
 */
/** J2000 epoch: 2000-01-01 12:00 TT, the reference time for orbital elements */
const J2000_MS = Date.UTC(2000, 0, 1, 12)

export const daysSinceJ2000 = (date: Date = new Date()) =>
  (date.getTime() - J2000_MS) / 86_400_000

export const simClock = {
  /**
   * Simulation time in days since J2000. Starting at the real current
   * date means the planets open in their true positions for today.
   */
  days: daysSinceJ2000(),
}

/** Current simulated calendar date, derived from the clock. */
export function simDate(): Date {
  return new Date(J2000_MS + simClock.days * 86_400_000)
}

/**
 * The clock is clamped to years 1–9999: the date input can't represent
 * anything outside, and J2000 orbital elements are fiction that far out.
 */
export const SIM_DAYS_MIN = daysSinceJ2000(new Date('0001-01-01T12:00:00Z'))
export const SIM_DAYS_MAX = daysSinceJ2000(new Date('9999-12-31T12:00:00Z'))

export function clampSimDays(days: number): number {
  return Math.min(SIM_DAYS_MAX, Math.max(SIM_DAYS_MIN, days))
}

declare global {
  interface Window {
    __solar?: Record<string, unknown>
  }
}

/**
 * Live world positions of every body, updated each frame by the Planet
 * components. Used for camera-follow without prop drilling.
 */
export const bodyPositions = new Map<string, THREE.Vector3>()

if (import.meta.env.DEV) {
  window.__solar = { simClock, bodyPositions, simDate }
}
