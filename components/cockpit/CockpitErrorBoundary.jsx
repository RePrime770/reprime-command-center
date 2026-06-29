import React from 'react';

// Top-level error boundary for the cockpit. React error boundaries must be
// classes (no hooks API for this). Renders a calm fallback when any descendant
// throws — the cockpit stays mounted so the user isn't dumped on a blank screen.
export default class CockpitErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Best-effort log. Server gets a beacon so Sentry's onRequestError can pick
    // it up via the /api/health endpoint logs — ignore failures (the boundary
    // itself must not throw).
    if (typeof console !== 'undefined' && console.error) {
      console.error('[CockpitErrorBoundary]', error, info?.componentStack);
    }
    try {
      const body = JSON.stringify({
        kind: 'cockpit_error',
        message: error?.message || String(error),
        stack: error?.stack || null,
        componentStack: info?.componentStack || null,
      });
      fetch('/api/health', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Swallow — boundary must remain stable.
    }
  }

  reset() {
    this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#0F172A', color: '#FFFFFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', sans-serif", padding: 32, zIndex: 9999,
      }}>
        <div style={{ maxWidth: 520, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#FFCC33', marginBottom: 12 }}>
            Something broke.
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 20, opacity: 0.9 }}>
            The cockpit kept itself open. Try refresh (Cmd+R) — if it keeps
            happening, send a screenshot.
          </div>
          <button type="button" onClick={this.reset} style={{
            background: '#FFCC33', color: '#0F172A', border: 'none',
            borderRadius: 8, padding: '10px 22px', fontSize: 16, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Try again
          </button>
        </div>
      </div>
    );
  }
}
