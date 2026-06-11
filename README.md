# Solar System & Beyond

An interactive 3D solar system built with **React Three Fiber** (Three.js), TypeScript and Vite.

Planet surfaces use real NASA-imagery-derived maps from
[Solar System Scope](https://www.solarsystemscope.com/textures/) (CC BY 4.0, bundled in
`public/textures/`). Saturn's icy moons use the Cassini global color mosaics
([PIA18434–PIA18439](https://photojournal.jpl.nasa.gov/catalog/PIA18434), NASA/JPL-Caltech/SSI/LPI);
Titan uses the [Cassini ISS infrared surface mosaic](https://astrogeology.usgs.gov/search/map/titan_cassini_iss_global_mosaic_4005m)
(NASA/JPL-Caltech/SSI/USGS) pre-tinted with its haze color, since the visible-light surface is hidden.
The Galilean moons, Triton and Charon use [USGS Astrogeology](https://astrogeology.usgs.gov/search) global
mosaics (NASA/JPL/USGS; Charon: NASA/JHUAPL/SwRI), prepared by `scripts/prepare-maps.py`: Europa,
Callisto and Charon exist only as grayscale products and are duotone-tinted to their real hues, and
Triton's unimaged northern hemisphere is filled with low-frequency haze extrapolated from the imaged
terrain. No usable public-domain global map exists for the Uranian moons (Voyager 2 saw only their
southern hemispheres), so they keep procedural colors.
Pluto uses the [New Horizons MVIC color mosaic](https://science.nasa.gov/resource/pluto-global-color-map/)
(NASA/JHUAPL/SwRI). Uranus and Neptune use real Hubble global maps from the
[OPAL program](https://archive.stsci.edu/hlsp/opal) (CC BY 4.0, DOI 10.17909/T9G593, NASA/ESA/STScI,
Simon & Wong) — their unobserved latitudes mirror the imaged hemisphere. Procedurally painted canvas
textures remain as the automatic fallback — they cover custom planets, minor moons, and offline/failed loads.

## Run it

```sh
npm install
npm run dev
```

## Features

- **8 planets + Pluto** with real orbital data: eccentricity, inclination, axial tilt,
  retrograde rotation (Venus, Uranus), Saturn's and Uranus's rings, and **26 major
  moons** — every gravitationally rounded moon plus historically notable small ones,
  orbiting their planet's equatorial plane (Uranus's family stands on its side)
- **True Kepler motion** — Kepler's equation is solved each frame (Newton–Raphson), so
  planets sweep faster near perihelion; positions are computed from J2000 orbital
  elements and the sim starts at *today's real planetary positions*
- **Earth atmosphere** — independently drifting cloud layer plus a blue limb glow;
  Jupiter gets a Great Red Spot, Mars gets polar caps
- **Asteroid belt & Kuiper belt** — thousands of instanced rocks, one draw call each
- **Time warp** — 0.1 days/s up to ~2.7 years/s, pausable
- **Three distance scales** — compressed (everything visible), realistic (linear in AU),
  or **to scale**: Sun, planets and distances on one true ruler (1 AU ≈ 23,500 Earth
  radii) — the Sun is a glowing dot, planets are specks on their orbit lines, and the
  emptiness of space is the point
- **Two size scales** — balanced (sqrt-compressed) or true ratio (planet and moon sizes
  in exact proportion: Jupiter is 11× Earth, Pluto a speck; the Sun grows toward its
  real 109× Earth but is capped just inside Mercury's orbit, since Mercury really
  orbits at only ~84 solar radii)
- **Click any body** for facts; **follow** it as it orbits
- **Discover a new planet** — procedurally generates a custom world following real
  system architecture (frost line, Kepler's third law, mass-correlated rings/moons);
  custom planets can be deleted again from their info panel
- Bloom-glowing sun, 9,000-star background, orbit lines, toggleable labels

## Architecture notes

| Piece | Where | Why |
|---|---|---|
| Planet/moon data | `src/data/planets.ts` | scene is fully data-driven — add a body by adding a record |
| Simulation clock | `src/clock.ts` | lives outside React state; mutating it doesn't re-render the tree |
| UI state | `src/store.ts` (zustand) | shared between control panels and the 3D scene |
| Scale model | `src/scale.ts` | power-curve distance compression + sqrt radius compression |
| Procedural textures | `src/textures.ts` | canvas-painted surfaces, ring texture is a 256×1 radial strip |
| Orbital mechanics | `src/orbit.ts` | Kepler solver + ellipse paths, shared by planets and orbit lines |
| Custom planet generator | `src/data/customPlanet.ts` | frost-line architecture: rocky worlds inside ~3.5 AU, giants beyond, Kepler's third law, mass-correlated rings/moons |

In dev mode, `window.__solar` exposes the sim clock, body positions, camera and controls
for debugging and scripted verification.
