import { PLANETS } from '../data/planets'
import { useSim } from '../store'
import { bodyName, customFactsFor, factsFor, fmt, useT } from '../i18n'
import { requestOverview } from '../cameraCommands'
import { IconRing, IconTarget, IconTrash, IconX } from './icons'

export function InfoPanel() {
  const selected = useSim((s) => s.selected)
  const following = useSim((s) => s.following)
  const customPlanets = useSim((s) => s.customPlanets)
  const set = useSim((s) => s.set)
  const removeCustomPlanet = useSim((s) => s.removeCustomPlanet)
  const t = useT()

  if (!selected) return null

  const planet = [...PLANETS, ...customPlanets].find((p) => p.name === selected)
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
                <dd>{planet.moons.map((m) => bodyName(m.name, t)).join(', ')}</dd>
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

      {following === selected ? (
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
        <button className="btn" onClick={() => set({ following: selected })}>
          <IconTarget /> {t.info.follow(displayName)}
        </button>
      )}
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
