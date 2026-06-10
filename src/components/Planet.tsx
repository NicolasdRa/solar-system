import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import type { AtmosphereData, MoonData, PlanetData, RingData } from '../data/planets'
import {
  makeCloudTexture,
  makePlanetTexture,
  makeRingTexture,
  useCloudAlphaTexture,
  useImageTexture,
} from '../textures'
import { scaleDistance, visualRadius } from '../scale'
import { simClock, bodyPositions } from '../clock'
import { keplerPosition, orbitPath, type OrbitElements } from '../orbit'
import { useSim } from '../store'
import { bodyName, useT } from '../i18n'

const TWO_PI = Math.PI * 2
const DEG = Math.PI / 180

const ATMOSPHERE_VERTEX = /* glsl */ `
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
void main() {
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/**
 * Outer halo, drawn on a BackSide shell: the view-angle term peaks at the
 * planet's limb and decays to zero at the shell's silhouette, so the glow
 * hugs the planet instead of reading as a hard-edged bubble. The sun sits
 * at the world origin, so -normalize(vWorldPos) IS the sun direction —
 * the night side fades out for free.
 */
const ATMOSPHERE_HALO_FRAGMENT = /* glsl */ `
uniform vec3 uLimbColor;
uniform vec3 uFringeColor;
uniform float uLimbRim;   // -dot(normal, view) right at the planet's limb, for this shell ratio
uniform float uBleed;
uniform float uIntensity;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 sunDir = -normalize(vWorldPos);
  // BackSide: -dot peaks at the planet limb and reaches 0 at the shell's edge
  float rim = clamp(-dot(vWorldNormal, viewDir) / uLimbRim, 0.0, 1.0);
  float falloff = pow(rim, 2.6);
  float day = clamp(dot(vWorldNormal, sunDir) * 1.6 + uBleed, 0.0, 1.0);
  // scattered light shifts from the fringe color far out to the limb color up close
  vec3 color = mix(uFringeColor, uLimbColor, falloff);
  gl_FragColor = vec4(color, falloff * day * 0.85 * uIntensity);
}
`

/**
 * Inner Fresnel rim, drawn just above the surface: brightens the
 * planet's own edge where the view ray grazes the most air, like the
 * blue limb in photos from orbit.
 */
const ATMOSPHERE_RIM_FRAGMENT = /* glsl */ `
uniform vec3 uLimbColor;
uniform float uBleed;
uniform float uIntensity;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 sunDir = -normalize(vWorldPos);
  float fresnel = pow(1.0 - clamp(dot(vWorldNormal, viewDir), 0.0, 1.0), 3.5);
  float day = clamp(dot(vWorldNormal, sunDir) * 1.6 + uBleed, 0.0, 1.0);
  gl_FragColor = vec4(uLimbColor, fresnel * day * 0.6 * uIntensity);
}
`

function OrbitLine({
  elements,
  highlighted,
  inFocus,
}: {
  elements: OrbitElements
  highlighted: boolean
  /** selected or followed — earns extra tessellation at large scales */
  inFocus: boolean
}) {
  // keep the chord error well below a planet radius at every scale:
  // error ≈ a·(π/N)²/2, so N grows with the orbit's absolute size
  const segments = useMemo(() => {
    const target = inFocus ? 0.02 : 0.5 // max acceptable error in scene units
    const n = Math.PI * Math.sqrt(elements.a / (2 * target))
    return THREE.MathUtils.clamp(Math.ceil(n / 64) * 64, 192, 4096)
  }, [elements.a, inFocus])
  const points = useMemo(() => orbitPath(elements, segments), [elements, segments])
  return (
    <Line
      points={points}
      color={highlighted ? '#7eb8ff' : '#46506e'}
      transparent
      opacity={highlighted ? 0.9 : 0.4}
      lineWidth={highlighted ? 1.5 : 1}
    />
  )
}

function Rings({ ring, planetRadius }: { ring: RingData; planetRadius: number }) {
  const image = useImageTexture(ring.textureUrl)
  const procedural = useMemo(
    () => (image ? null : makeRingTexture(ring.color)),
    [image, ring.color],
  )
  const texture = image ?? procedural
  const geometry = useMemo(() => {
    const inner = planetRadius * ring.inner
    const outer = planetRadius * ring.outer
    const geo = new THREE.RingGeometry(inner, outer, 96, 1)
    // Remap UVs: by default RingGeometry sweeps U around the circle.
    // We want U to run inner→outer so the 1D band texture reads radially.
    const pos = geo.attributes.position
    const uv = geo.attributes.uv
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5)
    }
    return geo
  }, [ring, planetRadius])
  return (
    <mesh geometry={geometry} rotation-x={-Math.PI / 2} receiveShadow>
      <meshStandardMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        roughness={0.9}
        depthWrite={false}
      />
    </mesh>
  )
}

function Moon({ moon, planetRadius }: { moon: MoonData; planetRadius: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const image = useImageTexture(moon.textureUrl)
  useFrame(() => {
    if (!ref.current) return
    const theta = TWO_PI * (simClock.days / moon.period)
    const d = planetRadius * moon.distance
    ref.current.position.set(Math.cos(theta) * d, 0, -Math.sin(theta) * d)
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[Math.max(planetRadius * moon.relRadius, 0.07), 24, 12]} />
      <meshStandardMaterial map={image ?? undefined} color={image ? '#ffffff' : moon.color} roughness={1} />
    </mesh>
  )
}

// c-prefixed to avoid clashing with helpers in the standard material's chunks
const CLOUD_NOISE_GLSL = /* glsl */ `
uniform float uCloudTime;
float cHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float cNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(cHash(i), cHash(i + vec2(1.0, 0.0)), u.x),
             mix(cHash(i + vec2(0.0, 1.0)), cHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float cFbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * cNoise(p); p *= 2.03; a *= 0.5; }
  return v;
}
`

// ── Cloud evolution tuning ──────────────────────────────────────────────
/** How far the animated warp displaces cloud shapes, in UV units (~0.01 subtle, ~0.05 violent). */
const CLOUD_MORPH_AMOUNT = 0.035
/** Noise-phase advance per simulated day — higher = shapes churn faster. */
const CLOUD_MORPH_SPEED = 0.5
/** Speed of the regional build/dissolve weather cycle, per simulated day. */
const CLOUD_WEATHER_SPEED = 0.18

/** Formats a number as a GLSL float literal (a bare "1" would be an int). */
const glslFloat = (n: number) => n.toFixed(4)

/**
 * Replaces the standard material's map_fragment chunk: the cloud map is
 * sampled through a time-varying domain warp (shapes shear and morph),
 * and a slow regional field swells or clears whole weather systems.
 * Longitude enters the noise as a point on a circle, so the animation
 * wraps seamlessly where the texture's u=0/u=1 meridians meet.
 */
const CLOUD_MAP_FRAGMENT = /* glsl */ `
#ifdef USE_MAP
  vec2 cRing = vec2(cos(vMapUv.x * 6.2831853), sin(vMapUv.x * 6.2831853));
  float cT = uCloudTime;
  float cWx = cFbm(cRing * 1.4 + vec2(vMapUv.y * 3.0, cT * ${glslFloat(CLOUD_MORPH_SPEED)}));
  float cWy = cFbm(cRing * 1.4 + vec2(cT * ${glslFloat(CLOUD_MORPH_SPEED * 0.6)} + 4.7, vMapUv.y * 3.0 + 2.3));
  vec4 sampledDiffuseColor = texture2D(map, vMapUv + (vec2(cWx, cWy) - 0.44) * ${glslFloat(CLOUD_MORPH_AMOUNT)});
  // regional coverage builds and dissolves over a few simulated days
  float cCoverage = cFbm(cRing * 1.1 + vec2(vMapUv.y * 2.0 + cT * ${glslFloat(CLOUD_WEATHER_SPEED)}, cT * ${glslFloat(CLOUD_WEATHER_SPEED * 0.7)}));
  sampledDiffuseColor.a = min(sampledDiffuseColor.a * (0.25 + 1.5 * smoothstep(0.30, 0.62, cCoverage)), 1.0);
  diffuseColor *= sampledDiffuseColor;
