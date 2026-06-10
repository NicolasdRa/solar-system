import type { DistanceMode, SizeMode } from './store'
import type { MoonData } from './data/planets'

const EARTH_RADIUS_KM = 6371
const SUN_RADIUS_KM = 696_340
const KM_PER_AU = 149_597_870

/** Earth's visual radius when sizes are true — the anchor of the true ruler. */
const EARTH_VISUAL_TRUE = 0.45

/** Scene units per AU when distances share the true ruler (≈ 10,568). */
export const TRUE_UNITS_PER_AU = EARTH_VISUAL_TRUE * (KM_PER_AU / EARTH_RADIUS_KM)

/** Default camera vantage point for each distance mode. */
export const OVERVIEWS: Record<DistanceMode, [number, number, number]> = {
  compressed: [0, 70, 150],
  realistic: [0, 200, 430],
  // far enough out to take in Neptune's orbit (~30 AU on the true ruler)
  true: [0, 16 * TRUE_UNITS_PER_AU, 36 * TRUE_UNITS_PER_AU],
}

/**
 * Convert a semi-major axis in AU to scene units.
 *
 * 'compressed' uses a power curve so inner and outer planets are both
 * visible in one view. 'realistic' is linear in AU. 'true' puts distances
 * on the same ruler as true planet sizes — 1 AU ≈ 23,500 Earth radii, so
 * space becomes as empty as it really is.
 */
export function scaleDistance(aAU: number, mode: DistanceMode): number {
  switch (mode) {
    case 'compressed':
      return 16 * Math.pow(aAU, 0.6)
    case 'realistic':
      return 14 * aAU
    case 'true':
      return TRUE_UNITS_PER_AU * aAU
  }
}

/** Smallest moon mesh radius, in scene units — keeps pebbles like Phobos visible. */
export const MOON_MIN_RADIUS = 0.07

/**
 * OrbitControls' zoom-in stop at overview range (no body followed): true
 * rulers shrink the planets, so the camera must be allowed much closer.
 * While a body IS followed, CameraRig overrides this with a limit derived
 * from that body's actual size, so even an 11 km Phobos can fill the view.
 */
export function restingMinDistance(distanceMode: DistanceMode, sizeMode: SizeMode): number {
  return distanceMode === 'true' || sizeMode === 'true' ? 0.2 : 4
}

/**
 * Mesh radius for a moon — the single source of truth shared by the moon
 * mesh, the camera rig's follow framing and the orbit clamp. Balanced
 * sizes use the authored display fraction (relRadius compensates for the
 * square-root compression of large parents). True rulers recompute from
 * the real radii so size ratios are exact, with NO visibility floor —
 * Phobos genuinely is a sub-pixel speck from Mars-overview distance, the
 * way NASA's Eyes or Celestia draw it. It stays reachable through the
 * info-panel links and its orbit line, and the camera rig's adaptive near
 * plane lets a follow or deep zoom fill the screen with it. relRadius is
 * the fallback for moons of generated planets, which carry no real radius.
 */
export function moonVisualRadius(
  moon: MoonData,
  parent: { radiusKm: number },
  distanceMode: DistanceMode,
  sizeMode: SizeMode,
  planetScale: number,
): number {
  const parentRadius = visualRadius(parent.radiusKm, sizeMode, distanceMode) * planetScale
  if (sizeMode === 'true' || distanceMode === 'true') {
    const rel = moon.radiusKm ? moon.radiusKm / parent.radiusKm : moon.relRadius
    return parentRadius * rel
  }
  return Math.max(parentRadius * moon.relRadius, MOON_MIN_RADIUS)
}

/**
 * Convert a real radius in km to a visual radius in scene units.
 *
 * 'balanced' uses square-root compression: Jupiter stays clearly bigger
 * than Mercury without dwarfing it into invisibility. 'true' is linear
 * in km, so size ratios are exact. The 'true' distance mode forces true
 * sizes — mixing rulers there would defeat its purpose.
 */
export function visualRadius(
  radiusKm: number,
  sizeMode: SizeMode,
  distanceMode: DistanceMode,
): number {
  if (sizeMode === 'true' || distanceMode === 'true') {
    return Math.max(EARTH_VISUAL_TRUE * (radiusKm / EARTH_RADIUS_KM), 0.06)
  }
  return 1.15 * Math.sqrt(radiusKm / EARTH_RADIUS_KM)
}

/**
 * Display semi-major axis for a moon's orbit, in scene units.
 *
 * 'true' distances use the real ruler — aKm converted exactly like planet
 * radii, so the Moon really sits 60 Earth radii out and space gets empty.
 * Other modes use Kepler-consistent compression: within each system,
 * a_display ∝ |T|^(2/3), anchored so the innermost moon orbits at 2.2
 * parent radii. Displayed spacing then obeys Kepler's third law, keeping
 * period and distance dynamically consistent at every zoom level.
 */
export function moonOrbitRadius(
  moon: MoonData,
  parent: { radiusKm: number; moons?: MoonData[] },
  distanceMode: DistanceMode,
  sizeMode: SizeMode,
  planetScale: number,
): number {
  const parentRadius = visualRadius(parent.radiusKm, sizeMode, distanceMode) * planetScale
  const moonRadius = moonVisualRadius(moon, parent, distanceMode, sizeMode, planetScale)
  let a: number
  if (distanceMode === 'true') {
    a = moon.aKm * (EARTH_VISUAL_TRUE / EARTH_RADIUS_KM)
  } else {
    const tMin = Math.min(...(parent.moons ?? [moon]).map((m) => Math.abs(m.period)))
    a = 2.2 * parentRadius * Math.pow(Math.abs(moon.period) / tMin, 2 / 3)
  }
  // the planet-size slider must never swallow a tight true orbit (Phobos
  // sits at only 2.76 real Mars radii)
  return Math.max(a, parentRadius * 1.5 + moonRadius)
}

/**
 * The Sun's visual radius.
 *
 * - 'true' distance mode: the real thing, ~109× a true-size Earth.
 * - true sizes under compressed/realistic distances: scaled toward the
 *   real ratio but capped at 70% of Mercury's orbital radius — without
 *   the cap the photosphere would swallow the inner planets, because
 *   Mercury really orbits at only ~84 solar radii.
 * - balanced sizes: a fixed display size.
 */
export function sunRadius(distanceMode: DistanceMode, sizeMode: SizeMode): number {
  const trueSun = EARTH_VISUAL_TRUE * (SUN_RADIUS_KM / EARTH_RADIUS_KM)
  if (distanceMode === 'true') return trueSun
  if (sizeMode === 'true') {
    return Math.min(trueSun, 0.7 * scaleDistance(0.387, distanceMode))
  }
  return distanceMode === 'compressed' ? 5.5 : 3.5
}
