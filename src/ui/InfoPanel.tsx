import { PLANETS } from '../data/planets'
import { useSim } from '../store'

const SUN_FACTS = {
  type: 'G-type main-sequence star',
  dayLength: '~27 Earth days (at equator)',
  yearLength: '230 million years around the galaxy',
  temperature: '5,505 °C surface · 15M °C core',
  funFact:
    'The Sun holds 99.86% of all mass in the solar system. A million Earths would fit inside it.',
}

export function InfoPanel() {
  const selected = useSim((s) => s.selected)
  const following = useSim((s) => s.following)
  const customPlanets = useSim((s) => s.customPlanets)
  const set = useSim((s) => s.set)
  const removeCustomPlanet = useSim((s) => s.removeCustomPlanet)

  if (!selected) return null

  const planet = [...PLANETS, ...customPlanets].find((p) => p.name === selected)
  const facts = selected === 'Sun' ? SUN_FACTS : planet?.facts
  if (!facts) return null
  const isCustom = customPlanets.some((p) => p.name === selected)

  return (
    <aside className="panel info-panel">
      <header>
        <h2>{selected}</h2>
        <button className="close-btn" onClick={() => set({ selected: null })} aria-label="Close">
          ×
        </button>
      </header>
      <p className="body-type">{facts.type}</p>

      <dl>
        {planet && (
          <>
            <dt>Mean radius</dt>
            <dd>{Math.round(planet.radiusKm).toLocaleString()} km</dd>
            <dt>Distance from Sun</dt>
            <dd>{planet.distanceAU} AU</dd>
            {planet.moons && planet.moons.length > 0 && (
              <>
                <dt>Moons shown</dt>
                <dd>{planet.moons.map((m) => m.name).join(', ')}</dd>
              </>
            )}
          </>
        )}
        <dt>Day length</dt>
        <dd>{facts.dayLength}</dd>
        <dt>Year length</dt>
        <dd>{facts.yearLength}</dd>
        <dt>Temperature</dt>
        <dd>{facts.temperature}</dd>
      </dl>

      <p className="fun-fact">{facts.funFact}</p>

      {following === selected ? (
        <button className="btn stop-btn" onClick={() => set({ following: null })}>
          ◎ Stop following
        </button>
      ) : (
        <button className="btn" onClick={() => set({ following: selected })}>
          ◉ Follow {selected}
        </button>
      )}
      {isCustom && (
        <button className="btn delete-btn" onClick={() => removeCustomPlanet(selected)}>
          🗑 Remove {selected} from the sky
        </button>
      )}
    </aside>
  )
}
