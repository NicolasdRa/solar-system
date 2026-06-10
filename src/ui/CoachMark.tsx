import { useEffect } from 'react'
import { useSim } from '../store'
import { useT } from '../i18n'
import { IconX } from './icons'

/**
 * One-time gesture hint for touch devices, where the desktop tagline is
 * hidden and `title` tooltips don't exist. Dismissed explicitly, or
 * automatically the first time the user selects a body — at that point
 * they've discovered the scene is interactive, which is the whole lesson.
 * Only rendered on the small-screen layout (CSS hides it elsewhere).
 */
export function CoachMark() {
  const dismissed = useSim((s) => s.coachDismissed)
  const selected = useSim((s) => s.selected)
  const set = useSim((s) => s.set)
  const t = useT()

  useEffect(() => {
    if (!dismissed && selected) set({ coachDismissed: true })
  }, [dismissed, selected, set])

  if (dismissed) return null

  return (
    <div className="coach-line" role="note">
      <span>{t.app.coach}</span>
      <button onClick={() => set({ coachDismissed: true })} aria-label={t.app.coachDismiss}>
        <IconX />
      </button>
    </div>
  )
}
