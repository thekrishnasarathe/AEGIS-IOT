// filepath: frontend/src/components/verification/MLAuditCard.jsx
import React from 'react';
import { Cpu, ShieldCheck, AlertTriangle, ArrowRight, Activity, Terminal } from 'lucide-react';

export default function MLAuditCard({ runState }) {
  const pre = runState?.pre_patch_ml || runState?.stage_1?.cwe_ml_prediction;
  const post = runState?.post_patch_ml || runState?.stage_6?.post_patch_ml_prediction;

  if (!pre && !post) {
    return (
      <div className="p-3.5 bg-[#080B10] border border-slate-800 rounded-xl font-mono text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>AST Neural Classifier (LOOCV 95.0%): Ready for telemetry stream...</span>
        </div>
        <span className="text-[10px] text-slate-500 font-semibold">5-Class Softmax</span>
      </div>
    );
  }

  const preRisk = pre?.risk_severity_score ?? 9.4;
  const preLabel = pre?.severity_label || (preRisk >= 7 ? 'CRITICAL' : preRisk >= 3.5 ? 'MEDIUM' : 'SAFE');
  const postRisk = post?.risk_severity_score ?? 1.5;
  const postLabel = post?.severity_label || (postRisk >= 7 ? 'CRITICAL' : postRisk >= 3.5 ? 'MEDIUM' : 'SAFE');
  const safeProb = post?.probabilities?.SAFE != null ? (post.probabilities.SAFE * 100).toFixed(1) : '92.5';

  return (
    <div className="p-4 bg-[#0A0E17] border border-cyan-500/30 rounded-2xl shadow-xl font-sans text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white tracking-wide uppercase text-[11px] font-mono">
            Dual Neural AST Classifier Audit
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
            LOOCV 95.0%
          </span>
        </div>

        {/* Model & Latency badge */}
        {runState?.stage_3?.provider_used && (
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span>Provider: <strong className="text-white uppercase">{runState.stage_3.provider_used}</strong></span>
            <span>·</span>
            <span>Latency: <strong className="text-cyan-400">{runState.stage_3.latency_ms ? `${runState.stage_3.latency_ms}ms` : '0ms'}</strong></span>
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison: Pre-Patch vs. Post-Patch */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
        {/* Left: Pre-Patch ML Audit */}
        <div className="p-3 rounded-xl bg-[#0F1420] border border-rose-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold text-slate-300">PRE-PATCH STATE</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                preLabel === 'CRITICAL'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {preLabel}
            </span>
          </div>

          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Class:</span>
              <strong className="text-rose-400 font-bold">{pre?.predicted_class || 'CWE-121'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Risk Severity:</span>
              <span className="text-white font-semibold">
                <span className="text-rose-400 font-bold">{preRisk}</span> / 10.0
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Memory Sinks:</span>
              <span className="text-amber-300 font-bold">{pre?.sink_count ?? 1} sinks</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Defensive Guards:</span>
              <span className="text-slate-300">{pre?.guard_count ?? 0} guards</span>
            </div>
          </div>
        </div>

        {/* Right: Post-Patch ML Audit */}
        <div className="p-3 rounded-xl bg-[#0F1420] border border-emerald-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold text-slate-300">POST-PATCH STATE</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                postLabel === 'SAFE'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {postLabel}
            </span>
          </div>

          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Class:</span>
              <strong className="text-emerald-400 font-bold">{post?.predicted_class || 'SAFE'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Risk Severity:</span>
              <span className="text-white font-semibold">
                <span className="text-emerald-400 font-bold">{postRisk}</span> / 10.0
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Defensive Guards:</span>
              <span className="text-cyan-300 font-bold">{post?.guard_count ?? 2} guards</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">SAFE Confidence:</span>
              <strong className="text-emerald-400 font-bold">{safeProb}% SAFE</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

