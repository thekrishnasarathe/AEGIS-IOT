// filepath: frontend/src/components/LadderTracker.jsx
import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  RefreshCw,
} from 'lucide-react';

export default function LadderTracker({
  runState,
  activeLogStage,
  onSelectStage,
}) {
  const stages = [
    {
      id: 'STAGE_1_FINDING',
      logKey: 'stage_1_cppcheck',
      label: '1. Finding',
      sub: 'cppcheck static triage',
      data: runState?.stage_1,
    },
    {
      id: 'STAGE_2_BUG_REPRODUCED',
      logKey: 'stage_2_asan_repro',
      label: '2. Bug Reproduced',
      sub: 'ASan dynamic crash vector',
      data: runState?.stage_2,
    },
    {
      id: 'STAGE_3_PATCH_PROPOSED',
      logKey: 'stage_3_patch_diff',
      label: '3. Patch Proposed',
      sub: 'GenAI patch synthesis',
      data: runState?.stage_3,
    },
    {
      id: 'STAGE_4_COMPILES',
      logKey: 'stage_4_gcc',
      label: '4. Compiles',
      sub: 'gcc -Wall -Wextra -fsanitize',
      data: runState?.stage_4,
    },
    {
      id: 'STAGE_5_CRASH_INPUT_CLEAN',
      logKey: 'stage_5_crash_replay',
      label: '5. Crash Input Clean',
      sub: 'Patched replay under ASan',
      data: runState?.stage_5,
    },
    {
      id: 'STAGE_6_GUARDS_AND_BEHAVIOR',
      logKey: 'stage_6_guards',
      label: '6. Integrity Guards',
      sub: 'Banned tokens & 3 benign tests',
      data: runState?.stage_6,
    },
    {
      id: 'STAGE_7_VERIFIED',
      logKey: 'stage_7_audit_md',
      label: '7. Verified',
      sub: 'Resource delta & evidence audit',
      data: runState?.stage_7,
    },
  ];

  const verdict = runState?.verdict || 'INITIALIZING';
  const retryCount = runState?.retry_count || 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl flex flex-col h-full overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)]">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <span className="font-sans text-sm font-bold text-slate-900">
            7-Stage Evidence Ladder
          </span>
        </div>
        {retryCount > 0 && (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            Retry {retryCount}/3
          </span>
        )}
      </div>

      {/* Stage Item Rows */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
        {stages.map((st) => {
          const status = st.data?.status || 'PENDING';
          const isSelected = activeLogStage === st.logKey;
          const duration = st.data?.duration_ms;

          let icon = <Circle className="w-4 h-4 text-slate-400" />;
          let statusBadge = 'text-slate-500 bg-slate-100 border-slate-200';

          if (status === 'PASSED') {
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
            statusBadge = 'text-emerald-700 bg-emerald-100 border-emerald-200';
          } else if (status === 'FAILED') {
            icon = <XCircle className="w-4 h-4 text-rose-600 shrink-0" />;
            statusBadge = 'text-rose-700 bg-rose-100 border-rose-200';
          } else if (status === 'RUNNING') {
            icon = <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />;
            statusBadge = 'text-indigo-700 bg-indigo-100 border-indigo-200 animate-pulse';
          }

          return (
            <div
              key={st.id}
              onClick={() => onSelectStage(st.logKey)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isSelected
                  ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                  : 'bg-white border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {icon}
                <div className="min-w-0">
                  <div className="font-sans text-xs font-bold text-slate-900 truncate">
                    {st.label}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{st.sub}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {duration !== undefined && duration > 0 && (
                  <span className="font-mono text-[11px] text-slate-400">
                    {duration} ms
                  </span>
                )}
                <span className={`text-[10px] font-sans px-2.5 py-0.5 rounded-full border uppercase font-bold ${statusBadge}`}>
                  {status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Honest Verdict Card */}
      <div className="p-4 bg-white border-t border-slate-200">
        {verdict === 'VERIFIED' && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-sans font-bold text-emerald-800 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Verified for tested cases
              </span>
              <span className="text-[10px] font-sans font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                100% Deterministic
              </span>
            </div>
            <p className="text-xs text-emerald-950 leading-relaxed font-sans">
              Every check deterministically passed: zero ASan warnings on crash replay, bounded diff budget, zero banned bypass tokens, and 3/3 benign tests matched.
            </p>
            <p className="text-[11px] text-emerald-700/80 mt-1.5 italic font-sans">
              *Scope: Verified strictly against tested vectors. Universal safety is mathematically non-provable.
            </p>
          </div>
        )}

        {verdict === 'REJECTED' && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
            <div className="flex items-center gap-1.5 text-xs font-sans font-bold text-rose-800 uppercase tracking-wider mb-1">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              Run Rejected by Security Guards
            </div>
            <p className="text-xs font-mono text-rose-900 leading-tight">
              {runState?.stage_6?.rejection_reason || 'Patch failed compiler or integrity guard checks.'}
            </p>
            <p className="text-[11px] text-rose-700 mt-1 font-sans">
              Deterministic tools intercepted the unauthorized construct.
            </p>
          </div>
        )}

        {verdict === 'UNVERIFIED' && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-1.5 text-xs font-sans font-bold text-amber-800 uppercase tracking-wider mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Unverified: Bug Not Reproduced
            </div>
            <p className="text-xs text-amber-900 leading-tight font-sans">
              Original harness did not crash under AddressSanitizer on the provided vector. Pipeline halted at Stage 2.
            </p>
          </div>
        )}

        {verdict === 'RUNNING' && (
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-center animate-pulse">
            <div className="flex items-center justify-center gap-2 text-xs font-sans text-indigo-700 font-bold uppercase">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              Executing 7-Stage Ladder...
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-sans">
              Current: {runState?.current_stage || 'STAGE_1_FINDING'}
            </p>
          </div>
        )}

        {verdict === 'INITIALIZING' && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-600 text-xs font-sans">
            Ready to verify. Click <span className="text-indigo-600 font-bold">Run Verification</span> to start.
          </div>
        )}
      </div>
    </div>
  );
}
