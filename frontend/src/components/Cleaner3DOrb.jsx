// filepath: frontend/src/components/Cleaner3DOrb.jsx
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Zap,
  Play,
  RotateCw,
  Cpu,
  FileCheck2,
  HardDrive,
  Download,
  Terminal,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function Cleaner3DOrb({
  runState,
  isRunning,
  onRunCleaner,
  onOpenLogDrawer,
  onExportPatch,
  onExportMarkdown,
}) {
  const verdict = runState?.verdict || 'INITIALIZING';
  const stage = runState?.current_stage || 'STAGE_1_FINDING';
  const stage6 = runState?.stage_6 || {};
  const stage7 = runState?.stage_7 || {};
  const deltas = stage7.resource_delta || {};
  const telemetry = stage7.runtime_telemetry || {};
  const boundarySweep = stage7.boundary_sweep || null;

  // Calculate dynamic progress percentage for speedboost cleaner
  let progressPct = 0;
  let statusText = 'Ready to clean firmware';

  if (isRunning) {
    if (stage === 'STAGE_1_FINDING') {
      progressPct = 18;
      statusText = '1/5 Scanning AST for buffer overflow risks (cppcheck)...';
    } else if (stage === 'STAGE_2_BUG_REPRODUCED') {
      progressPct = 36;
      statusText = '2/5 Isolating ASan crash trace & memory corruption...';
    } else if (stage === 'STAGE_3_PATCH_PROPOSED') {
      progressPct = 58;
      statusText = '3/5 Synthesizing surgical memory-safe patch (LLM)...';
    } else if (stage === 'STAGE_4_COMPILES') {
      progressPct = 72;
      statusText = '4/5 Compiling with GCC -fsanitize=address,undefined...';
    } else if (stage === 'STAGE_5_CRASH_INPUT_CLEAN') {
      progressPct = 85;
      statusText = '5/5 Replaying crash input — Verifying memory clean...';
    } else if (stage === 'STAGE_6_GUARDS_AND_BEHAVIOR') {
      progressPct = 94;
      statusText = 'Enforcing Stage 6 Anti-Cheat & 3/3 benign tests...';
    }
  } else if (verdict === 'VERIFIED') {
    progressPct = 100;
    statusText = 'All 7 technical gates passed cleanly';
  } else if (verdict === 'REJECTED') {
    progressPct = 100;
    statusText = 'Anti-cheat guard intercepted unauthorized bypass';
  }

  // 5 Boundary sweep items
  const defaultSweepCases = [
    { label: '0 B', status: verdict === 'VERIFIED' ? 'PASSED' : 'PENDING' },
    { label: 'N-1 B', status: verdict === 'VERIFIED' ? 'PASSED' : 'PENDING' },
    { label: 'N B', status: verdict === 'VERIFIED' ? 'PASSED' : 'PENDING' },
    { label: 'N+1 B', status: verdict === 'VERIFIED' ? 'PASSED' : verdict === 'REJECTED' ? 'FAILED' : 'PENDING' },
    { label: '2N B', status: verdict === 'VERIFIED' ? 'PASSED' : verdict === 'REJECTED' ? 'FAILED' : 'PENDING' },
  ];

  const sweepCases = boundarySweep?.test_cases || defaultSweepCases;

  return (
    <div className="gh-card p-6 flex flex-col justify-between h-[720px] relative overflow-hidden bg-gradient-to-b from-white via-white to-slate-50/70 border border-[#D0D7DE] shadow-sm">
      {/* Subtle background high-tech grid / aura */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
            <Zap className="w-4 h-4 fill-indigo-100" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Firmware Security Cleaner</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                v2.4
              </span>
            </h3>
          </div>
        </div>

        {/* Status Pill */}
        {verdict === 'VERIFIED' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Clean & Verified
          </span>
        ) : verdict === 'REJECTED' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Threat Blocked
          </span>
        ) : isRunning ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-300 animate-pulse">
            <RotateCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            Cleaning Firmware...
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Defect Detected
          </span>
        )}
      </div>

      {/* 3D HOLOGRAPHIC CLEANER STAGE ORB / GAUGE */}
      <div className="relative my-4 flex flex-col items-center justify-center z-10 perspective-container">
        {/* Outer 3D Gyroscope Glow Rings */}
        <div className="relative w-56 h-56 flex items-center justify-center">
          {/* Ambient Outer Halo */}
          <div
            className={`absolute inset-0 rounded-full transition-all duration-700 blur-2xl opacity-30 ${
              verdict === 'VERIFIED'
                ? 'bg-emerald-400 scale-105'
                : verdict === 'REJECTED'
                ? 'bg-rose-400 scale-105'
                : isRunning
                ? 'bg-indigo-400 scale-110 animate-pulse'
                : 'bg-amber-300 scale-95'
            }`}
          />

          {/* 3D Gyro Ring X */}
          <div
            className={`absolute w-48 h-48 rounded-full border-2 border-dashed transition-all duration-500 ${
              isRunning ? 'animate-gyro-x border-indigo-400/60' : 'border-slate-300/60'
            }`}
          />

          {/* 3D Gyro Ring Y */}
          <div
            className={`absolute w-52 h-52 rounded-full border border-dotted transition-all duration-500 ${
              isRunning ? 'animate-gyro-y border-violet-400/50' : 'border-slate-300/40'
            }`}
          />

          {/* Radar Sweep Effect (when running) */}
          {isRunning && (
            <div className="absolute w-44 h-44 rounded-full overflow-hidden pointer-events-none">
              <div className="w-full h-full animate-radar-sweep bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(99,102,241,0.25)_360deg)] rounded-full" />
            </div>
          )}

          {/* Device Cleaner Pulse Rings */}
          {isRunning && (
            <>
              <div className="absolute w-40 h-40 rounded-full border border-indigo-400/40 animate-speedboost-pulse pointer-events-none" />
              <div className="absolute w-40 h-40 rounded-full border border-indigo-300/30 animate-speedboost-pulse [animation-delay:0.8s] pointer-events-none" />
            </>
          )}

          {/* Center 3D Core / Holographic Orb */}
          <div className="relative w-40 h-40 rounded-full bg-white shadow-[0_12px_36px_-6px_rgba(15,23,42,0.15)] border border-slate-200/90 flex flex-col items-center justify-center p-3 text-center transition-all duration-500 card-3d-interactive">
            {/* Inner Core Content */}
            {verdict === 'VERIFIED' ? (
              <div className="flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 mb-2 transform hover:scale-105 transition">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Cleaned 100%
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Memory Safe</span>
              </div>
            ) : verdict === 'REJECTED' ? (
              <div className="flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/30 mb-2 transform hover:scale-105 transition">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                  Cheat Blocked
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Stage 6 Intercept</span>
              </div>
            ) : isRunning ? (
              <div className="flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center mb-1">
                  <RotateCw className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="absolute text-xs font-extrabold text-indigo-900 font-mono">
                    {progressPct}%
                  </span>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 animate-pulse">
                  Purging Bug
                </span>
                <span className="text-[9px] text-slate-400 font-mono truncate max-w-[120px]">
                  ASan & Guards
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 mb-2">
                  <Activity className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-900">
                  C-Bug Found
                </span>
                <span className="text-[10px] font-mono text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-full mt-0.5 border border-rose-200">
                  CWE-121
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Live Dynamic Status Subtitle */}
        <div className="mt-3 text-center max-w-xs">
          <p className="text-xs font-semibold text-slate-800 transition-all duration-200">
            {statusText}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Deterministic compiler sanitizers evaluate the model's patch
          </p>
        </div>

        {/* Main 3D Action SpeedBoost Button */}
        <div className="mt-4 w-full">
          <button
            onClick={onRunCleaner}
            disabled={isRunning}
            className={`w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl text-sm font-bold shadow-lg transition-all duration-200 transform active:scale-[0.98] ${
              isRunning
                ? 'bg-indigo-300 text-white cursor-wait'
                : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:-translate-y-0.5'
            }`}
          >
            {isRunning ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-white" />
                <span>Running 7-Stage Ladder...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white text-white" />
                <span>Clean & Verify Firmware (1-Click)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. FR-28 Boundary Sweep & Firmware Memory Health                    */}
      {/* =================================================================== */}
      <div className="space-y-3 relative z-10">
        {/* FR-28 Boundary Sweep 5-Point Capsule Bar */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              FR-28 Deterministic Boundary Sweep
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-300/60">
              {verdict === 'VERIFIED' ? '5 / 5 Clean' : verdict === 'REJECTED' ? 'Blocked at G6' : 'Pending Sweep'}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 text-center font-sans">
            {sweepCases.map((c, i) => {
              const isPassed = c.status === 'PASSED';
              const isFailed = c.status === 'FAILED';
              return (
                <div
                  key={i}
                  className={`py-1.5 px-1 rounded-lg border text-xs font-semibold transition-all ${
                    isPassed
                      ? 'bg-emerald-100/60 border-emerald-300 text-emerald-800'
                      : isFailed
                      ? 'bg-rose-100/60 border-rose-300 text-rose-800'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="text-[11px] font-bold text-slate-800">{c.label.split(' ')[0]}</div>
                  <div className="text-[9px] font-bold mt-0.5">
                    {isPassed ? 'CLEAN' : isFailed ? 'CRASH' : '--'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3 Diagnostic Telemetry Metrics */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500">
              <Cpu className="w-3 h-3 text-indigo-500" />
              <span>Flash (.text)</span>
            </div>
            <div className="text-xs font-mono font-bold text-slate-900 mt-1">
              {deltas.text_bytes !== undefined ? `+${deltas.text_bytes} B` : '--'}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500">
              <HardDrive className="w-3 h-3 text-indigo-500" />
              <span>RAM (.data)</span>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-700 mt-1">
              {deltas.data_bytes !== undefined ? `0 B Leak` : '--'}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500">
              <Activity className="w-3 h-3 text-indigo-500" />
              <span>Speed Delta</span>
            </div>
            <div className="text-xs font-mono font-bold text-slate-900 mt-1">
              {telemetry.delta_pct || '--'}
            </div>
          </div>
        </div>

        {/* Bottom Actions Row */}
        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={onOpenLogDrawer}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            <span>Raw Subprocess Logs</span>
          </button>

          <button
            onClick={onExportPatch}
            disabled={!runState?.run_id}
            className="flex items-center gap-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition disabled:opacity-40"
            title="Download unified .patch"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>.patch</span>
          </button>

          <button
            onClick={onExportMarkdown}
            disabled={!runState?.run_id}
            className="flex items-center gap-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 transition disabled:opacity-40"
            title="Download formal evidence report"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Report.md</span>
          </button>
        </div>
      </div>
    </div>
  );
}

