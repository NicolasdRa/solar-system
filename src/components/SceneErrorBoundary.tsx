import { Component, type ReactNode } from 'react'

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
      return (
        <div className="scene-error">
          <h2>Lost contact with the simulation</h2>
          <p>{this.state.error.message}</p>
          <button className="btn" onClick={() => window.location.reload()}>
            Re-establish link
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
