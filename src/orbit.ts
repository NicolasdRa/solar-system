import * as THREE from 'three'

const TWO_PI = Math.PI * 2

/** Wrap an angle into [-π, π] — keeps the Kepler solver in its sweet spot. */
function wrapAngle(angle: number): number {
  const wrapped = angle % TWO_PI
  if (wrapped > Math.PI) return wrapped - TWO_PI
  if (wrapped < -Math.PI) return wrapped + TWO_PI
  return wrapped
}

/**
 * Solve Kepler's equation M = E − e·sinE for the eccentric anomaly E
 * using Newton–Raphson with the standard E₀ = M + e·sinM seed. The
 * input is normalized to [-π, π] so convergence holds for any epoch —
 * millions of days forward or backward — and any e < 1.
 */
export function solveKepler(meanAnomaly: number, e: number): number {
  const M = wrapAngle(meanAnomaly)
  let E = M + e * Math.sin(M)
  for (let i = 0; i < 12; i++) {
    const delta = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= delta
    if (Math.abs(delta) < 1e-9) break
  }
  return E
}

export interface OrbitElements {
  /** semi-major axis in scene units */
  a: number
  eccentricity: number
  /** mean longitude at epoch (J2000), radians */
  meanLongitude: number
  /** longitude of perihelion, radians */
  perihelionLongitude: number
  /** orbital period in days */
  period: number
}

/**
 * True Keplerian position at `days` after J2000, in the orbital plane.
 * Unlike uniform circular motion, this sweeps faster near perihelion —
 * visibly so for Mercury and Pluto.
 */
export function keplerPosition(el: OrbitElements, days: number, out: THREE.Vector3): THREE.Vector3 {
  const n = TWO_PI / el.period
  const M = el.meanLongitude - el.perihelionLongitude + n * days
  const E = solveKepler(M, el.eccentricity)
  // true anomaly from eccentric anomaly
  const nu =
    2 *
    Math.atan2(
      Math.sqrt(1 + el.eccentricity) * Math.sin(E / 2),
      Math.sqrt(1 - el.eccentricity) * Math.cos(E / 2),
    )
  const r = el.a * (1 - el.eccentricity * Math.cos(E))
  const angle = nu + el.perihelionLongitude
  return out.set(Math.cos(angle) * r, 0, -Math.sin(angle) * r)
}

/**
 * Points tracing the full orbital ellipse (perihelion-oriented).
 *
 * Segment count matters at large scales: a chord deviates from the true
 * ellipse by ~a·(π/N)²/2, so a 160-segment line on a to-scale Earth
 * orbit (a ≈ 10,600 units) misses by ~2 units — four Earth radii.
 * Callers pass a higher N when the orbit is large relative to its planet.
 */
export function orbitPath(el: OrbitElements, segments = 192): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const nu = (i / segments) * TWO_PI
    const r = (el.a * (1 - el.eccentricity ** 2)) / (1 + el.eccentricity * Math.cos(nu))
    const angle = nu + el.perihelionLongitude
    points.push(new THREE.Vector3(Math.cos(angle) * r, 0, -Math.sin(angle) * r))
  }
  return points
}
