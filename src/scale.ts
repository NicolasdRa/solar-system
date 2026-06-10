import type { DistanceMode, SizeMode } from './store'

const EARTH_RADIUS_KM = 6371
const SUN_RADIUS_KM = 696_340
const KM_PER_AU = 149_597_870

/** Earth's visual radius when sizes are true — the anchor of the true ruler. */
const EARTH_VISUAL_TRUE = 0.45

/** Scene units per AU when distances share the true ruler (≈ 10,568). */
export const TRUE_UNITS_PER_AU = EARTH_VISUAL_TRUE * (KM_PER_AU / EARTH_RADIUS_KM)

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
