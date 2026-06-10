import { useEffect, useRef, useState } from 'react'
import { PLANETS } from '../data/planets'
import { daysSinceJ2000, simClock, simDate } from '../clock'
import { useSim } from '../store'
import { ONE_DECIMAL, bodyName, fmt, useT, type Translation } from '../i18n'
import { requestOverview } from '../cameraCommands'
import {
  IconForward,
  IconHome,
  IconPause,
  IconPlay,
  IconRewind,
  IconRing,
  IconSliders,
  IconSparkle,
  IconX,
} from './icons'

/**
 * Polls the (non-React) sim clock a few times a second. The date is an
 * editable input — picking a date is time travel. Polling pauses while
 * the input is focused so it doesn't fight the user's typing.
 */
function SimDate() {
  const t = useT()
  const [iso, setIso] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const sync = () => {
      if (document.activeElement === inputRef.current) return
      const d = simDate()
      if (!Number.isNaN(d.getTime())) setIso(d.toISOString().slice(0, 10))
    }
    sync()
    const id = setInterval(sync, 250)
    return () => clearInterval(id)
  }, [])

  const travelTo = (value: string) => {
    setIso(value)
    if (!value) return
    const target = new Date(`${value}T12:00:00Z`)
    if (!Number.isNaN(target.getTime())) simClock.days = daysSinceJ2000(target)
  }

  return (
    <div className="sim-date-row">
      <input
        ref={inputRef}
        className="date-input"
        type="date"
        value={iso}
        onChange={(e) => travelTo(e.target.value)}
        aria-label={t.controls.dateAria}
      />
      <button className="btn today-btn" onClick={() => travelTo(new Date().toISOString().slice(0, 10))}>
        {t.controls.today}
      </button>
    </div>
  )
}

function formatSpan(daysPerSecond: number, t: Translation): string {
  if (daysPerSecond >= 365) return t.units.years(fmt(daysPerSecond / 365.25, t, ONE_DECIMAL))
  if (daysPerSecond >= 1) return t.units.days(fmt(daysPerSecond, t, { maximumFractionDigits: 0 }))
  if (daysPerSecond * 24 >= 1) return t.units.hours(fmt(daysPerSecond * 24, t, ONE_DECIMAL))
  return t.units.minutes(fmt(daysPerSecond * 1440, t, { maximumFractionDigits: 0 }))
}

