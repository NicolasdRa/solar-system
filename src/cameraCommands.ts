/**
 * Imperative camera requests, decoupled from React so UI handlers and the
 * frame loop can talk without re-renders (and without exporting helpers
 * from component files, which breaks Fast Refresh).
 */
export const cameraCommands = {
  /** re-run the follow fly-in (scale-mode changes invalidate the offset) */
  flyIn: false,
  /** glide home to the current distance mode's overview vantage */
  overview: false,
}

export function requestFlyIn() {
  cameraCommands.flyIn = true
}

export function requestOverview() {
  cameraCommands.overview = true
}
