import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Render error:', error)
    console.error('[ErrorBoundary] Component stack:', info?.componentStack)
    this.setState({ info })
  }

  reset = () => {
    this.setState({ hasError: false, error: null, info: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const msg = this.state.error?.message || String(this.state.error)
    const stack = this.state.error?.stack || ''

    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-void)', color: 'var(--text-primary)',
        padding: 40, fontFamily: 'Inter, sans-serif', overflow: 'auto'
      }}>
        <div className="glass-card" style={{ maxWidth: 900, margin: '0 auto', padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <AlertTriangle size={26} color="#ff5a5f" />
            <h2 style={{ margin: 0, color: '#ff5a5f' }}>Algo quebrou no render</h2>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 14 }}>
            O erro abaixo foi capturado antes que o React desmontasse a árvore. Tire um print desta tela e mande:
          </p>

          <div style={{
            background: 'rgba(255,90,95,0.08)', border: '1px solid rgba(255,90,95,0.3)',
            borderRadius: 8, padding: 14, marginBottom: 12, fontFamily: 'monospace',
            fontSize: '0.82rem', color: '#fda4af', whiteSpace: 'pre-wrap', wordBreak: 'break-word'
          }}>
            {msg}
          </div>

          {stack && (
            <details style={{ marginBottom: 18 }}>
              <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 8 }}>
                Stack trace completo
              </summary>
              <pre style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
                borderRadius: 8, padding: 12, fontSize: '0.72rem', color: 'var(--text-muted)',
                overflowX: 'auto', maxHeight: 280
              }}>{stack}</pre>
            </details>
          )}

          {this.state.info?.componentStack && (
            <details style={{ marginBottom: 18 }}>
              <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 8 }}>
                Componentes envolvidos
              </summary>
              <pre style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
                borderRadius: 8, padding: 12, fontSize: '0.72rem', color: 'var(--text-muted)',
                overflowX: 'auto', maxHeight: 240
              }}>{this.state.info.componentStack}</pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={this.reset}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'transparent', color: 'var(--neon-cyan)',
                border: '1px solid var(--neon-cyan)', padding: '8px 14px',
                borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'
              }}>
              <RefreshCw size={14} /> Tentar continuar
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'transparent', color: 'var(--text-secondary)',
                border: '1px solid var(--border-glass)', padding: '8px 14px',
                borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'
              }}>
              Recarregar página
            </button>
          </div>
        </div>
      </div>
    )
  }
}
