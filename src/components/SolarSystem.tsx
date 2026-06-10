import { useFrame } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { PLANETS } from '../data/planets'
import { simClock, bodyPositions, clampSimDays } from '../clock'
import { useSim } from '../store'
import { Sun } from './Sun'
import { Planet } from './Planet'
import { Belts } from './Belts'

/** Advances simulation time. Lives in its own component so nothing re-renders. */
function SimulationTicker() {
  useFrame((_, delta) => {
    const { paused, timeScale, timeDirection } = useSim.getState()
    if (!paused) simClock.days = clampSimDays(simClock.days + delta * timeScale * timeDirection)
  })
  return null
}

export function SolarSystem() {
  const customPlanets = useSim((s) => s.customPlanets)

  // the Sun is followable/selectable too
  useEffect(() => {
    bodyPositions.set('Sun', new THREE.Vector3(0, 0, 0))
  }, [])

  return (
    <>
      <SimulationTicker />
      <ambientLight intensity={0.07} />
      <Sun />
      {PLANETS.map((planet) => (
        <Planet key={planet.name} data={planet} />
      ))}
      {customPlanets.map((planet) => (
        <Planet key={planet.name} data={planet} />
      ))}
      <Belts />
    </>
  )
}
