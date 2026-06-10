import type { SVGProps } from 'react'

/**
 * Single-family stroke icon set (24-grid, 1.8 stroke, currentColor) —
 * replaces the mixed emoji/Unicode glyphs so every control speaks the
 * same visual language. All icons are decorative; buttons carry the text.
 */
function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  )
}

/** four-point star — the discover moment */
export function IconSparkle(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 3l2.1 6.9L21 12l-6.9 2.1L12 21l-2.1-6.9L3 12l6.9-2.1z" />
    </Svg>
  )
}

export function IconSliders(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <line x1="4" y1="8" x2="20" y2="8" />
      <circle cx="9.5" cy="8" r="2.4" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <circle cx="14.5" cy="16" r="2.4" />
    </Svg>
  )
}

export function IconX(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </Svg>
  )
}

export function IconHome(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 9.5V20h14V9.5" />
    </Svg>
  )
}

export function IconPlay(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M8 5l11 7-11 7z" />
    </Svg>
  )
}

export function IconPause(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <line x1="9" y1="5" x2="9" y2="19" />
      <line x1="15" y1="5" x2="15" y2="19" />
    </Svg>
  )
}

export function IconForward(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M3 5l8 7-8 7z" />
      <path d="M13 5l8 7-8 7z" />
    </Svg>
  )
}

export function IconRewind(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M21 5l-8 7 8 7z" />
      <path d="M11 5l-8 7 8 7z" />
    </Svg>
  )
}

/** crosshair with center dot — actively tracking */
export function IconTarget(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  )
}

/** open ring — tracking released */
export function IconRing(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="7.5" />
    </Svg>
  )
}

export function IconGlobe(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <ellipse cx="12" cy="12" rx="3.8" ry="8.5" />
      <path d="M4 9.5h16" />
      <path d="M4 14.5h16" />
    </Svg>
  )
}

export function IconTrash(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V4.5h6V7" />
      <path d="M18.5 7l-1 13.5h-11L5.5 7" />
      <line x1="10" y1="11" x2="10" y2="16.5" />
      <line x1="14" y1="11" x2="14" y2="16.5" />
    </Svg>
  )
}
