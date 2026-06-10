import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { SolarSystem } from './components/SolarSystem'
import { UniverseBackground } from './components/UniverseBackground'
import { UNIVERSE_SCENE_PROPS } from './universeScene'
import { SceneErrorBoundary } from './components/SceneErrorBoundary'
import { CameraRig, CameraModeManager } from './components/CameraRig'
import { OVERVIEWS, restingMinDistance } from './scale'
import { ControlPanel } from './ui/ControlPanel'
import { InfoPanel } from './ui/InfoPanel'
import { UndoToast } from './ui/UndoToast'
import { CoachMark } from './ui/CoachMark'
import { LanguageSwitch } from './ui/LanguageSwitch'
import { useSim } from './store'
import { useT } from './i18n'

export default function App() {
  const distanceMode = useSim((s) => s.distanceMode)
  const sizeMode = useSim((s) => s.sizeMode)
  const trueScale = distanceMode === 'true'
  const locale = useSim((s) => s.locale)
  const t = useT()
  // keep the document itself in the active language — screen readers and
  // browser translation prompts key off <html lang>
  useEffect(() => {
    document.documentElement.lang = locale
    document.title = t.app.title
  }, [locale, t])
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
        scene={UNIVERSE_SCENE_PROPS}
      >
        {/* flat color shows until the Milky Way panorama loads (SOL-41) */}
        <color attach="background" args={['#020208']} />
        <UniverseBackground />
        <SolarSystem />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          // resting value — CameraRig overrides this while a body is
          // followed, scaling the limit to that body's actual size
          minDistance={restingMinDistance(distanceMode, sizeMode)}
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
        <h1>{t.app.title}</h1>
        <p>{t.app.tagline}</p>
      </header>
      <ControlPanel />
      <InfoPanel />
      <UndoToast />
      <CoachMark />
      <LanguageSwitch />
    </div>
  )
}
