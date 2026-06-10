import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scaleDistance } from '../scale'
import { simClock } from '../clock'
import { useSim } from '../store'

const TWO_PI = Math.PI * 2

/**
 * Deterministic PRNG (mulberry32): render must stay pure, and a fixed seed
 * also means the belt scatters identically on every visit.
 */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface BeltProps {
  innerAU: number
  outerAU: number
  count: number
  size: number
  thickness: number
  color: string
  /** rough orbital period (days) used to slowly rotate the whole belt */
  period: number
}

/**
 * One InstancedMesh = one draw call for thousands of rocks. Each rock gets
 * a random matrix once; animation rotates the parent group instead of
 * touching instances per frame.
 */
function Belt({ innerAU, outerAU, count, size, thickness, color, period }: BeltProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const distanceMode = useSim((s) => s.distanceMode)

  // stable per-rock randoms, independent of distance mode
  const seeds = useMemo(() => {
    const rand = mulberry32(count)
    return Array.from({ length: count }, () => ({
      t: rand(),
      angle: rand() * TWO_PI,
      y: (rand() - 0.5) * 2,
      scale: 0.4 + rand() * 1.1,
      rot: new THREE.Euler(rand() * 3, rand() * 3, rand() * 3),
    }))
  }, [count])

  useLayoutEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    const inner = scaleDistance(innerAU, distanceMode)
    const outer = scaleDistance(outerAU, distanceMode)
    seeds.forEach((seed, i) => {
      const r = inner + seed.t * (outer - inner)
      dummy.position.set(Math.cos(seed.angle) * r, seed.y * thickness, Math.sin(seed.angle) * r)
      dummy.rotation.copy(seed.rot)
      dummy.scale.setScalar(seed.scale * size)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [seeds, distanceMode, innerAU, outerAU, size, thickness])

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y = TWO_PI * (simClock.days / period)
  })

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color} roughness={1} />
      </instancedMesh>
    </group>
  )
}

export function Belts() {
  const showBelts = useSim((s) => s.showBelts)
  if (!showBelts) return null
  return (
    <>
      {/* main asteroid belt between Mars and Jupiter */}
      <Belt innerAU={2.1} outerAU={3.3} count={2200} size={0.06} thickness={1.2} color="#8d8273" period={1600} />
      {/* Kuiper belt beyond Neptune */}
      <Belt innerAU={42} outerAU={55} count={3200} size={0.1} thickness={3.5} color="#6f7a8c" period={110000} />
    </>
  )
}
