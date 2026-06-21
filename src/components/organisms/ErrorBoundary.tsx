'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from '../ui/Button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Captured Error via ErrorBoundary:', error, errorInfo);
    // Mock Sentry integration or external logging payload
    if (process.env.NODE_ENV === 'production') {
      // fetch('/api/logs/error', { method: 'POST', body: JSON.stringify({ error: error.message, stack: error.stack }) });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 select-none relative overflow-hidden font-sans text-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-rose-600/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="w-full max-w-md relative z-10 border border-slate-900 bg-slate-900/35 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 items-center justify-center text-rose-400 mb-6">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h2 className="text-xl font-bold text-slate-100 mb-2">
              Application Error
            </h2>

            <p className="text-sm text-slate-400 max-w-xs mx-auto mb-8 leading-relaxed">
              An unexpected error occurred in this workspace view. Don't worry, your progress has been auto-saved.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left overflow-x-auto text-3xs font-mono text-rose-400 max-h-40">
                {this.state.error.toString()}
                <br />
                {this.state.error.stack}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="secondary" onClick={() => (window.location.href = '/')} className="gap-2">
                <Home className="h-4 w-4" /> Go Home
              </Button>
              <Button onClick={this.handleReset} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Reload Workspace
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