export function ControlPanel() {
  const sim = useSim()
  const t = useT()
  const bodies = [...PLANETS, ...sim.customPlanets]
  // bottom-sheet state; only relevant on small screens (the toggle is
  // display:none on desktop and the panel ignores .open there)
  const [open, setOpen] = useState(false)

  // picking a body opens the info sheet — get the controls out of its way
  // (state-adjustment-during-render pattern; see react.dev "You Might Not
  // Need an Effect")
  const [prevSelected, setPrevSelected] = useState(sim.selected)
  if (sim.selected !== prevSelected) {
    setPrevSelected(sim.selected)
    if (sim.selected) setOpen(false)
  }

  return (
    <>
    {!sim.selected && !open && (
      <button
        className="sheet-toggle"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mission-control"
      >
        <IconSliders /> {t.controls.openSheet}
      </button>
    )}
    <aside id="mission-control" className={`panel control-panel ${open ? 'open' : ''}`}>
      <div className="sheet-head">
        <h2>{t.controls.title}</h2>
        <button className="sheet-close" onClick={() => setOpen(false)} aria-label={t.controls.closeSheet}>
          <IconX />
        </button>
      </div>

      <SimDate />

      <div className="row">
        <button
          className={`btn dir-btn ${sim.timeDirection === -1 ? 'reversed' : ''}`}
          onClick={() => sim.set({ timeDirection: sim.timeDirection === 1 ? -1 : 1 })}
          title={sim.timeDirection === 1 ? t.controls.timeForwardTitle : t.controls.timeBackwardTitle}
        >
          {sim.timeDirection === 1 ? <IconForward /> : <IconRewind />}
        </button>
        <button className="btn" onClick={() => sim.set({ paused: !sim.paused })}>
          {sim.paused ? <IconPlay /> : <IconPause />} {sim.paused ? t.controls.resume : t.controls.pause}
        </button>
        <button
          className="btn overview-btn"
          onClick={() => {
            sim.set({ following: null })
            requestOverview()
          }}
          title={t.controls.overviewTitle}
          aria-label={t.controls.overviewTitle}
        >
          <IconHome />
        </button>
      </div>

      <label className="slider-label">
        {t.controls.timeWarp}
        <input
          type="range"
          min={-2}
          max={3}
          step={0.05}
          value={Math.log10(sim.timeScale)}
          onChange={(e) => sim.set({ timeScale: Math.pow(10, Number(e.target.value)) })}
        />
        <span className="hint">
          {sim.paused
            ? t.controls.pausedHint
            : t.controls.speedHint(formatSpan(sim.timeScale, t), sim.timeDirection === 1)}
        </span>
      </label>

      <div className="divider" />

      <h3>{t.controls.bodies}</h3>
      <div className="body-grid">
        <button
          className={`body-btn sun-btn ${sim.selected === 'Sun' ? 'active' : ''}`}
          onClick={() => sim.set({ selected: 'Sun' })}
        >
          {bodyName('Sun', t)}
        </button>
        {bodies.map((planet) => (
          <button
            key={planet.name}
            className={`body-btn ${sim.selected === planet.name ? 'active' : ''} ${
              sim.customPlanets.some((p) => p.name === planet.name) ? 'custom-btn' : ''
            }`}
            onClick={() => sim.set({ selected: planet.name })}
          >
            {bodyName(planet.name, t)}
          </button>
        ))}
      </div>

      <button className="btn add-btn" onClick={sim.addCustomPlanet}>
        <IconSparkle /> {t.controls.discover}
      </button>

      {sim.following && (
        <button
          className="btn stop-btn"
          onClick={() => {
            sim.set({ following: null })
            requestOverview()
          }}
        >
          <IconRing /> {t.controls.stopFollowing(bodyName(sim.following, t))}
        </button>
      )}

      <div className="divider" />

      <div className="row toggles">
        <label>
          <input
            type="checkbox"
            checked={sim.showOrbits}
            onChange={(e) => sim.set({ showOrbits: e.target.checked })}
          />
          {t.controls.orbits}
        </label>
        <label>
          <input
            type="checkbox"
            checked={sim.showMoonOrbits}
            onChange={(e) => sim.set({ showMoonOrbits: e.target.checked })}
          />
          {t.controls.moonOrbits}
        </label>
        <label>
          <input
            type="checkbox"
            checked={sim.showLabels}
            onChange={(e) => sim.set({ showLabels: e.target.checked })}
          />
          {t.controls.labels}
        </label>
        <label>
          <input
            type="checkbox"
            checked={sim.showBelts}
            onChange={(e) => sim.set({ showBelts: e.target.checked })}
          />
          {t.controls.belts}
        </label>
        <label title={t.controls.stormsTitle}>
          <input
            type="checkbox"
            checked={sim.showStorms}
            onChange={(e) => sim.set({ showStorms: e.target.checked })}
          />
          {t.controls.storms}
        </label>
        {/* tooltips don't exist on touch — surface the explanation inline */}
        <span className="hint touch-hint">
          {t.controls.storms} — {t.controls.stormsTitle}
        </span>
      </div>

      <h3>{t.controls.scale}</h3>

      <label className="slider-label">
        {t.controls.planetSize(fmt(sim.planetScale, t, ONE_DECIMAL))}
        <input
          type="range"
          min={0.5}
          max={4}
          step={0.1}
          value={sim.planetScale}
          onChange={(e) => sim.set({ planetScale: Number(e.target.value) })}
        />
      </label>

      <div className="row mode-row">
        <span>{t.controls.distances}</span>
        <div className="segmented">
          <button
            className={sim.distanceMode === 'compressed' ? 'active' : ''}
            onClick={() => sim.set({ distanceMode: 'compressed' })}
          >
            {t.controls.compressed}
          </button>
          <button
            className={sim.distanceMode === 'realistic' ? 'active' : ''}
            onClick={() => sim.set({ distanceMode: 'realistic' })}
          >
            {t.controls.realistic}
          </button>
          <button
            className={sim.distanceMode === 'true' ? 'active' : ''}
            onClick={() => sim.set({ distanceMode: 'true' })}
            title={t.controls.toScaleTitle}
          >
            {t.controls.toScale}
          </button>
        </div>
        {sim.distanceMode === 'true' && <span className="hint">{t.controls.toScaleTitle}</span>}
      </div>

      <div className="row mode-row">
        <span>{t.controls.sizes}</span>
        <div className="segmented">
          <button
            className={sim.sizeMode === 'balanced' ? 'active' : ''}
            disabled={sim.distanceMode === 'true'}
            onClick={() => sim.set({ sizeMode: 'balanced' })}
            title={sim.distanceMode === 'true' ? t.controls.sizesLockedTitle : undefined}
          >
            {t.controls.balanced}
          </button>
          <button
            className={sim.sizeMode === 'true' ? 'active' : ''}
            disabled={sim.distanceMode === 'true'}
            onClick={() => sim.set({ sizeMode: 'true' })}
            title={t.controls.trueRatioTitle}
          >
            {t.controls.trueRatio}
          </button>
        </div>
        {sim.distanceMode === 'true' ? (
          <span className="hint">{t.controls.sizesLockedTitle}</span>
        ) : (
          sim.sizeMode === 'true' && <span className="hint">{t.controls.trueRatioTitle}</span>
        )}
      </div>

      <p className="credits">
        {t.controls.credits}{' '}
        <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">
          Solar System Scope
        </a>{' '}
        (CC BY 4.0) · Phobos & Deimos:{' '}
        <a href="https://github.com/Stellarium/stellarium" target="_blank" rel="noreferrer">
          Stellarium
        </a>{' '}
        (GPL-2.0) · Mimas–Iapetus:{' '}
        <a href="https://photojournal.jpl.nasa.gov/catalog/PIA18434" target="_blank" rel="noreferrer">
          Cassini
        </a>{' '}
        (NASA/JPL/SSI/LPI)
      </p>
    </aside>
    </>
  )
}