#endif
`

// ── Gas giant dynamics tuning ───────────────────────────────────────────
/** How fast alternating zonal jets slide bands past each other (longitude/day; real ≈ 0.002, exaggerated for visibility). */
const GAS_SHEAR_SPEED = 0.012
/** Extra super-rotation of the equatorial jet (longitude per simulated day). */
const GAS_EQ_JET = 0.018
/** Flow-advection period in simulated days — also caps band displacement at speed × period / 2. */
const GAS_FLOW_PERIOD = 4.0
/** Turbulent eddy displacement along/across the bands, in UV units. */
const GAS_EDDY_U = 0.006
const GAS_EDDY_V = 0.004
/** How fast eddies churn (noise phase per simulated day). */
const GAS_EDDY_SPEED = 0.7
/** Great-spot swirl: max slosh angle (radians) and rate (the real GRS turns over in ~6 days). */
const GAS_SPOT_SWIRL = 1.1
const GAS_SPOT_RATE = 0.9
/** Great Red Spot center + ellipse radii in the 2k_jupiter texture (measured from the image). */
const GAS_SPOT_UV = [0.371, 0.383] as const
const GAS_SPOT_RADII = [0.05, 0.055] as const
/** View-angle limb darkening: 0 = painted ball, 1 = full pow-law falloff into the limb. */
const GAS_LIMB_DARKENING = 0.55

/**
 * Gas-giant map_fragment: bands shear past each other (differential
 * rotation, via bounded flow advection), zonally-stretched eddies churn
 * the band edges, the great spot swirls in place while the flow is
 * pinned inside it (so the shear never smears it away), and limb
 * darkening fades the disk edge the way a surfaceless ball of gas should.
 */
const GAS_MAP_FRAGMENT = /* glsl */ `
#ifdef USE_MAP
  float gT = uCloudTime;
  vec2 gUv = vMapUv;
  float gLat = gUv.y - 0.5;
  // spot frame, in texture space (longitude distance wrapped across the seam)
  vec2 gD = vec2(gUv.x - uSpot.x - floor(gUv.x - uSpot.x + 0.5), gUv.y - uSpot.y);
  vec2 gE = gD / vec2(${glslFloat(GAS_SPOT_RADII[0])}, ${glslFloat(GAS_SPOT_RADII[1])});
  float gR = length(gE);
  float gMask = (1.0 - smoothstep(0.3, 1.1, gR)) * uSpot.z;
  // the spot interior swirls anticyclonically instead of streaming
  float gAng = ${glslFloat(GAS_SPOT_SWIRL)} * sin(gT * ${glslFloat(GAS_SPOT_RATE)})
             * (1.0 - smoothstep(0.15, 1.0, gR)) * uSpot.z;
  gE = mat2(cos(gAng), -sin(gAng), sin(gAng), cos(gAng)) * gE;
  // reconstruct: exact where unswirled (x may gain a full turn — wrapS repeats)
  gUv = uSpot.xy + gE * vec2(${glslFloat(GAS_SPOT_RADII[0])}, ${glslFloat(GAS_SPOT_RADII[1])});
  // zonally-stretched turbulence: low frequency along the bands, high across
  vec2 gRing = vec2(cos(vMapUv.x * 6.2831853), sin(vMapUv.x * 6.2831853));
  float gEx = cFbm(gRing * 2.0 + vec2(gUv.y * 12.0, gT * ${glslFloat(GAS_EDDY_SPEED)}));
  float gEy = cFbm(gRing * 2.0 + vec2(gT * ${glslFloat(GAS_EDDY_SPEED * 0.8)} + 3.1, gUv.y * 12.0 + 5.2));
  gUv += (vec2(gEx, gEy) - 0.44) * vec2(${glslFloat(GAS_EDDY_U)}, ${glslFloat(GAS_EDDY_V)}) * (1.0 - gMask);
  // differential rotation as bounded flow advection: alternating zonal jets
  // (calm poles, super-rotating equator) stream the bands forever, but the
  // two half-period samples crossfade so displacement never accumulates —
  // unbounded gT * speed would shear the texture into a featureless smear
  float gJet = (sin(vMapUv.y * 28.2743) * cos(gLat * 3.1416) * ${glslFloat(GAS_SHEAR_SPEED)}
             + exp(-gLat * gLat * 90.0) * ${glslFloat(GAS_EQ_JET)}) * (1.0 - gMask);
  float gP0 = fract(gT / ${glslFloat(GAS_FLOW_PERIOD)});
  float gP1 = fract(gP0 + 0.5);
  vec4 gS0 = texture2D(map, gUv + vec2(gJet * (gP0 - 0.5) * ${glslFloat(GAS_FLOW_PERIOD)}, 0.0));
  vec4 gS1 = texture2D(map, gUv + vec2(gJet * (gP1 - 0.5) * ${glslFloat(GAS_FLOW_PERIOD)}, 0.0));
  vec4 sampledDiffuseColor = mix(gS0, gS1, abs(2.0 * gP0 - 1.0));
  // gas has no surface: brightness sinks into the limb with view angle
  float gMu = clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);
  sampledDiffuseColor.rgb *= mix(1.0, pow(gMu, 0.7), ${glslFloat(GAS_LIMB_DARKENING)});
  diffuseColor *= sampledDiffuseColor;
