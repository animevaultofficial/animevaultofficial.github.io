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
    const base = document.querySelector('base')?.getAttribute('href') || '/';
    window.location.assign(`${base.replace(/\/?$/, '/')}#/`);
  };

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary-content">
            <AlertTriangle size={48} aria-hidden="true" />
            <h2>AnimeVault hit a problem</h2>
            <p>Please try again. If the problem continues, return to the home screen.</p>
            <div className="error-boundary-actions">
              <button className="button button-primary" onClick={this.retry}>
                Try Again
              </button>
              <button className="button button-secondary" onClick={this.goHome}>
                Go Home
              </button>
              <button className="button button-secondary" onClick={() => window.location.reload()}>
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
