import React, { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  goHome = () => {
    // AnimeVault uses HashRouter, so '/' can point to the server root and
    // leave the app outside the router. Always return to the hash route.
    const base = document.querySelector('base')?.getAttribute('href') || '/';
    window.location.assign(`${base.replace(/\/?$/, '/') }#/`);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <AlertTriangle size={48} color="#ef4444" aria-hidden="true" />
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button
              className="button button-primary"
              onClick={this.goHome}
            >
              Go Home
            </button>
            <button
              className="button button-secondary"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
