import * as THREE from 'three'
import { useEffect, useMemo, useState } from 'react'
import type { PlanetData } from './data/planets'

const imageCache = new Map<string, THREE.Texture>()

/**
 * Loads an image texture (NASA-derived maps from Solar System Scope,
 * CC BY 4.0, served from /public/textures). Returns null until loaded
 * or when no URL is given — callers fall back to procedural textures,
 * which also covers custom planets and offline use.
 */
export function useImageTexture(url: string | undefined): THREE.Texture | null {
  const fromCache = url ? (imageCache.get(url) ?? null) : null
  const [texture, setTexture] = useState<THREE.Texture | null>(fromCache)
  const [prevUrl, setPrevUrl] = useState(url)
  if (prevUrl !== url) {
    // adjust-state-during-render: react to a url change without an effect
    setPrevUrl(url)
    setTexture(fromCache)
  }
  useEffect(() => {
    if (!url || imageCache.has(url)) return
    let alive = true
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 4
        t.wrapS = THREE.RepeatWrapping // equirectangular maps wrap in longitude
        imageCache.set(url, t)
        if (alive) setTexture(t)
      },
      undefined,
      () => {
        // load error: stay null, the procedural fallback remains in use
      },
    )
    return () => {
      alive = false
    }
  }, [url])
  return texture
}

const W = 512
const H = 256

function makeCanvasTexture(draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  draw(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  return texture
}

/** Gas/ice giants: horizontal cloud bands with wobble, like Jupiter's belts. */
function drawBanded(ctx: CanvasRenderingContext2D, palette: string[]): void {
  ctx.fillStyle = palette[1]
  ctx.fillRect(0, 0, W, H)
  let y = 0
  while (y < H) {
    const bandHeight = 8 + Math.random() * 26
    ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)]
    ctx.globalAlpha = 0.35 + Math.random() * 0.5
    const wobble = Math.random() * 6
    const offset = Math.random() * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= W; x += 16) {
      ctx.lineTo(x, y + Math.sin(x / 40 + offset) * wobble)
    }
    ctx.lineTo(W, y + bandHeight)
    for (let x = W; x >= 0; x -= 16) {
      ctx.lineTo(x, y + bandHeight + Math.sin(x / 40 + offset) * wobble)
    }
    ctx.closePath()
    ctx.fill()
    y += bandHeight * 0.8
  }
  ctx.globalAlpha = 1
}

