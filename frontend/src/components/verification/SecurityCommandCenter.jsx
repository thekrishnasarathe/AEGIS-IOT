// filepath: frontend/src/components/verification/SecurityCommandCenter.jsx
import React, { useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import ASTScanStage from './stages/ASTScanStage';
import BugReproductionStage from './stages/BugReproductionStage';
import AIPatchStage from './stages/AIPatchStage';
import GCCCompilationStage from './stages/GCCCompilationStage';
import CrashValidationStage from './stages/CrashValidationStage';
import IntegrityStage from './stages/IntegrityStage';
import EvidenceAuditStage from './stages/EvidenceAuditStage';
import StageNavigationRail from './StageNavigationRail';
import TelemetrySidePanel from './TelemetrySidePanel';

export default function SecurityCommandCenter({
  currentStageIdx,
  onSelectStage,
  runState,
  isRunning,
  sampleDetail,
  sampleName,
  onExportPatch,
  onExportMarkdown,
  onSwitchToTab,
}) {
  const stageMetadata = [
    {
      id: 0,
      title: 'AST Scan · Kinetic Code Intelligence',
      desc: 'Static analyzer traverses the abstract syntax tree to detect unbounded memory copies and map CWE vulnerability boundaries.',
      accentHex: '#22D3EE',
    },
    {
      id: 1,
      title: 'Bug Reproduction · Interactive Memory Architecture',
      desc: 'Controlled failure test passes input stream into memory layout, demonstrating the +28 byte boundary overflow under AddressSanitizer.',
      accentHex: '#EF4444',
    },
    {
      id: 2,
      title: 'AI Patch Synthesis · Neural Code Transformation',
      desc: 'Split-screen synthesis engine coordinates original source code and candidate bounds patch while preserving ABI contracts.',
      accentHex: '#A78BFA',
    },
    {
      id: 3,
      title: 'GCC Compilation · Deterministic Pipeline Gateway',
      desc: 'Sequential 5-step compiler pipeline validates source syntax, macro expansion, -O2 code generation, and ASan instrumentation.',
      accentHex: '#3B82F6',
    },
    {
      id: 4,
      title: 'Crash Input Validation · Adversarial Input Testing',
      desc: 'Original failing test input is re-executed alongside 5-vector FR-28 boundary sweeps, confirming safe interception with zero crashes.',
      accentHex: '#06B6D4',
    },
    {
      id: 5,
      title: 'Integrity Verification · Three-Layer Security Inspection',
      desc: 'Multi-layer security inspector validates function signature invariance, 3/3 benign regressions, and deterministic anti-cheat rules.',
      accentHex: '#F59E0B',
    },
    {
      id: 6,
      title: 'Final Evidence Audit · Cryptographic Convergence',
      desc: 'Gathers proofs from all 6 preceding gates into certified audit artifact: VERIFIED FOR TESTED CASES with explicit resource deltas.',
      accentHex: '#22C55E',
    },
  ];

  // Keyboard navigation [← / →]
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onSelectStage(Math.max(0, currentStageIdx - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onSelectStage(Math.min(6, currentStageIdx + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStageIdx, onSelectStage]);

  const currentMeta = stageMetadata[currentStageIdx] || stageMetadata[0];
  const activeStageData = runState?.[`stage_${currentStageIdx + 1}`] || {};
  const stageStatus = activeStageData.status || (isRunning ? 'RUNNING' : 'PENDING');
  const duration = activeStageData.duration_ms;

  return (
    <div className="w-full space-y-4 font-sans">
      {/* Top Main Section + Side Panel Grid */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        {/* Left: Engineering Visualization Workstation */}
        <div className="flex-1 flex flex-col justify-between bg-[#080B10] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl min-h-[580px]">
          {/* 1. TOP SECTION */}
          <div className="bg-[#0B0F15] p-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: `${currentMeta.accentHex}15`,
                    borderColor: `${currentMeta.accentHex}40`,
                    color: currentMeta.accentHex,
                  }}
                >
                  GATE 0{currentStageIdx + 1} OF 07
                </span>

                <span className="text-[11px] font-mono text-slate-400 bg-[#080B10] px-2 py-0.5 rounded border border-slate-800">
                  {sampleName || 'Firmware Target'}
                </span>

                <span className="hidden md:inline text-[10px] font-mono text-slate-500 ml-2">
                  [←/→] Navigate gates
                </span>
              </div>

              <h2 className="text-base font-extrabold text-white tracking-tight">
                {currentMeta.title}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                {currentMeta.desc}
              </p>
            </div>

            {/* Stage Status Pill & Navigation Arrows */}
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={`text-xs font-mono font-bold px-3 py-1 rounded-xl border ${
                  stageStatus === 'PASSED'
                    ? 'bg-emerald-500/15 text-[#22C55E] border-emerald-500/30'
                    : stageStatus === 'FAILED'
                    ? 'bg-rose-500/15 text-[#EF4444] border-rose-500/30'
                    : stageStatus === 'RUNNING'
                    ? 'bg-cyan-500/15 text-[#22D3EE] border-cyan-500/30 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {stageStatus} {duration ? `· ${Math.round(duration)}ms` : ''}
              </div>

              {/* Prev / Next buttons */}
              <button
                onClick={() => onSelectStage(Math.max(0, currentStageIdx - 1))}
                disabled={currentStageIdx === 0}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous gate [←]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSelectStage(Math.min(6, currentStageIdx + 1))}
                disabled={currentStageIdx === 6}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next gate [→]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. CENTRAL SECTION: DYNAMIC TECHNICAL VISUALIZATION */}
          <div className="flex-1 w-full bg-[#080B10]">
            {currentStageIdx === 0 && (
              <ASTScanStage runState={runState} sampleDetail={sampleDetail} />
            )}
            {currentStageIdx === 1 && (
              <BugReproductionStage runState={runState} />
            )}
            {currentStageIdx === 2 && (
              <AIPatchStage runState={runState} />
            )}
            {currentStageIdx === 3 && (
              <GCCCompilationStage runState={runState} />
            )}
            {currentStageIdx === 4 && (
              <CrashValidationStage runState={runState} />
            )}
            {currentStageIdx === 5 && (
              <IntegrityStage runState={runState} />
            )}
            {currentStageIdx === 6 && (
              <EvidenceAuditStage
                runState={runState}
                sampleDetail={sampleDetail}
                onExportPatch={onExportPatch}
                onExportMarkdown={onExportMarkdown}
                onSwitchToTab={onSwitchToTab}
              />
            )}
          </div>
        </div>

        {/* 3. SIDE PANEL: LIVE TELEMETRY & DIAGNOSTICS */}
        <TelemetrySidePanel
          currentStageIdx={currentStageIdx}
          runState={runState}
          sampleDetail={sampleDetail}
          onExportPatch={onExportPatch}
          onExportMarkdown={onExportMarkdown}
          onSwitchToTab={onSwitchToTab}
        />
      </div>

      {/* 4. BOTTOM SECTION: CONNECTED 7-STAGE PROGRESS NODES */}
      <StageNavigationRail
        currentStageIdx={currentStageIdx}
        onSelectStage={onSelectStage}
        runState={runState}
        isRunning={isRunning}
      />
    </div>
  );
}
