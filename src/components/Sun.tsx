import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeSunTexture, useImageTexture } from '../textures'
import { sunRadius } from '../scale'
import { useSim } from '../store'

const SUN_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/**
 * Photosphere shader: fBm noise warps the texture lookup (convective
 * churn) while a slower noise field marks roaming "active regions" that
 * flare brighter. Output colors exceed 1.0 on purpose — the bloom pass
 * picks them up, so storms literally glow.
 */
const SUN_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uTime;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
  return v;
}

void main() {
  vec2 warp = vec2(fbm(vUv * 6.0 + uTime * 0.05), fbm(vUv * 6.0 - uTime * 0.04));
  vec3 surface = texture2D(uMap, vUv + (warp - 0.5) * 0.035).rgb;
  float activity = fbm(vUv * 9.0 + vec2(uTime * 0.10, -uTime * 0.06));
  float flare = smoothstep(0.60, 0.95, activity);
  float flicker = 0.92 + 0.08 * noise(vec2(uTime * 1.7, vUv.y * 30.0));
  vec3 color = surface * (1.9 + 0.6 * flare) * flicker + vec3(1.0, 0.45, 0.12) * flare * 1.5;
  gl_FragColor = vec4(color, 1.0);
}
`

const NOISE_GLSL = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
  return v;
}
`

const PROMINENCE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const CORONA_VERTEX = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewPos;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`

/**
 * Corona: exponential radial falloff from the limb outward, like the
 * real K-corona. fBm modulates the falloff RATE per direction — slow
 * directions become long streamers, fast ones gaps — which is what
 * gives eclipse photos their spiky asymmetry. Noise is sampled on the
 * disk-space normal (not an angle), so there is no seam at ±π.
 */
const CORONA_FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vViewPos;
${NOISE_GLSL}
void main() {
  vec3 toCamera = normalize(-vViewPos);
  // BackSide shell at 2.1 solar radii: -dot is ~0.88 at the limb, 0 at the outer edge
  float rim = clamp(-dot(normalize(vNormal), toCamera), 0.0, 1.0);
  float t = clamp(1.0 - rim / 0.88, 0.0, 1.0); // 0 at the limb -> 1 at the edge
  float wisp = fbm(vNormal.xy * 4.0 + vec2(uTime * 0.015, -uTime * 0.01));
  float intensity = exp(-t * (3.0 + 3.5 * wisp));
  // exp() never reaches zero — force it to, so the shell's silhouette can't show
  intensity *= 1.0 - smoothstep(0.7, 1.0, t);
  // hot white-yellow at the limb cooling to faint deep orange far out
  vec3 color = mix(vec3(1.5, 1.15, 0.7), vec3(0.9, 0.35, 0.1), smoothstep(0.0, 0.6, t));
  gl_FragColor = vec4(color, intensity);
}
`

/**
 * Prominence plasma: filamentary streaks flow along the loop (u runs
 * along its length), the plasma thins toward the apex like a real
 * H-alpha prominence, and everything stays a dim deep red-orange —
 * far below the photosphere's brightness, as in real images.
 */
