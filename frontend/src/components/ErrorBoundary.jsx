// filepath: frontend/src/components/ErrorBoundary.jsx
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AEGIS-IoT Workbench Runtime Error caught by Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0D1117] text-white flex flex-col items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-[#161B22] border border-rose-900/60 rounded-xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 font-pixel tracking-wide">
                WORKBENCH RECOVERY
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                An unexpected UI state occurred. All telemetry and engine states are preserved.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 bg-[#090D13] rounded-lg border border-slate-800 text-[11px] font-mono text-rose-300/90 text-left overflow-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Workbench
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
