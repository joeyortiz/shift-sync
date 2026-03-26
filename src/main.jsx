import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('[Shift Sync] Render error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          width: '100vw', height: '100vh',
          background: '#0a0a0a',
          color: '#f87171',
          fontFamily: 'VT323, monospace',
          fontSize: 18,
          padding: 40,
          overflow: 'auto',
        }}>
          <div style={{ color: '#a855f7', fontSize: 28, marginBottom: 16 }}>
            SS  SHIFT SYNC — ERROR
          </div>
          <div style={{ color: '#facc15', marginBottom: 8 }}>
            A fatal error occurred. Check the browser console (F12) for details.
          </div>
          <div style={{ color: '#f87171', marginBottom: 20, whiteSpace: 'pre-wrap', fontSize: 16 }}>
            {String(this.state.error)}
          </div>
          <div style={{ color: '#888', marginBottom: 12 }}>
            Common fixes:
          </div>
          <div style={{ color: '#22d3ee', fontSize: 16, lineHeight: 1.8 }}>
            1. Make sure .env exists with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY{'\n'}
            2. Restart the dev server after editing .env{'\n'}
            3. Disable "Confirm email" in Supabase Auth settings
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 24,
              padding: '6px 20px',
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              fontFamily: 'VT323, monospace',
              fontSize: 20,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
