#!/usr/bin/env python3
"""Converts real spacecraft/telescope mosaics into the bundled textures.

Sources (all public domain or CC BY 4.0 — see README credits), downloaded
to /tmp/moon-maps by the caller:
  moons   USGS Astrogeology global mosaics (planetarymaps.usgs.gov)
  pluto   New Horizons MVIC color mosaic (NASA/JHUAPL/SwRI)
  uranus/neptune  Hubble OPAL yearly global maps (MAST, CC BY 4.0)

Each map is downsampled to the project's equirectangular convention.
Grayscale mosaics are duotone-tinted (shadow -> highlight ramp) so they
carry the body's real hue — the baked-color compromise Titan's map uses
(SOL-61). Unimaged regions (Triton's north, Uranus's far south…) are
painted over with a low-frequency fill extrapolated from imaged terrain.

Run, then regenerate the low-res tier:
  python3 scripts/prepare-maps.py && ./scripts/make-low-tier.sh
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

Image.MAX_IMAGE_PIXELS = None  # Europa's 500 m mosaic exceeds PIL's default cap

SRC = Path("/tmp/moon-maps")
OUT = Path(__file__).resolve().parent.parent / "public" / "textures"

MAPS = {
    # ── moons: USGS global mosaics ─────────────────────────────────────
    "io": dict(src="Io_GalileoSSI-Voyager_Global_Mosaic_ClrMerge_1km.tif"),
    "ganymede": dict(src="Ganymede_Voyager_GalileoSSI_Global_ClrMosaic_1435m.tif"),
    "triton": dict(src="Triton_Voyager2_ClrMosaic_GlobalFill_600m.tif"),
    # rusty lineae over near-white ice; gamma pulls the bright haze apart
    # so the line network separates from the plains
    "europa": dict(
        src="Europa_Voyager_GalileoSSI_global_mosaic_500m.tif",
        ramp=("#7c5238", "#f6f1e8"), gamma=1.6,
    ),
    # the darkest big moon: deep umber craters, pale dirty-ice rims
    "callisto": dict(
        src="Callisto_Voyager_GalileoSSI_global_mosaic_1km.tif",
        ramp=("#3a332b", "#b3a58f"),
    ),
    # neutral gray ice, faintly warm (its red pole is lost in the grayscale source)
    "charon": dict(
        src="Charon_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.tif",
        ramp=("#4e4942", "#ded9d1"),
    ),
    # ── planets ────────────────────────────────────────────────────────
    # New Horizons MVIC color mosaic; the south was unlit during the flyby
    "pluto": dict(src="pluto_color.jpg"),
    # Hubble OPAL filter composites are native ~721x361 — no point upscaling
    # past 2x. Coverage is a clean latitude band with colored fringe
    # artifacts at its edges, so valid_band crops to measured clean rows
    # and the unobserved latitudes take the mirrored hemisphere (a gas
    # giant's banding is roughly latitude-symmetric). Uranus's southern
    # hemisphere currently faces away from Earth entirely.
    "uranus": dict(src="uranus_opal.tif", size=(1024, 512), valid_band=(0.0, 0.45), mirror=True),
    # stored f467m-f547m-f657n, i.e. blue channel first: reverse to RGB,
    # then white-balance to Neptune's deep blue (raw composite is teal).
    # HST's soft disc reads flat on a sphere, so the real cloud pattern is
    # punched up: saturation, contrast, and a latitude shade that deepens
    # the poles and brightens the equatorial band like Voyager's portraits.
    "neptune": dict(
        src="neptune_opal.tif", size=(1024, 512), valid_band=(0.40, 1.0), mirror=True,
        swap_rgb=True, balance="#33549f", degreen=True,
        saturation=1.3, contrast=1.08, lat_shade=(0.70, 0.42, 1.4),
    ),
}


def hex_rgb(c: str) -> tuple:
    return tuple(int(c[i : i + 2], 16) for i in (1, 3, 5))


def duotone(gray: Image.Image, shadow: str, highlight: str) -> Image.Image:
    lo, hi = hex_rgb(shadow), hex_rgb(highlight)
    luts = [[lo[c] + (hi[c] - lo[c]) * v // 255 for v in range(256)] for c in range(3)]
    return Image.merge("RGB", [gray.point(lut) for lut in luts])


def fill_gaps(img: Image.Image, dilate: int, valid_band=None, mirror=False) -> Image.Image:
    """Paint over unimaged regions — Triton's north, Ganymede's polar
    bands, Uranus's southern hemisphere. Pixels are invalid when near-black
    or outside valid_band (a (top, bottom) row-fraction crop for sources
    with edge artifacts, like OPAL's fringes). With mirror, gaps first take
    the latitude-mirrored pixel when that side is imaged — the natural
    guess for a gas giant's symmetric banding. Remaining gap pixels take
    the nearest imaged pixel in their column, far gaps converge on the
    body's bright-terrain mean (the coverage boundary is often
    terminator-dark), flattened to low frequencies so they read as
    featureless haze. Feathered masks hide the seams. A stylized
    compromise, like Titan's baked haze (SOL-61)."""
    src = np.asarray(img, dtype=np.uint8)
    lum = src if src.ndim == 2 else src.max(axis=2)
    h, w = lum.shape
    rows = np.arange(h)[:, None]
    # 25 catches the unimaged fill plus its darkest fringe while staying
    # well under real terrain (Callisto, the darkest moon, bottoms out ~36)
    invalid = lum < 25
    if valid_band is not None:
        top, bottom = (int(f * h) for f in valid_band)
        invalid |= (rows < top) | (rows >= bottom)
    if not invalid.any():
        return img
    arr = src.copy()
    if mirror:
        # crossfade to the mirrored hemisphere over ~48 rows instead of a
        # hard paste: banding is only roughly latitude-symmetric, so a hard
        # seam shows as a brightness step
        inv_below = np.maximum.accumulate(np.where(invalid, rows, -1), axis=0)
        inv_above = np.minimum.accumulate(np.where(invalid, rows, h)[::-1], axis=0)[::-1]
        gap_dist = np.minimum(
            np.where(inv_below < 0, 2 * h, rows - inv_below),
            np.where(inv_above >= h, 2 * h, inv_above - rows),
        )
        alpha = np.clip(1 - gap_dist / 48, 0, 1) * ~invalid[::-1]  # clean mirror pixels only
        arr = (arr * (1 - alpha[..., None]) + arr[::-1] * alpha[..., None]).astype(np.uint8)
        invalid = invalid & invalid[::-1]
    below = np.maximum.accumulate(np.where(~invalid, rows, -1), axis=0)
    above = np.minimum.accumulate(np.where(~invalid, rows, h)[::-1], axis=0)[::-1]
    # gaps touching an edge have no valid pixel on that side: distance = ∞
    dist_below = np.where(below < 0, 2 * h, rows - below)
    dist_above = np.where(above >= h, 2 * h, above - rows)
    nearest = np.clip(np.where(dist_above < dist_below, above, below), 0, h - 1)
    filled = arr[nearest, np.arange(w)[None, :]].astype(np.float32)
    lum = arr if arr.ndim == 2 else arr.max(axis=2)  # post-mirror luminance
    bright = arr[lum > np.percentile(lum[~invalid], 60)].mean(axis=0)
    weight = np.clip(np.minimum(dist_below, dist_above) / 80, 0, 1)
    filled += (np.atleast_1d(bright) - filled) * (weight[..., None] if arr.ndim == 3 else weight)
    base = Image.fromarray(arr)
    low = Image.fromarray(filled.astype(np.uint8))
    low = low.resize((64, 32), Image.LANCZOS).resize(img.size, Image.BILINEAR)
    hard = Image.fromarray(invalid.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(dilate))
    soft = np.asarray(hard.filter(ImageFilter.GaussianBlur(10)))
    # feather outward only: blurring must never thin the mask over the gap
    # itself, or the garbage underneath bleeds back through
    mask = Image.fromarray(np.maximum(soft, np.asarray(hard)))
    return Image.composite(low, base, mask)