#endif
`

/** Earth-only drifting cloud deck on a shell just above the surface. */
function Clouds({ radius }: { radius: number }) {
  // the real cloud map gets its alpha channel baked from shapeCloudAlpha,
  // which flushes JPEG noise to transparent instead of hazing the planet
  const cloudImage = useCloudAlphaTexture('/textures/2k_earth_clouds.jpg')
  const cloudProcedural = useMemo(() => (cloudImage ? null : makeCloudTexture()), [cloudImage])
  const cloudRef = useRef<THREE.Mesh>(null)
  const cloudShader = useRef<THREE.WebGLProgramParametersWithUniforms | null>(null)
  const evolveClouds = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uCloudTime = { value: 0 }
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${CLOUD_NOISE_GLSL}`)
        .replace('#include <map_fragment>', CLOUD_MAP_FRAGMENT)
      cloudShader.current = shader
    },
    [],
  )
  useFrame(() => {
    if (cloudRef.current) {
      // clouds drift relative to the surface (~1.1 rotations per day)
      cloudRef.current.rotation.y = TWO_PI * simClock.days * 1.1
    }
    if (cloudShader.current) {
      // wrapped to keep noise inputs small — float32 fract() degrades far
      // from zero, and a pop every 8192 sim-days is beyond noticing
      cloudShader.current.uniforms.uCloudTime.value = simClock.days % 8192
    }
  })
  return (
    <mesh ref={cloudRef}>
      <sphereGeometry args={[radius * 1.02, 64, 32]} />
      <meshStandardMaterial
        map={cloudImage ?? cloudProcedural}
        onBeforeCompile={evolveClouds}
        transparent
        roughness={1}
        depthWrite={false}
      />
    </mesh>
  )
}

