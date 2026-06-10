import { useSim } from '../store'
import { LOCALES, useT } from '../i18n'
import { IconGlobe } from './icons'

/**
 * Always-visible language toggle, floating top-right. A user who can't read
 * the current language can never find a switcher buried inside a panel —
 * least of all on mobile, where the panel starts collapsed.
 */
export function LanguageSwitch() {
  const locale = useSim((s) => s.locale)
  const selected = useSim((s) => s.selected)
  const set = useSim((s) => s.set)
  const t = useT()
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0]
  const next = LOCALES[(LOCALES.indexOf(current) + 1) % LOCALES.length]

  return (
    <button
      // the desktop info panel occupies the top-right corner — step aside
      className={`lang-switch ${selected ? 'shifted' : ''}`}
      onClick={() => set({ locale: next.code })}
      aria-label={t.controls.language}
    >
      <IconGlobe /> {current.label}
    </button>
  )
}
