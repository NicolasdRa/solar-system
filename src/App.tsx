import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { SolarSystem } from './components/SolarSystem'
import { SceneErrorBoundary } from './components/SceneErrorBoundary'
import { CameraRig, CameraModeManager } from './components/CameraRig'
import { OVERVIEWS } from './scale'
import { ControlPanel } from './ui/ControlPanel'
import { InfoPanel } from './ui/InfoPanel'
import { useSim } from './store'

export default function App() {
  const trueScale = useSim((s) => s.distanceMode === 'true')
  const trueSizes = useSim((s) => s.sizeMode === 'true')
  // the persisted distance mode is already hydrated here (localStorage is
  // synchronous), so the camera can start at the matching overview instead
  // of the compressed-mode default; captured once — later mode switches are
  // handled by CameraModeManager
  const [initialCamera] = useState(() => {
    const mode = useSim.getState().distanceMode
    return {
      position: OVERVIEWS[mode],
      fov: 50,
      near: mode === 'true' ? 0.05 : 0.1,
      far: mode === 'true' ? 2_500_000 : 8000,
    }
  })
  return (
    <div className="app">
      <SceneErrorBoundary>
      <Canvas
        camera={initialCamera}
        dpr={[1, 2]}
        // depth precision must survive a 5e7 near/far ratio in to-scale mode
        gl={{ logarithmicDepthBuffer: true }}
      >
        <color attach="background" args={['#020208']} />
        <Stars
          radius={trueScale ? 700_000 : 1500}
          depth={trueScale ? 300_000 : 400}
          count={9000}
          factor={trueScale ? 4000 : 12}
          saturation={0.1}
          fade
          speed={0.4}
        />
        <SolarSystem />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          // true-size planets are small — allow much closer zoom
          minDistance={trueScale || trueSizes ? 0.2 : 4}
          maxDistance={trueScale ? 1_200_000 : 2000}
        />
        <CameraRig />
        <CameraModeManager />
        <EffectComposer>
          <Bloom intensity={1.1} luminanceThreshold={1} mipmapBlur radius={0.7} />
        </EffectComposer>
      </Canvas>
      </SceneErrorBoundary>
      <header className="title">
        <h1>Solar System &amp; Beyond</h1>
        <p>drag to orbit · scroll to zoom · click a body for details</p>
      </header>
      <ControlPanel />
      <InfoPanel />
    </div>
  )
}