/** Fresnel rim + backside halo, parameterized per planet via PlanetData.atmosphere. */
function AtmosphereGlow({ radius, config }: { radius: number; config: AtmosphereData }) {
  const { rimUniforms, haloUniforms } = useMemo(() => {
    // setRGB keeps the values in shader space, exactly as authored in the data
    const limb = new THREE.Color().setRGB(...config.limbColor)
    const fringe = new THREE.Color().setRGB(...config.fringeColor)
    return {
      rimUniforms: {
        uLimbColor: { value: limb },
        uBleed: { value: config.terminatorBleed },
        uIntensity: { value: config.intensity },
      },
      haloUniforms: {
        uLimbColor: { value: limb },
        uFringeColor: { value: fringe },
        // where the planet's limb sits on the shell, seen edge-on
        uLimbRim: { value: Math.sqrt(1 - 1 / (config.shell * config.shell)) },
        uBleed: { value: config.terminatorBleed },
        uIntensity: { value: config.intensity },
      },
    }
  }, [config])
  return (
    <>
      {/* inner Fresnel rim — the glowing edge on the planet itself */}
      <mesh>
        <sphereGeometry args={[radius * (1 + (config.shell - 1) * 0.25), 64, 32]} />
        <shaderMaterial
          vertexShader={ATMOSPHERE_VERTEX}
          fragmentShader={ATMOSPHERE_RIM_FRAGMENT}
          uniforms={rimUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* outer halo — scattered light extending past the limb, day side only */}
      <mesh>
        <sphereGeometry args={[radius * config.shell, 64, 32]} />
        <shaderMaterial
          vertexShader={ATMOSPHERE_VERTEX}
          fragmentShader={ATMOSPHERE_HALO_FRAGMENT}
          uniforms={haloUniforms}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

export function Planet({ data }: { data: PlanetData }) {
  const orbitRef = useRef<THREE.Group>(null)
  const spinRef = useRef<THREE.Mesh>(null)
  const distanceMode = useSim((s) => s.distanceMode)
  const sizeMode = useSim((s) => s.sizeMode)
  const planetScale = useSim((s) => s.planetScale)
  const showOrbits = useSim((s) => s.showOrbits)
  const showLabels = useSim((s) => s.showLabels)
  const selected = useSim((s) => s.selected)
  const following = useSim((s) => s.following)
  const set = useSim((s) => s.set)
  const t = useT()

  const elements = useMemo<OrbitElements>(
    () => ({
      a: scaleDistance(data.distanceAU, distanceMode),
      eccentricity: data.eccentricity,
      meanLongitude: data.meanLongitudeDeg * DEG,
      perihelionLongitude: data.perihelionLongitudeDeg * DEG,
      period: data.orbitalPeriod,
    }),
    [data, distanceMode],
  )
  const radius = visualRadius(data.radiusKm, sizeMode, distanceMode) * planetScale
  const image = useImageTexture(data.textureUrl)
  const procedural = useMemo(() => (image ? null : makePlanetTexture(data)), [image, data])
  const texture = image ?? procedural

  // gas and ice giants get living surfaces: band shear, eddies, spot, limb darkening
  const isGiant = data.kind === 'gas' || data.kind === 'ice'
  const gasShader = useRef<THREE.WebGLProgramParametersWithUniforms | null>(null)
  const stirGas = useMemo(() => {
    if (!isGiant) return undefined
    const hasSpot = data.features?.spot ? 1 : 0
    return (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uCloudTime = { value: 0 }
      shader.uniforms.uSpot = { value: new THREE.Vector3(GAS_SPOT_UV[0], GAS_SPOT_UV[1], hasSpot) }
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${CLOUD_NOISE_GLSL}\nuniform vec3 uSpot;`)
        .replace('#include <map_fragment>', GAS_MAP_FRAGMENT)
      gasShader.current = shader
    }
  }, [isGiant, data.features?.spot])
  const worldPos = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => {
    // registering in an effect (not useMemo) keeps the Map entry pointing
    // at the same instance useFrame writes to, even under StrictMode's
    // double render
    bodyPositions.set(data.name, worldPos)
    return () => {
      bodyPositions.delete(data.name)
    }
  }, [data.name, worldPos])

  // labels of inner orbits pile up on the Sun when the camera is far out;
  // hide a label once the viewpoint dwarfs its orbit (hysteresis band so
  // it doesn't flicker at the threshold)
  const [labelInRange, setLabelInRange] = useState(true)
  const labelInRangeRef = useRef(true)

  useFrame(({ camera }) => {
    if (!orbitRef.current) return
    keplerPosition(elements, simClock.days, orbitRef.current.position)
    orbitRef.current.getWorldPosition(worldPos)
    if (spinRef.current) {
      // rotationPeriod is in hours; negative values spin retrograde
      spinRef.current.rotation.y = TWO_PI * ((simClock.days * 24) / data.rotationPeriod)
    }
    if (gasShader.current) {
      // wrapped to keep noise inputs small for float32 (same as Earth's clouds)
      gasShader.current.uniforms.uCloudTime.value = simClock.days % 8192
    }
    const limit = elements.a * (labelInRangeRef.current ? 9.5 : 8.5)
    const inRange = camera.position.length() < limit
    if (inRange !== labelInRangeRef.current) {
      labelInRangeRef.current = inRange
      setLabelInRange(inRange)
    }
  })

  const select = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    set({ selected: data.name })
  }

  return (
    <group rotation-x={data.inclination * DEG}>
      {showOrbits && (
        <OrbitLine
          elements={elements}
          highlighted={selected === data.name}
          inFocus={selected === data.name || following === data.name}
        />
      )}
      <group ref={orbitRef}>
        {/* axial tilt applies to the spin axis, the rings, and nothing else */}
        <group rotation-z={-data.axialTilt * DEG}>
          <mesh ref={spinRef} onClick={select}>
            <sphereGeometry args={[radius, isGiant ? 64 : 48, isGiant ? 32 : 24]} />
            <meshStandardMaterial map={texture} onBeforeCompile={stirGas} roughness={0.95} metalness={0} />
          </mesh>
          {data.kind === 'earth' && <Clouds radius={radius} />}
          {data.atmosphere && <AtmosphereGlow radius={radius} config={data.atmosphere} />}
          {data.ring && <Rings ring={data.ring} planetRadius={radius} />}
          {/* regular moons orbit the planet's equatorial plane, not the
              ecliptic — which is why Uranus's moon system stands on its side */}
          {data.moons?.map((moon) => (
            <Moon key={moon.name} moon={moon} planetRadius={radius} />
          ))}
        </group>
        {/* the followed planet fills the view — its distance-scaled label
            would blow up to screen size, so it hides while followed */}
        {showLabels && labelInRange && following !== data.name && (
          <Html
            center
            // constant screen-size labels: distance scaling blows up to
            // screen-filling text whenever the camera nears any body
            position={[0, radius + 1.2, 0]}
            className="body-label"
            occlude={false}
            zIndexRange={[10, 0]}
          >
            <span onClick={() => set({ selected: data.name })}>{bodyName(data.name, t)}</span>
          </Html>
        )}
      </group>
    </group>
  )
}
