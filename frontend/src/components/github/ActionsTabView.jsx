// filepath: frontend/src/components/github/ActionsTabView.jsx
import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  Play,
  ShieldCheck,
  AlertOctagon,
  Terminal,
} from 'lucide-react';
import SecurityCommandCenter from '../verification/SecurityCommandCenter';
import MLAuditCard from '../verification/MLAuditCard';
import ResultCardsGrid from '../verification/ResultCardsGrid';
import HardwareHILStation from '../verification/HardwareHILStation';

export default function ActionsTabView({
  runState,
  isRunning,
  onRunLadder,
  sampleDetail,
  sampleName = 'UART Stack Overflow (CWE-121)',
  onExportPatch,
  onExportMarkdown,
  onSwitchToTab,
}) {
  const [selectedStageIdx, setSelectedStageIdx] = useState(0);

  const verdict = runState?.verdict || 'INITIALIZING';
  const backendStage = runState?.current_stage || 'STAGE_1_FINDING';

  const stageOrder = [
    'STAGE_1_FINDING',
    'STAGE_2_BUG_REPRODUCED',
    'STAGE_3_PATCH_PROPOSED',
    'STAGE_4_COMPILES',
    'STAGE_5_CRASH_INPUT_CLEAN',
    'STAGE_6_GUARDS_AND_BEHAVIOR',
    'STAGE_7_VERIFIED',
  ];

  // Sync selected stage with live backend run execution
  useEffect(() => {
    if (isRunning) {
      const idx = stageOrder.indexOf(backendStage);
      if (idx !== -1) {
        setSelectedStageIdx(idx);
      }
    } else if (verdict === 'VERIFIED') {
      setSelectedStageIdx(6);
    } else if (verdict === 'REJECTED') {
      setSelectedStageIdx(5);
    }
  }, [isRunning, backendStage, verdict]);

  return (
    <div className="space-y-5 font-sans">
      {/* 1. Master Action & Hero Verdict Bar */}
      <div className="p-5 shadow-2xl bg-[#0B0F15] border border-slate-800/80 rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Verdict & Status Badge */}
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg ${
                verdict === 'VERIFIED'
                  ? 'bg-emerald-500/20 text-[#22C55E] border-emerald-500/40 shadow-emerald-500/20'
                  : verdict === 'REJECTED'
                  ? 'bg-rose-500/20 text-[#EF4444] border-rose-500/40 shadow-rose-500/20'
                  : isRunning
                  ? 'bg-cyan-500/20 text-[#22D3EE] border-cyan-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {verdict === 'VERIFIED' ? (
                <ShieldCheck className="w-7 h-7" />
              ) : verdict === 'REJECTED' ? (
                <AlertOctagon className="w-7 h-7" />
              ) : isRunning ? (
                <RotateCw className="w-7 h-7 animate-spin" />
              ) : (
                <Terminal className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-3 py-0.5 rounded-full font-bold border ${
                    verdict === 'VERIFIED'
                      ? 'bg-emerald-500/20 text-[#22C55E] border-emerald-500/30'
                      : verdict === 'REJECTED'
                      ? 'bg-rose-500/20 text-[#EF4444] border-rose-500/30'
                      : isRunning
                      ? 'bg-cyan-500/20 text-[#22D3EE] border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {verdict === 'VERIFIED'
                    ? 'VERIFIED FOR TESTED CASES'
                    : verdict === 'REJECTED'
                    ? 'REJECTED BY GUARDS'
                    : isRunning
                    ? 'LIVE EXECUTION IN PROGRESS'
                    : 'PIPELINE STANDBY'}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Sample: {sampleName}
                </span>
              </div>

              <h1 className="text-xl font-extrabold text-white mt-1 tracking-tight">
                {verdict === 'VERIFIED'
                  ? 'Firmware Verification Succeeded (Tested Cases)'
                  : verdict === 'REJECTED'
                  ? 'Verification Intercepted by Stage 6 Guard'
                  : isRunning
                  ? 'Executing 7-Stage Deterministic Verification Ladder...'
                  : 'AEGIS-IoT Cybersecurity Verification Workstation'}
              </h1>

              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed max-w-2xl">
                {verdict === 'VERIFIED'
                  ? 'The candidate repair passed AddressSanitizer crash replay, 5 boundary sweep vectors, AST token analysis, and all benign behavioral regression tests.'
                  : verdict === 'REJECTED'
                  ? runState?.stage_6?.rejection_reason || 'Banned sanitizer suppression token intercepted by deterministic security guard.'
                  : 'The model proposes candidate firmware patches; deterministic compiler gates, AddressSanitizer, and AST guards decide.'}
              </p>
            </div>
          </div>

          {/* Right: Master Run Action Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onRunLadder}
              disabled={isRunning}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md cursor-pointer ${
                isRunning
                  ? 'bg-cyan-600/80 text-white cursor-wait animate-pulse'
                  : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-500/25 active:scale-95'
              }`}
            >
              {isRunning ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Ladder...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run Verification</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Dual Neural AST Classifier Pre/Post Risk Telemetry Card */}
      <MLAuditCard runState={runState} />

      {/* 3. Security Command Center Workstation (Top, Central, Bottom, Side Panel) */}
      <SecurityCommandCenter
        currentStageIdx={selectedStageIdx}
        onSelectStage={setSelectedStageIdx}
        runState={runState}
        isRunning={isRunning}
        sampleDetail={sampleDetail}
        sampleName={sampleName}
        onExportPatch={onExportPatch}
        onExportMarkdown={onExportMarkdown}
        onSwitchToTab={onSwitchToTab}
      />

      {/* 4. Hardware-in-the-Loop (HIL) Physical Microcontroller Station */}
      <HardwareHILStation runState={runState} />

      {/* 5. The 4 Executive Intelligence Cards */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-pixel text-xs text-white uppercase tracking-wider">
            🛡 EXECUTIVE AUDIT RESULT CARDS
          </span>
          <span className="font-vt text-sm text-slate-400">
            [HEURISTIC SCORE · PHYSICAL HACKER THREAT · TIME SAVED · MCU BUDGET]
          </span>
        </div>
        <ResultCardsGrid runState={runState} sampleDetail={sampleDetail} />
      </div>
    </div>
  );
}
