import { useBackgroundTexture } from '../textures'

const MILKY_WAY_URL = '/textures/8k_stars_milky_way.jpg'

/**
 * Milky Way panorama (Solar System Scope, CC BY 4.0) rendered as the
 * scene background. The skybox pass is depth-infinite, so it works
 * unchanged across all distance modes regardless of the camera far
 * plane — and zero parallax is physically correct for stars. Until the
 * texture arrives (or if it fails), the flat color from App.tsx stays;
 * attach also restores that color automatically on unmount.
 */
export function UniverseBackground() {
  const texture = useBackgroundTexture(MILKY_WAY_URL)
  if (!texture) return null
  return <primitive object={texture} attach="background" />
}
