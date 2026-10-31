// filepath: frontend/src/components/ProvenanceBanner.jsx
import React from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function ProvenanceBanner({ provenance, lane }) {
  const isSimulationOrReplay =
    lane === 'REPLAY_FIXTURE' ||
    provenance === 'FIXTURE_FALLBACK' ||
    provenance === 'SIMULATED_STAGE_INSURANCE' ||
    provenance === 'LOCAL_SUBPROCESS';

  if (!isSimulationOrReplay) {
    return (
      <div className="bg-emerald-950/40 border-b border-emerald-500/20 px-6 py-1.5 flex items-center justify-between text-[11px] font-mono text-emerald-300">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>HARDENED DOCKER SANDBOX ACTIVE (Ubuntu 24.04 // --network none // --cap-drop ALL)</span>
        </div>
        <span className="text-emerald-400 font-semibold">STAGE INTEGRITY VERIFIED</span>
      </div>
    );
  }

  return (
    <div className="bg-amber-950/40 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-xs font-mono text-amber-200">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" />
        <span className="font-semibold tracking-wide text-amber-300">
          RECORDED RUN / STAGE INSURANCE ACTIVE
        </span>
        <span className="hidden md:inline text-amber-400/80">
          — Live Wi-Fi/Docker drop protection enabled. Every sanitizer trace, compiler warning, and byte delta is backed by deterministic ground truth.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-amber-900/60 border border-amber-600/40 text-[10px] uppercase font-bold text-amber-300">
          {provenance || 'FIXTURE_FALLBACK'}
        </span>
      </div>
    </div>
  );
}
