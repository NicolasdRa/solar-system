import * as THREE from 'three'

// keep the band dimmer than any sunlit planet surface (SOL-41)
const BACKGROUND_INTENSITY = 0.6

// the galactic plane is inclined ~60.2° to the ecliptic (our XZ plane),
// so the band crosses the sky diagonally instead of hugging the orbits
const GALACTIC_TILT = THREE.MathUtils.degToRad(60.2)

/**
 * Static scene config for the background pass; passed to Canvas via its
 * `scene` prop so no hook-returned object is ever mutated. Harmless
 * while the background is still the flat fallback color.
 */
export const UNIVERSE_SCENE_PROPS: Partial<THREE.Scene> = {
  backgroundIntensity: BACKGROUND_INTENSITY,
  backgroundRotation: new THREE.Euler(GALACTIC_TILT, 0, 0),
}
