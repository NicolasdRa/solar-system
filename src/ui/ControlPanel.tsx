import { useEffect, useRef, useState } from 'react'
import { PLANETS } from '../data/planets'
import { daysSinceJ2000, simClock, simDate } from '../clock'
import { useSim } from '../store'

/**
 * Polls the (non-React) sim clock a few times a second. The date is an
 * editable input — picking a date is time travel. Polling pauses while
 * the input is focused so it doesn't fight the user's typing.
 */
function SimDate() {
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
        aria-label="Simulated date — pick one to travel in time"
      />
      <button className="btn today-btn" onClick={() => travelTo(new Date().toISOString().slice(0, 10))}>
        Today
      </button>
    </div>
  )
}

function formatSpan(daysPerSecond: number): string {
  if (daysPerSecond >= 365) return `${(daysPerSecond / 365.25).toFixed(1)} years`
  if (daysPerSecond >= 1) return `${daysPerSecond.toFixed(0)} days`
  if (daysPerSecond * 24 >= 1) return `${(daysPerSecond * 24).toFixed(1)} hours`
  return `${(daysPerSecond * 1440).toFixed(0)} minutes`
}

export function ControlPanel() {
  const sim = useSim()
  const bodies = [...PLANETS, ...sim.customPlanets]

  return (
    <aside className="panel control-panel">
      <h2>Mission Control</h2>
      <SimDate />

      <div className="row">
        <button
          className={`btn dir-btn ${sim.timeDirection === -1 ? 'reversed' : ''}`}
          onClick={() => sim.set({ timeDirection: sim.timeDirection === 1 ? -1 : 1 })}
          title={sim.timeDirection === 1 ? 'Time runs forward — click to reverse' : 'Time runs backward — click for forward'}
        >
          {sim.timeDirection === 1 ? '▶▶' : '◀◀'}
        </button>
        <button className="btn" onClick={() => sim.set({ paused: !sim.paused })}>
          {sim.paused ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>

      <label className="slider-label">
        Time warp
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
            ? 'paused — resume to let time flow'
            : `1 second here ≈ ${formatSpan(sim.timeScale)} ${sim.timeDirection === 1 ? 'into the future' : 'into the past'}`}
        </span>
      </label>

      <label className="slider-label">
        Planet size ×{sim.planetScale.toFixed(1)}
        <input
          type="range"
          min={0.5}
          max={4}
          step={0.1}
          value={sim.planetScale}
          onChange={(e) => sim.set({ planetScale: Number(e.target.value) })}
        />
      </label>

      <div className="divider" />

      <div className="row toggles">
        <label>
          <input
            type="checkbox"
            checked={sim.showOrbits}
            onChange={(e) => sim.set({ showOrbits: e.target.checked })}
          />
          Orbits
        </label>
        <label>
          <input
            type="checkbox"
            checked={sim.showLabels}
            onChange={(e) => sim.set({ showLabels: e.target.checked })}
          />
          Labels
        </label>
        <label>
          <input
            type="checkbox"
            checked={sim.showBelts}
            onChange={(e) => sim.set({ showBelts: e.target.checked })}
          />
          Belts
        </label>
        <label title="Animated solar surface, flares and prominences">
          <input
            type="checkbox"
            checked={sim.showStorms}
            onChange={(e) => sim.set({ showStorms: e.target.checked })}
          />
          Storms
        </label>
      </div>

      <div className="row mode-row">
        <span>Distances</span>
        <div className="segmented">
          <button
            className={sim.distanceMode === 'compressed' ? 'active' : ''}
            onClick={() => sim.set({ distanceMode: 'compressed' })}
          >
            Compressed
          </button>
          <button
            className={sim.distanceMode === 'realistic' ? 'active' : ''}
            onClick={() => sim.set({ distanceMode: 'realistic' })}
          >
            Realistic
          </button>
          <button
            className={sim.distanceMode === 'true' ? 'active' : ''}
            onClick={() => sim.set({ distanceMode: 'true' })}
            title="Sun, planets and distances on one true ruler — space gets very empty"
          >
            To scale
          </button>
        </div>
      </div>

      <div className="row mode-row">
        <span>Sizes</span>
        <div className="segmented">
          <button
            className={sim.sizeMode === 'balanced' ? 'active' : ''}
            disabled={sim.distanceMode === 'true'}
            onClick={() => sim.set({ sizeMode: 'balanced' })}
            title={sim.distanceMode === 'true' ? 'Sizes are always true in To-scale mode' : undefined}
          >
            Balanced
          </button>
          <button
            className={sim.sizeMode === 'true' ? 'active' : ''}
            disabled={sim.distanceMode === 'true'}
            onClick={() => sim.set({ sizeMode: 'true' })}
            title="True size ratios; the Sun grows toward its real 109× Earth, capped just inside Mercury's orbit"
          >
            True ratio
          </button>
        </div>
      </div>

      <div className="divider" />

      <h3>Bodies</h3>
      <div className="body-grid">
        <button className="body-btn" onClick={() => useSim.getState().set({ selected: 'Sun' })}>
          Sun
        </button>
        {bodies.map((planet) => (
          <button
            key={planet.name}
            className={`body-btn ${sim.selected === planet.name ? 'active' : ''}`}
            onClick={() => sim.set({ selected: planet.name })}
          >
            {planet.name}
          </button>
        ))}
      </div>

      <button className="btn add-btn" onClick={sim.addCustomPlanet}>
        ✨ Discover a new planet
      </button>

      {sim.following && (
        <button className="btn stop-btn" onClick={() => sim.set({ following: null })}>
          ◎ Stop following {sim.following}
        </button>
      )}

      <p className="credits">
        Planet maps:{' '}
        <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">
          Solar System Scope
        </a>{' '}
        (CC BY 4.0)
      </p>
    </aside>
  )
}