const PROMINENCE_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uEnvelope;
uniform float uSeed;
uniform float uShape; // 0 = closed loop, 1 = open jet spike
varying vec2 vUv;
${NOISE_GLSL}
void main() {
  float along = vUv.x;
  float arch = sin(along * 3.14159);
  // loops fade toward their apex; spikes fade toward their free tip
  float thin = mix(arch, along, uShape);
  // plasma streams up from the foot (both legs for loops, root for spikes)
  float climb = mix(0.5 - abs(along - 0.5), along * 0.55, uShape);
  float streak = fbm(vec2(climb * 11.0 - uTime * (0.7 + uSeed * 0.13), vUv.y * 2.5 + uSeed * 7.3));
  float filaments = smoothstep(0.38, 0.72, streak);
  float density = mix(1.15, 0.2, thin);
  float alpha = uEnvelope * filaments * density * 0.8;
  vec3 footColor = vec3(2.4, 0.75, 0.18);
  vec3 apexColor = vec3(1.0, 0.18, 0.06);
  gl_FragColor = vec4(mix(footColor, apexColor, thin), alpha);
}
`

/**
 * An irregular loop: jittered control points so no two arcs match.
 * Kept small — real prominences reach a few percent of the solar
 * radius, not half of it.
 */
function makeArcGeometry(variant: number): THREE.TubeGeometry {
  const span = 0.07 + 0.03 * (variant % 3)
  const height = 1.025 + 0.02 * ((variant * 1.7) % 2)
  const sway = 0.006 + 0.004 * (variant % 2)
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    const angle = t * span
    const lift = 1 + (height - 1) * Math.sin(t * Math.PI)
    const point = new THREE.Vector3(Math.cos(angle) * lift, Math.sin(angle) * lift, 0)
    // out-of-plane sway makes the loop sag and twist like real plasma
    point.z = Math.sin(t * Math.PI * 2.3 + variant * 2.1) * sway * Math.sin(t * Math.PI)
    points.push(point)
  }
  const curve = new THREE.CatmullRomCurve3(points)
  return new THREE.TubeGeometry(curve, 64, 0.006, 8, false)
}

/** An open spike: collimated jet shooting outward with a slight bend. */
function makeSpikeGeometry(variant: number): THREE.TubeGeometry {
  const height = 0.045 + 0.03 * variant
  const lean = 0.015 + 0.012 * variant
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= 6; i++) {
    const t = i / 6
    points.push(
      new THREE.Vector3(
        1 + height * t,
        lean * t * t,
        Math.sin(t * 2.0 + variant * 1.4) * 0.006 * t,
      ),
    )
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, 0.0035, 6, false)
}

const SITE_COUNT = 3
const JETS_PER_SITE = 4

/**
 * Eruption sites: an active region fires a CLUSTER — loops and open
 * jets share one footpoint, fanned into different planes (each jet is
 * rolled around the foot axis), each cycling at its own speed. The
 * whole site fades, dies, and respawns somewhere else on the sphere.
 */
function Prominences() {
  const loops = useMemo(() => [0, 1, 2].map(makeArcGeometry), [])
  const spikes = useMemo(() => [0, 1].map(makeSpikeGeometry), [])
  const siteRefs = useRef<(THREE.Group | null)[]>([])
  const meshRefs = useRef<(THREE.Mesh | null)[]>([])
  const materialRefs = useRef<(THREE.ShaderMaterial | null)[]>([])
  const sites = useMemo(
    () =>
      // deterministic spread; real randomness enters at each respawn
      Array.from({ length: SITE_COUNT }, (_, s) => ({
        age: s * 6,
        duration: 16 + ((s * 5.3) % 8),
        jets: Array.from({ length: JETS_PER_SITE }, (_, j) => ({
          speed: 0.7 + ((s * 2.6 + j * 1.7) % 1.3),
          phase: (j * 0.27 + s * 0.13) % 1,
          roll: (j / JETS_PER_SITE) * Math.PI * 2,
          size: 0.97 + ((j * 1.3 + s * 0.7) % 0.06),
        })),
      })),
    [],
  )

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime()
    sites.forEach((site, s) => {
      const group = siteRefs.current[s]
      if (!group) return
      site.age += delta
      if (site.age > site.duration) {
        site.age = 0
        site.duration = 14 + Math.random() * 10
        group.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
        site.jets.forEach((jet) => {
          jet.speed = 0.7 + Math.random() * 1.5
          jet.phase = Math.random()
          jet.roll = Math.random() * Math.PI * 2
          jet.size = 0.97 + Math.random() * 0.06
        })
      }
      const siteT = site.age / site.duration
      // the whole site fades in/out so respawns never pop
      const siteEnvelope =
        THREE.MathUtils.smoothstep(siteT, 0, 0.08) * (1 - THREE.MathUtils.smoothstep(siteT, 0.9, 1))
      site.jets.forEach((jet, j) => {
        const index = s * JETS_PER_SITE + j
        const mesh = meshRefs.current[index]
        const material = materialRefs.current[index]
        if (!mesh || !material) return
        // each jet bursts repeatedly at its own rhythm during the site's life
        const t = (siteT * jet.speed + jet.phase) % 1
        const envelope =
          THREE.MathUtils.smoothstep(t, 0, 0.22) * (1 - THREE.MathUtils.smoothstep(t, 0.5, 1)) * siteEnvelope
        mesh.rotation.x = jet.roll
        mesh.scale.setScalar(jet.size * (0.99 + 0.02 * envelope))
        material.uniforms.uEnvelope.value = envelope
        material.uniforms.uTime.value = time
      })
    })
  })

  return (
    <>
      {sites.map((site, s) => (
        <group
          key={s}
          ref={(el) => {
            siteRefs.current[s] = el
          }}
          rotation={[s * 1.9, s * 2.4, s * 0.8]}
        >
          {site.jets.map((jet, j) => {
            const index = s * JETS_PER_SITE + j
            const isSpike = j >= 2 // half loops, half open jets per site
            const geometry = isSpike ? spikes[j % spikes.length] : loops[(s + j) % loops.length]
            return (
              <mesh
                key={j}
                ref={(el) => {
                  meshRefs.current[index] = el
                }}
                geometry={geometry}
                rotation={[jet.roll, 0, 0]}
              >
                <shaderMaterial
                  ref={(el) => {
                    materialRefs.current[index] = el
                  }}
                  vertexShader={PROMINENCE_VERTEX}
                  fragmentShader={PROMINENCE_FRAGMENT}
                  uniforms={{
                    uTime: { value: 0 },
                    uEnvelope: { value: 0 },
                    uSeed: { value: index },
                    uShape: { value: isSpike ? 1 : 0 },
                  }}
                  transparent
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )
          })}
        </group>
      ))}
    </>
  )
}

export function Sun() {
  const spinRef = useRef<THREE.Mesh>(null)
  const coronaRef = useRef<THREE.Mesh>(null)
  const coronaMatRef = useRef<THREE.ShaderMaterial>(null)
  const shaderRef = useRef<THREE.ShaderMaterial>(null)
  const distanceMode = useSim((s) => s.distanceMode)
  const sizeMode = useSim((s) => s.sizeMode)
  const showStorms = useSim((s) => s.showStorms)
  const set = useSim((s) => s.set)
  const image = useImageTexture('/textures/2k_sun.jpg')
  const procedural = useMemo(() => (image ? null : makeSunTexture()), [image])
  const texture = image ?? procedural
  const radius = sunRadius(distanceMode, sizeMode)
  const uniforms = useMemo(() => ({ uMap: { value: null as THREE.Texture | null }, uTime: { value: 0 } }), [])

  useFrame(({ clock }, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.02
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = clock.getElapsedTime()
      shaderRef.current.uniforms.uMap.value = texture
    }
    if (coronaRef.current) {
      // the corona breathes a little
      const pulse = 2.1 + 0.04 * Math.sin(clock.getElapsedTime() * 0.6)
      coronaRef.current.scale.setScalar(pulse)
    }
    if (coronaMatRef.current) {
      coronaMatRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <group>
      <group scale={radius}>
        <mesh
          ref={spinRef}
          onClick={(e) => {
            e.stopPropagation()
            set({ selected: 'Sun' })
          }}
        >
          <sphereGeometry args={[1, 64, 32]} />
          {showStorms ? (
            <shaderMaterial
              ref={shaderRef}
              vertexShader={SUN_VERTEX}
              fragmentShader={SUN_FRAGMENT}
              uniforms={uniforms}
            />
          ) : (
            <meshBasicMaterial map={texture} color={[2.2, 1.7, 1.1]} toneMapped={false} />
          )}
        </mesh>
        {/* corona — additive streamers with exponential falloff, never muddies what's behind it */}
        <mesh ref={coronaRef} scale={2.1}>
          <sphereGeometry args={[1, 48, 24]} />
          <shaderMaterial
            ref={coronaMatRef}
            vertexShader={CORONA_VERTEX}
            fragmentShader={CORONA_FRAGMENT}
            uniforms={{ uTime: { value: 0 } }}
            transparent
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        {showStorms && <Prominences />}
      </group>
      <pointLight intensity={2.4} decay={0} color="#fff4e0" />
    </group>
  )
}