/** Rocky worlds: mottled base plus crater-like radial spots. */
function drawRocky(ctx: CanvasRenderingContext2D, palette: string[]): void {
  ctx.fillStyle = palette[1]
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)]
    ctx.globalAlpha = 0.08 + Math.random() * 0.25
    const r = 2 + Math.random() * 18
    ctx.beginPath()
    ctx.arc(Math.random() * W, Math.random() * H, r, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * W
    const y = Math.random() * H
    const r = 2 + Math.random() * 7
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, palette[0])
    grad.addColorStop(0.7, palette[2])
    grad.addColorStop(1, 'transparent')
    ctx.globalAlpha = 0.45
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/** Earth: ocean base, continent blobs, polar caps, faint cloud streaks. */
function drawEarth(ctx: CanvasRenderingContext2D, palette: string[]): void {
  const [, ocean, land] = palette
  ctx.fillStyle = ocean
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = land
  for (let i = 0; i < 60; i++) {
    const cx = Math.random() * W
    const cy = H * 0.18 + Math.random() * H * 0.64
    for (let j = 0; j < 14; j++) {
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.arc(cx + (Math.random() - 0.5) * 60, cy + (Math.random() - 0.5) * 34, 4 + Math.random() * 13, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // polar ice caps (clouds are a separate, independently rotating layer)
  ctx.globalAlpha = 0.95
  ctx.fillStyle = '#eef3f5'
  ctx.fillRect(0, 0, W, 14)
  ctx.fillRect(0, H - 14, W, 14)
  ctx.globalAlpha = 1
}

/** Great-Red-Spot-style storm oval with concentric shading. */
function drawSpot(ctx: CanvasRenderingContext2D): void {
  const x = W * 0.68
  const y = H * 0.62
  for (let i = 4; i >= 0; i--) {
    ctx.globalAlpha = 0.5
    ctx.fillStyle = i % 2 === 0 ? '#b5532e' : '#d4724a'
    ctx.beginPath()
    ctx.ellipse(x, y, 14 + i * 7, 8 + i * 3.5, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawPolarCaps(ctx: CanvasRenderingContext2D): void {
  for (const y of [7, H - 7]) {
    const grad = ctx.createLinearGradient(0, y - 12, 0, y + 12)
    grad.addColorStop(0.5, '#f3f0ea')
    grad.addColorStop(y < H / 2 ? 1 : 0, 'rgba(243,240,234,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, y - 12, W, 24)
  }
}

export function makePlanetTexture(data: PlanetData): THREE.CanvasTexture {
  return makeCanvasTexture((ctx) => {
    if (data.kind === 'earth') drawEarth(ctx, data.palette)
    else if (data.kind === 'rocky') drawRocky(ctx, data.palette)
    else drawBanded(ctx, data.palette)
    if (data.features?.spot) drawSpot(ctx)
    if (data.features?.polarCaps) drawPolarCaps(ctx)
  })
}

/**
 * Remaps raw cloud-map brightness (0..1) to opacity (0..1).
 *
 * This curve is the single tuning knob for how Earth's clouds read:
 * the lower edge decides how much faint haze survives (JPEG noise lives
 * below ~0.12, so everything under it must map to 0), the upper edge
 * decides how quickly cloud cores go solid white.
 */
export function shapeCloudAlpha(brightness: number): number {
  const lo = 0.14
  const hi = 0.62
  const t = Math.min(Math.max((brightness - lo) / (hi - lo), 0), 1)
  return t * t * (3 - 2 * t) // smoothstep: soft wispy edges, solid cores
}

const shapedCloudCache = new Map<string, THREE.Texture>()

/**
 * Loads a white-on-black cloud map and bakes shapeCloudAlpha into a real
 * alpha channel, so the material needs no opacity tricks and JPEG noise
 * never tints the planet below.
 */
export function useCloudAlphaTexture(url: string): THREE.Texture | null {
  const base = useImageTexture(url)
  return useMemo(() => {
    if (!base) return null
    const cached = shapedCloudCache.get(url)
    if (cached) return cached
    const img = base.image as HTMLImageElement
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = pixels.data
    for (let i = 0; i < d.length; i += 4) {
      d[i + 3] = Math.round(shapeCloudAlpha(d[i] / 255) * 255)
      d[i] = d[i + 1] = d[i + 2] = 255
    }
    ctx.putImageData(pixels, 0, 0)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    texture.wrapS = THREE.RepeatWrapping
    shapedCloudCache.set(url, texture)
    return texture
  }, [base, url])
}

/**
 * Tileable value noise on a wrapping integer grid. Sampling spans that are
 * integer multiples of `size` repeat seamlessly — which is what lets the
 * cloud texture wrap in longitude without a seam.
 */
function makeValueNoise(size: number): (x: number, y: number) => number {
  const grid = Float32Array.from({ length: size * size }, () => Math.random())
  const at = (ix: number, iy: number) =>
    grid[(((iy % size) + size) % size) * size + (((ix % size) + size) % size)]
  return (x, y) => {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = x - ix
    const fy = y - iy
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const a = at(ix, iy)
    const b = at(ix + 1, iy)
    const c = at(ix, iy + 1)
    const e = at(ix + 1, iy + 1)
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + e) * sx * sy
  }
}

/**
 * Transparent cloud swirls, rendered on a slightly larger sphere shell.
 * Fallback for when the real cloud map can't load: domain-warped fractal
 * noise, shaped through the same alpha curve as the image-based clouds.
 */
export function makeCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const noise = makeValueNoise(16)
  const warp = makeValueNoise(8)
  const pixels = ctx.createImageData(W, H)
  const d = pixels.data
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = (x / W) * 16 // integer multiple of the grid → wraps in longitude
      const v = (y / H) * 8
      // domain warp: bend the sample position with low-frequency noise so the
      // result swirls like weather systems instead of reading as static
      const wu = (x / W) * 8
      const wv = (y / H) * 4
      const dx = (warp(wu, wv) - 0.5) * 4
      const dy = (warp(wu + 3.7, wv + 1.9) - 0.5) * 4
      let f = 0
      let amp = 0.5
      for (let o = 0; o < 4; o++) {
        const k = 2 ** o
        f += noise((u + dx) * k, (v + dy) * k) * amp
        amp *= 0.5
      }
      // f clusters around ~0.47; stretch it so the shaping curve gets a
      // full 0..1 range and ~half the sphere stays cloud-free
      const i = (y * W + x) * 4
      d[i] = d[i + 1] = d[i + 2] = 255
      d[i + 3] = Math.round(shapeCloudAlpha((f - 0.18) * 1.7) * 255)
    }
  }
  ctx.putImageData(pixels, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  return texture
}

export function makeSunTexture(): THREE.CanvasTexture {
  return makeCanvasTexture((ctx) => {
    ctx.fillStyle = '#ffb43b'
    ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? '#ff8c1a' : '#ffd970'
      ctx.globalAlpha = 0.1 + Math.random() * 0.25
      const r = 3 + Math.random() * 24
      ctx.beginPath()
      ctx.arc(Math.random() * W, Math.random() * H, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  })
}

/** 1D radial band pattern for planetary rings (mapped via remapped ring UVs). */
export function makeRingTexture(color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 1
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 256, 0)
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(0.1, color)
  grad.addColorStop(0.45, color)
  grad.addColorStop(0.52, 'rgba(0,0,0,0.85)') // Cassini-division-style gap
  grad.addColorStop(0.6, color)
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 1)
  // overlay fine concentric streaks
  for (let i = 0; i < 60; i++) {
    ctx.globalAlpha = Math.random() * 0.3
    ctx.fillStyle = Math.random() < 0.5 ? '#000000' : '#ffffff'
    ctx.fillRect(Math.random() * 256, 0, 1 + Math.random() * 2, 1)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
