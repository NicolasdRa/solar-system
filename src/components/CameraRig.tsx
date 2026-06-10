import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useEffect, useRef } from 'react'
import { bodyPositions } from '../clock'
import { visualRadius, sunRadius, OVERVIEWS, moonVisualRadius, restingMinDistance } from '../scale'
import { PLANETS } from '../data/planets'
import { useSim, type DistanceMode } from '../store'
import { cameraCommands, requestFlyIn } from '../cameraCommands'

const offset = new THREE.Vector3()
const ORIGIN = new THREE.Vector3(0, 0, 0)

/** Resting near plane per distance mode — what the camera uses at overview range. */
function modeNear(distanceMode: DistanceMode): number {
  return distanceMode === 'true' ? 0.05 : 0.1
}

/**
 * The closest the near plane may shrink. True-size moons demand a tiny
 * value: filling the screen with an 11 km Phobos (0.0008 units) means the
 * camera sits ~0.005 units out, far inside the resting near plane.
 */
const MIN_NEAR = 0.0002

/**
 * Adaptive near plane: keep it a notch inside the camera's distance to the
 * followed body, so close-ups of true-scale specks aren't clipped away
 * while overview shots keep a sane depth range. The pattern Celestia and
 * NASA's Eyes use for the same problem.
 */
function adaptNear(camera: THREE.Camera, targetDistance: number, distanceMode: DistanceMode) {
  const cam = camera as THREE.PerspectiveCamera
  const near = THREE.MathUtils.clamp(targetDistance * 0.05, MIN_NEAR, modeNear(distanceMode))
  // skip sub-percent updates so we don't recompute the projection every frame
  if (Math.abs(near - cam.near) > cam.near * 0.01) {
    cam.near = near
    cam.updateProjectionMatrix()
  }
}

function bodyVisualRadius(name: string): number {
  const { distanceMode, sizeMode, planetScale, customPlanets } = useSim.getState()
  if (name === 'Sun') return sunRadius(distanceMode, sizeMode)
  const bodies = [...PLANETS, ...customPlanets]
  const planet = bodies.find((p) => p.name === name)
  if (planet) return visualRadius(planet.radiusKm, sizeMode, distanceMode) * planetScale
  for (const parent of bodies) {
    const moon = parent.moons?.find((m) => m.name === name)
    if (moon) {
      // same sizing the moon mesh applies to its geometry
      return moonVisualRadius(moon, parent, distanceMode, sizeMode, planetScale)
    }
  }
  return 2
}

/**
 * Retunes the camera for each distance mode: the true-scale system is
 * ~50,000× larger than the compressed one, so the far plane must grow
 * and the camera jumps to an overview that actually contains the orbits.
 */
export function CameraModeManager() {
  const distanceMode = useSim((s) => s.distanceMode)
  const sizeMode = useSim((s) => s.sizeMode)
  // read three's state lazily inside effects: holding the camera as a
  // hook-returned reference trips react-hooks/immutability when we mutate it
  const get = useThree((s) => s.get)
  const controlsReady = useThree((s) => s.controls !== null)
  const prevMode = useRef(distanceMode)
  const prevSizeMode = useRef(sizeMode)

  useEffect(() => {
    if (prevSizeMode.current !== sizeMode) {
      prevSizeMode.current = sizeMode
      // followed planet just changed size — re-frame it
      if (useSim.getState().following) requestFlyIn()
    }
  }, [sizeMode])

  useEffect(() => {
    const camera = get().camera as THREE.PerspectiveCamera
    const controls = get().controls as OrbitControlsImpl | null
    camera.far = distanceMode === 'true' ? 2_500_000 : 8000
    camera.near = modeNear(distanceMode)
    camera.updateProjectionMatrix()
    if (prevMode.current !== distanceMode) {
      prevMode.current = distanceMode
      if (useSim.getState().following) {
        requestFlyIn()
      } else if (controls) {
        camera.position.set(...OVERVIEWS[distanceMode])
        controls.target.set(0, 0, 0)
      }
    }
  }, [distanceMode, get, controlsReady])

  return null
}