def punch(img: Image.Image, saturation: float, contrast: float, lat_shade) -> Image.Image:
    """Amplify a flat telescope map so it reads on a sphere: saturation and
    contrast stretch around the global mean, and lat_shade = (base, amp,
    exp) scales brightness by base + amp * sin(latitude)^exp — dark poles,
    bright equatorial band."""
    arr = np.asarray(img, dtype=np.float32)
    if saturation != 1.0:
        gray = arr.mean(axis=2, keepdims=True)
        arr = gray + (arr - gray) * saturation
    if contrast != 1.0:
        arr = arr.mean() + (arr - arr.mean()) * contrast
    if lat_shade is not None:
        base, amp, exp = lat_shade
        y = np.linspace(0, 1, arr.shape[0])
        arr *= (base + amp * np.sin(np.pi * y) ** exp)[:, None, None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def white_balance(img: Image.Image, target: str) -> Image.Image:
    """Scale channels so the image's mean color lands on the target —
    detail is preserved, only the overall cast moves."""
    arr = np.asarray(img, dtype=np.float32)
    gain = np.array(hex_rgb(target)) / arr.reshape(-1, 3).mean(axis=0)
    return Image.fromarray(np.clip(arr * gain, 0, 255).astype(np.uint8))


for name, cfg in MAPS.items():
    ramp = cfg.get("ramp")
    img = Image.open(SRC / cfg["src"])
    img = img.convert("L" if ramp else "RGB")
    if cfg.get("swap_rgb"):
        img = Image.merge("RGB", img.split()[::-1])
    img = img.resize(cfg.get("size", (2048, 1024)), Image.LANCZOS)
    img = fill_gaps(img, cfg.get("dilate", 5), cfg.get("valid_band"), cfg.get("mirror", False))
    if ramp:
        # stretch first: the Voyager-era grayscale mosaics use a narrow band
        # of the histogram and would tint into a flat, washed-out sepia
        img = ImageOps.autocontrast(img, cutoff=1)
        gamma = cfg.get("gamma", 1.0)
        if gamma != 1.0:
            img = img.point([round(255 * (v / 255) ** gamma) for v in range(256)])
        img = duotone(img, *ramp)
    if cfg.get("balance"):
        img = white_balance(img, cfg["balance"])
    if cfg.get("degreen"):
        # OPAL fringe residue leaves green ghosts; a blue-dominant world's
        # green channel never legitimately exceeds the red/blue midpoint
        a = np.asarray(img).copy()
        a[..., 1] = np.minimum(a[..., 1], a[..., ::2].mean(axis=2) + 6)
        img = Image.fromarray(a)
    if {"saturation", "contrast", "lat_shade"} & cfg.keys():
        img = punch(img, cfg.get("saturation", 1.0), cfg.get("contrast", 1.0), cfg.get("lat_shade"))
    dest = OUT / f"{name}.jpg"
    img.save(dest, quality=85, optimize=True)
    print(f"{cfg['src']} -> {dest.name} ({dest.stat().st_size // 1024} KB)")
