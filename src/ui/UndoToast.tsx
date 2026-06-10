import { useEffect } from 'react'
import { useSim } from '../store'
import { bodyName, useT } from '../i18n'

const UNDO_WINDOW_MS = 6000

/**
 * Deleting a custom planet is reversible for a few seconds: the planet is
 * parked in `removedPlanet` and only truly gone once this toast expires.
 */
export function UndoToast() {
  const removed = useSim((s) => s.removedPlanet)
  const restore = useSim((s) => s.restoreRemovedPlanet)
  const dismiss = useSim((s) => s.dismissRemovedPlanet)
  const t = useT()

  useEffect(() => {
    if (!removed) return
    const id = setTimeout(dismiss, UNDO_WINDOW_MS)
    return () => clearTimeout(id)
  }, [removed, dismiss])

  if (!removed) return null

  return (
    <div className="undo-toast" role="status">
      <span>{t.toast.removed(bodyName(removed.name, t))}</span>
      <button className="btn" onClick={restore}>
        {t.toast.restore}
      </button>
    </div>
  )
}
