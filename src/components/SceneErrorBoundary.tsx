import { Component, type ReactNode } from 'react'
import { useSim } from '../store'
import { TRANSLATIONS } from '../i18n'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * If anything inside the Canvas throws during render, React unmounts the
 * whole WebGL context and the screen goes black. This boundary catches the
 * error and offers a reload instead.
 */
export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      // class components can't use hooks; the error screen is a dead end
      // (only escape is a full reload), so a non-reactive read is enough
      const t = TRANSLATIONS[useSim.getState().locale]
      return (
        <div className="scene-error">
          <h2>{t.error.title}</h2>
          <p>{t.error.body}</p>
          <details>
            <summary>{t.error.details}</summary>
            <p>{this.state.error.message}</p>
          </details>
          <button className="btn" onClick={() => window.location.reload()}>
            {t.error.reload}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
