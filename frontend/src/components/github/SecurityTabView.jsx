// filepath: frontend/src/components/github/SecurityTabView.jsx
import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Ban,
  GitCompare,
  Lock,
} from 'lucide-react';
import ResultCardsGrid from '../verification/ResultCardsGrid';

export default function SecurityTabView({ runState, sampleDetail }) {
  const verdict = runState?.verdict || 'INITIALIZING';
  const stage6 = runState?.stage_6 || {};
  const cwe = sampleDetail?.cwe || 'CWE-121: Stack-based Buffer Overflow';
  const faultLine = sampleDetail?.fault_line || 28;

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Executive Intelligence & Result Cards Grid (The 4 Executive Cards) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-pixel text-xs text-white uppercase tracking-wider">
            🛡 EXECUTIVE SECURITY & INTELLIGENCE CARDS
          </span>
          <span className="font-vt text-sm text-slate-400">
            [HEURISTIC SCORE · HACKER INTEL · TIME SAVED · MCU BUDGET]
          </span>
        </div>
        <ResultCardsGrid runState={runState} sampleDetail={sampleDetail} />
      </div>

      {/* 2. Code Scanning Alert Card (Authentic GitHub Dark Security Box) */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-md p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#30363D]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-rose-500/10 border border-rose-500/20 text-[#F85149] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Vulnerability Alert: {cwe.split(':')[0]}</span>
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-rose-500/15 text-[#F85149] border border-rose-500/30">
                  Critical
                </span>
              </h2>
              <span className="text-xs text-[#8B949E]">
                {cwe} · IoT Firmware Memory Corruption
              </span>
            </div>
          </div>

          <div>
            {verdict === 'VERIFIED' ? (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#238636]/20 text-[#3FB950] border border-[#238636]/40 flex items-center gap-1.5 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950]" />
                Remediated (Verified for tested cases)
              </span>
            ) : (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Open Security Advisory
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3 text-xs text-[#C9D1D9]">
          <p className="leading-relaxed">
            <strong className="text-white">Location:</strong>{' '}
            <code className="bg-[#0D1117] text-[#58A6FF] px-2 py-0.5 rounded font-mono border border-[#30363D]">
              target.c : line {faultLine}
            </code>
          </p>
          <p className="leading-relaxed text-[#8B949E]">
            <strong className="text-white">Triage Description:</strong>{' '}
            {sampleDetail?.description || 'Unbounded memory copy operation triggerable by controlled crash input.'}
          </p>
          <p className="leading-relaxed text-[#8B949E]">
            <strong className="text-white">Detection Grounding:</strong>{' '}
            <code className="font-mono text-white">cppcheck 2.14</code> AST parser & AddressSanitizer dynamic crash confirmation.
          </p>
        </div>
      </div>

      {/* 3. Stage 6 Anti-Cheat & Integrity Policy Rules */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-md p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#58A6FF]" />
            <span>Stage 6 Integrity & Anti-Cheat Security Rules</span>
          </h3>
          <p className="text-xs text-[#8B949E] mt-0.5">
            Deterministic compiler barriers that prevent the AI synthesis model from cutting corners or bypassing sanitizers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Rule 1 */}
          <div className="p-3.5 rounded-md border border-[#30363D] bg-[#0D1117] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-white text-xs">
                  <Ban className="w-3.5 h-3.5 text-rose-400" />
                  <span>Banned Bypass Tokens</span>
                </div>
                {stage6.banned_tokens_passed ? (
                  <span className="text-[11px] font-bold px-2 py-0.2 rounded bg-emerald-500/20 text-[#3FB950] border border-emerald-500/30">Pass</span>
                ) : verdict === 'REJECTED' ? (
                  <span className="text-[11px] font-bold px-2 py-0.2 rounded bg-rose-500/20 text-[#F85149] border border-rose-500/30">Intercepted</span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.2 rounded bg-[#21262D] text-[#8B949E]">Pending</span>
                )}
              </div>
              <p className="text-[#8B949E] leading-relaxed">
                Flags dangerous macro evasions (e.g., <code className="text-white">no_sanitize</code>, <code className="text-white">__attribute__</code>) intended to suppress ASan.
              </p>
            </div>
            {stage6.detected_banned_tokens?.length > 0 && (
              <div className="mt-3 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-[#F85149] font-mono text-[11px]">
                Detected: {stage6.detected_banned_tokens.join(', ')}
              </div>
            )}
          </div>

          {/* Rule 2 */}
          <div className="p-3.5 rounded-md border border-[#30363D] bg-[#0D1117] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-white text-xs">
                  <GitCompare className="w-3.5 h-3.5 text-sky-400" />
                  <span>Signature Invariance</span>
                </div>
                {stage6.signature_passed ? (
                  <span className="text-[11px] font-bold px-2 py-0.2 rounded bg-emerald-500/20 text-[#3FB950] border border-emerald-500/30">Pass</span>
                ) : verdict === 'REJECTED' && stage6.signature_violations?.length > 0 ? (
                  <span className="text-[11px] font-bold px-2 py-0.2 rounded bg-rose-500/20 text-[#F85149] border border-rose-500/30">Violated</span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.2 rounded bg-[#21262D] text-[#8B949E]">Pending</span>
                )}
              </div>
              <p className="text-[#8B949E] leading-relaxed">
                Prevents modifying function parameter counts or return types to dodge caller ABI contracts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
