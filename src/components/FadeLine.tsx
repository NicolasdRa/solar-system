import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Line2, LineGeometry, LineMaterial } from 'three-stdlib'
import type * as THREE from 'three'

/**
 * LineMaterial with a per-fragment proximity fade (SOL-56).
 *
 * Orbit polylines are tessellated against a world-space chord error, which
 * says nothing about how a chord looks from up close: a camera sitting next
 * to the line sees its ~2° vertex bends perspective-amplified into sharp
 * corners. Rather than re-tessellating per camera move, fragments fade out
 * as their view-space distance drops below uFadeFar — the stretch of line
 * close enough to expose its corners is exactly the stretch that dissolves.
 *
 * Patched via string anchors into three-stdlib's shader so we inherit the
 * upstream near-plane trimming and endcap handling unchanged.
 */
class FadeLineMaterial extends LineMaterial {
  constructor() {
    super()
    this.transparent = true
    this.uniforms.uFadeNear = { value: 0 }
    this.uniforms.uFadeFar = { value: 0 }
    this.vertexShader = this.vertexShader
      .replace(
        'attribute vec3 instanceEnd;',
        'attribute vec3 instanceEnd;\n\t\t\t\tvarying float vViewDist;',
      )
      .replace(
        'vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );',
        `vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );
					vViewDist = length( ( ( position.y < 0.5 ) ? start : end ).xyz );`,
      )
    this.fragmentShader = this.fragmentShader
      .replace(
        'uniform float linewidth;',
        `uniform float linewidth;
				uniform float uFadeNear;
				uniform float uFadeFar;
				varying float vViewDist;`,
      )
      .replace(
        'float alpha = opacity;',
        `float alpha = opacity;
					if ( uFadeFar > uFadeNear ) alpha *= smoothstep( uFadeNear, uFadeFar, vViewDist );`,
      )
  }
}

/**
 * Drop-in replacement for drei's <Line> for single polylines, with the
 * proximity fade. fadeNear/fadeFar are view-space distances in scene units:
 * fragments closer than fadeNear vanish, beyond fadeFar are untouched.
 * Pass fadeNear = fadeFar = 0 to disable the fade entirely.
 */
export function FadeLine({
  points,
  color,
  opacity,
  lineWidth,
  fadeNear,
  fadeFar,
}: {
  points: THREE.Vector3[]
  color: string
  opacity: number
  lineWidth: number
  fadeNear: number
  fadeFar: number
}) {
  const size = useThree((s) => s.size)
  const material = useMemo(() => new FadeLineMaterial(), [])
  const geometry = useMemo(() => {
    const geo = new LineGeometry()
    geo.setPositions(points.flatMap((p) => [p.x, p.y, p.z]))
    return geo
  }, [points])
  const line = useMemo(() => new Line2(geometry, material), [geometry, material])

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  // pierced props let the renderer apply material mutations declaratively;
  // resolution converts the px lineWidth to clip space, so it must track
  // the canvas size
  return (
    <primitive
      object={line}
      material-color={color}
      material-opacity={opacity}
      material-linewidth={lineWidth}
      material-uniforms-uFadeNear-value={fadeNear}
      material-uniforms-uFadeFar-value={fadeFar}
      material-resolution={[size.width, size.height]}
    />
  )
}
