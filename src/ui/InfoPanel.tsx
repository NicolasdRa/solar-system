import { Fragment } from 'react'
import { PLANETS, type MoonData, type PlanetData } from '../data/planets'
import { useSim } from '../store'
import { ONE_DECIMAL, bodyName, customFactsFor, factsFor, fmt, moonFactFor, useT, type Translation } from '../i18n'
import { requestOverview } from '../cameraCommands'
import { IconRing, IconTarget, IconTrash, IconX } from './icons'

/** Follow / stop-following toggle, shared by the planet and moon views. */
function FollowButton({ name, displayName }: { name: string; displayName: string }) {
  const following = useSim((s) => s.following)
  const set = useSim((s) => s.set)
  const t = useT()
  return following === name ? (
    <button
      className="btn stop-btn"
      onClick={() => {
        set({ following: null })
        requestOverview()
      }}
    >
      <IconRing /> {t.info.stopFollowing}
    </button>
  ) : (
    <button className="btn" onClick={() => set({ following: name })}>
      <IconTarget /> {t.info.follow(displayName)}
    </button>
  )
}

/** Info panel for a major moon: parentage, real size, orbit, fun fact, follow. */
function MoonPanel({ moon, parent, t }: { moon: MoonData; parent: PlanetData; t: Translation }) {
  const set = useSim((s) => s.set)
  const displayName = bodyName(moon.name, t)
  const funFact = moonFactFor(moon, t)
  return (
    <aside className="panel info-panel">
      <header>
        <h2>{displayName}</h2>
        <button className="close-btn" onClick={() => set({ selected: null })} aria-label={t.info.close}>
          <IconX />
        </button>
      </header>
      <p className="body-type">
        <button className="moon-link" onClick={() => set({ selected: parent.name })}>
          {t.info.moonOf(bodyName(parent.name, t))}
        </button>
      </p>

      <dl>
        {moon.radiusKm && (
          <>
            <dt>{t.info.meanRadius}</dt>
            <dd>{fmt(moon.radiusKm, t)} {t.units.km}</dd>
          </>
        )}
        <dt>{t.info.distanceFromPlanet(bodyName(parent.name, t))}</dt>
        <dd>{fmt(moon.aKm, t)} {t.units.km}</dd>
        <dt>{t.info.orbitalPeriod}</dt>
        <dd>
          {t.units.days(fmt(Math.abs(moon.period), t, ONE_DECIMAL))}
          {moon.period < 0 && ` (${t.info.retrograde})`}
        </dd>
      </dl>

      {funFact && <p className="fun-fact">{funFact}</p>}

      <FollowButton name={moon.name} displayName={displayName} />
    </aside>
  )
}

export function InfoPanel() {
  const selected = useSim((s) => s.selected)
  const following = useSim((s) => s.following)
  const customPlanets = useSim((s) => s.customPlanets)
  const set = useSim((s) => s.set)
  const removeCustomPlanet = useSim((s) => s.removeCustomPlanet)
  const t = useT()

  if (!selected) return null

  const bodies = [...PLANETS, ...customPlanets]
  const planet = bodies.find((p) => p.name === selected)

  if (!planet) {
    for (const parent of bodies) {
      const moon = parent.moons?.find((m) => m.name === selected && m.major)
      if (moon) return <MoonPanel moon={moon} parent={parent} t={t} />
    }
  }

  const isCustom = customPlanets.some((p) => p.name === selected)
  // custom planets carry English-only generated facts in localStorage, so
  // their display facts are rebuilt from physical data in the active locale
  const facts = isCustom && planet ? customFactsFor(planet, t) : factsFor(selected, planet, t)
  if (!facts) return null
  const displayName = bodyName(selected, t)

  return (
    <aside className="panel info-panel">
      <header>
        <h2>{displayName}</h2>
        <button className="close-btn" onClick={() => set({ selected: null })} aria-label={t.info.close}>
          <IconX />
        </button>
      </header>
      <p className="body-type">{facts.type}</p>

      <dl>
        {planet && (
          <>
            <dt>{t.info.meanRadius}</dt>
            <dd>{fmt(Math.round(planet.radiusKm), t)} {t.units.km}</dd>
            <dt>{t.info.distanceFromSun}</dt>
            <dd>{fmt(planet.distanceAU, t, { maximumFractionDigits: 2 })} {t.units.au}</dd>
            {planet.moons && planet.moons.length > 0 && (
              <>
                <dt>{t.info.moonsShown}</dt>
                <dd>
                  {planet.moons.map((m, i) => (
                    <Fragment key={m.name}>
                      {i > 0 && ', '}
                      {m.major ? (
                        <button className="moon-link" onClick={() => set({ selected: m.name })}>
                          {bodyName(m.name, t)}
                        </button>
                      ) : (
                        bodyName(m.name, t)
                      )}
                    </Fragment>
                  ))}
                </dd>
              </>
            )}
          </>
        )}
        <dt>{t.info.dayLength}</dt>
        <dd>{facts.dayLength}</dd>
        <dt>{t.info.yearLength}</dt>
        <dd>{facts.yearLength}</dd>
        <dt>{t.info.temperature}</dt>
        <dd>{facts.temperature}</dd>
      </dl>

      <p className="fun-fact">{facts.funFact}</p>

      <FollowButton name={selected} displayName={displayName} />
      {isCustom && (
        <button
          className="btn delete-btn"
          onClick={() => {
            const wasFollowing = following === selected
            removeCustomPlanet(selected)
            // deleting the planet you're riding would strand the camera at
            // its last position — glide home instead
            if (wasFollowing) requestOverview()
          }}
        >
          <IconTrash /> {t.info.remove(displayName)}
        </button>
      )}
    </aside>
  )
}