/**
 * Camera follow, in two phases:
 *
 * 1. Fly-in: when a new body is followed, ease the camera toward a
 *    close viewpoint (a few body radii away) over ~1.5s.
 * 2. Lock: afterwards the target is pinned to the body every frame and
 *    the camera moves rigidly with it — no lag even at high time warp.
 *    OrbitControls still works because rotating/zooming just changes
 *    the camera-to-target offset, which we preserve.
 */
export function CameraRig() {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const flyProgress = useRef(1)
  const flyStartDistance = useRef(-1)
  const lastFollowed = useRef<string | null>(null)
  const homeProgress = useRef(1)
  const homeFrom = useRef(new THREE.Vector3())

  useFrame((state, delta) => {
    const camera = state.camera
    // mutable view of the controls: assigning through the hook-returned
    // reference trips react-hooks/immutability (same dance as the lazy
    // camera reads in CameraModeManager)
    const liveControls = state.controls as OrbitControlsImpl | null
    if (import.meta.env.DEV && window.__solar) {
      window.__solar.camera = camera
      window.__solar.controls = controls
      window.__solar.scene = state.scene
    }
    const { following, distanceMode } = useSim.getState()
    if (cameraCommands.overview) {
      cameraCommands.overview = false
      if (!following) {
        homeProgress.current = 0
        homeFrom.current.copy(camera.position)
      }
    }
    if (following !== lastFollowed.current || cameraCommands.flyIn) {
      cameraCommands.flyIn = false
      lastFollowed.current = following
      flyProgress.current = 0
      flyStartDistance.current = -1
      if (following) homeProgress.current = 1 // a new follow cancels the glide home
    }

    // glide home: ease toward the overview vantage of the current mode
    // (destination re-read each frame so a mid-glide mode switch converges
    // on the right overview instead of a stale one)
    if (homeProgress.current < 1 && controls) {
      homeProgress.current = Math.min(1, homeProgress.current + delta / 1.5)
      const eased = 1 - Math.pow(1 - homeProgress.current, 3)
      camera.position.lerpVectors(
        homeFrom.current,
        offset.set(...OVERVIEWS[distanceMode]),
        eased,
      )
      controls.target.lerp(ORIGIN, homeProgress.current < 1 ? 0.18 : 1)
      return
    }

    if (!following || !controls) {
      // back at overview range: restore the resting near plane and zoom stop
      adaptNear(camera, Infinity, distanceMode)
      if (liveControls) {
        liveControls.minDistance = restingMinDistance(distanceMode, useSim.getState().sizeMode)
      }
      return
    }
    const target = bodyPositions.get(following)
    if (!target) return

    // zoom freedom scales with the followed body: the resting minDistance
    // suits planets, but a true-size Phobos sits three orders of magnitude
    // inside it — allow grazing the surface of whatever is followed
    if (liveControls) {
      liveControls.minDistance = Math.max(bodyVisualRadius(following) * 1.2, MIN_NEAR * 2)
    }

    // current viewing offset, owned by OrbitControls between frames
    offset.copy(camera.position).sub(controls.target)
    adaptNear(camera, offset.length(), distanceMode)

    if (flyProgress.current < 1) {
      if (flyStartDistance.current < 0) flyStartDistance.current = offset.length()
      flyProgress.current = Math.min(1, flyProgress.current + delta / 1.5)
      // interpolate from the captured start distance so the fly-in
      // completes regardless of frame rate. The floor only guards against
      // degenerate radii — adaptNear keeps even a 6-radii view of a
      // true-size Phobos outside the clip plane
      const closeUp = Math.max(bodyVisualRadius(following) * 6, MIN_NEAR * 4)
      const eased = 1 - Math.pow(1 - flyProgress.current, 3)
      const length = THREE.MathUtils.lerp(flyStartDistance.current, closeUp, eased)
      offset.setLength(Math.max(length, closeUp))
    }

    // rigid lock: target sits exactly on the body, camera keeps its offset
    controls.target.lerp(target, flyProgress.current < 1 ? 0.18 : 1)
    camera.position.copy(controls.target).add(offset)
  })

  return null
}
