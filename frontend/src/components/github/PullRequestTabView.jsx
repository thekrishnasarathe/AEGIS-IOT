// filepath: frontend/src/components/github/PullRequestTabView.jsx
import React, { useState } from 'react';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  RotateCw,
  FileCode,
  Copy,
  Check,
  Download,
  FileCheck2,
  Sparkles,
  GitMerge,
} from 'lucide-react';

export default function PullRequestTabView({
  runState,
  isRunning,
  unifiedDiff,
  patchedSource,
  onRunLadder,
  onExportPatch,
  onExportMarkdown,
  onSwitchToActions,
}) {
  const [prSubTab, setPrSubTab] = useState('files');
  const [copied, setCopied] = useState(false);

  const verdict = runState?.verdict || 'INITIALIZING';
  const stage6 = runState?.stage_6 || {};
  const diffLines = unifiedDiff ? unifiedDiff.replace(/\r\n/g, '\n').split('\n') : [];

  const additions = diffLines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
  const deletions = diffLines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length;

  const handleCopy = () => {
    if (!unifiedDiff) return;
    navigator.clipboard.writeText(unifiedDiff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* 1. GitHub PR Header */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>fix(firmware): bound input payload to prevent memory corruption</span>
              <span className="text-[#8B949E] font-normal">#42</span>
            </h1>

            <div className="flex items-center gap-2.5 mt-2 text-xs">
              {verdict === 'VERIFIED' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#8250DF] text-white shadow-xs">
                  <GitMerge className="w-3.5 h-3.5" />
                  Merged
                </span>
              ) : verdict === 'REJECTED' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#CF222E] text-white shadow-xs">
                  <XCircle className="w-3.5 h-3.5" />
                  Closed (Rejected)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#238636] text-white shadow-xs">
                  <GitPullRequest className="w-3.5 h-3.5" />
                  Open
                </span>
              )}

              <span className="text-[#8B949E]">
                <strong className="text-white">aegis-repair-bot</strong> wants to merge 1 commit into <code className="bg-[#21262D] text-[#C9D1D9] px-1.5 py-0.5 rounded font-mono">main</code> from <code className="bg-[#21262D] text-[#C9D1D9] px-1.5 py-0.5 rounded font-mono">patch-candidate</code>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportPatch}
              disabled={!unifiedDiff}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#30363D] bg-[#21262D] hover:bg-[#30363D] text-xs font-semibold text-[#C9D1D9] transition disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5 text-[#8B949E]" />
              <span>Export .patch</span>
            </button>

            <button
              onClick={onExportMarkdown}
              disabled={!runState?.run_id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#30363D] bg-[#21262D] hover:bg-[#30363D] text-xs font-semibold text-[#C9D1D9] transition disabled:opacity-40"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-[#8B949E]" />
              <span>Report.md</span>
            </button>
          </div>
        </div>

        {/* PR Sub-Tabs */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-[#30363D] text-xs font-semibold">
          <button
            onClick={() => setPrSubTab('files')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              prSubTab === 'files'
                ? 'bg-[#21262D] text-white font-bold border border-[#30363D]'
                : 'text-[#8B949E] hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-[#58A6FF]" />
            <span>Files changed (1)</span>
            {unifiedDiff && (
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-800/50">
                +{additions}/-{deletions}
              </span>
            )}
          </button>

          <button
            onClick={() => setPrSubTab('checks')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              prSubTab === 'checks'
                ? 'bg-[#21262D] text-white font-bold border border-[#30363D]'
                : 'text-[#8B949E] hover:text-white'
            }`}
          >
            {verdict === 'VERIFIED' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : verdict === 'REJECTED' ? (
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <RotateCw className="w-3.5 h-3.5 text-[#8B949E]" />
            )}
            <span>Checks (7/7)</span>
          </button>
        </div>
      </div>

      {/* 2. Files Changed (GitHub PR Dark Diff Box) */}
      {prSubTab === 'files' && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden shadow-md">
          {/* File Header */}
          <div className="bg-[#21262D] px-4 py-2.5 border-b border-[#30363D] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white">target.c</span>
              {unifiedDiff && (
                <span className="font-mono text-[11px] text-[#8B949E]">
                  <span className="text-emerald-400 font-bold">+{additions}</span>{' '}
                  <span className="text-rose-400 font-bold">-{deletions}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={!unifiedDiff}
                className="p-1.5 rounded-md hover:bg-[#30363D] text-[#C9D1D9] border border-[#30363D] bg-[#21262D] transition shadow-xs"
                title="Copy raw patch diff"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Diff Content */}
          <div className="overflow-auto font-mono text-[12.5px] leading-relaxed max-h-[520px] bg-[#0D1117]">
            {diffLines.length === 0 ? (
              <div className="p-12 text-center text-[#8B949E] font-sans">
                <Sparkles className="w-8 h-8 text-[#8B949E] mx-auto mb-2" />
                <p className="font-bold text-white text-sm">No patch generated yet</p>
                <p className="text-xs text-[#8B949E] mt-1">
                  Click <strong className="text-white">"Run Verification"</strong> in the top header to synthesize and verify a patch.
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {diffLines.map((line, idx) => {
                    let rowBg = 'hover:bg-[#161B22]/50';
                    let textCol = 'text-[#E6EDF3]';
                    let gutterBg = 'bg-[#161B22]/50 text-[#6E7681]';
                    let prefix = ' ';

                    if (line.startsWith('+++') || line.startsWith('---')) {
                      rowBg = 'bg-[#1F6FEB]/15 font-semibold';
                      textCol = 'text-[#58A6FF]';
                      gutterBg = 'bg-[#1F6FEB]/25 text-[#58A6FF]';
                    } else if (line.startsWith('@@')) {
                      rowBg = 'bg-[#161B22] text-[#7D8590] font-semibold';
                      gutterBg = 'bg-[#21262D] text-[#7D8590]';
                    } else if (line.startsWith('+')) {
                      rowBg = 'bg-emerald-950/25 font-semibold text-emerald-200';
                      textCol = 'text-emerald-300';
                      gutterBg = 'bg-emerald-900/35 text-emerald-400';
                      prefix = '+';
                    } else if (line.startsWith('-')) {
                      rowBg = 'bg-rose-950/25 font-semibold text-rose-200';
                      textCol = 'text-rose-300';
                      gutterBg = 'bg-rose-900/35 text-rose-400';
                      prefix = '-';
                    }

                    return (
                      <tr key={idx} className={`${rowBg} transition-colors`}>
                        <td className={`w-10 pr-2 py-0.5 text-right select-none font-mono text-xs ${gutterBg}`}>
                          {idx + 1}
                        </td>
                        <td className="w-6 text-center select-none font-mono font-bold text-xs opacity-75">
                          {prefix !== ' ' ? prefix : ''}
                        </td>
                        <td className={`whitespace-pre px-2 py-0.5 font-mono ${textCol}`}>
                          {line.startsWith('+') || line.startsWith('-') ? line.substring(1) : line}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 3. Checks List (When 'checks' subtab is selected) */}
      {prSubTab === 'checks' && (
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#30363D]">
            <h3 className="text-sm font-bold text-white">
              Automated Check Runs (Deterministic Verification Ladder)
            </h3>
            <button
              onClick={onSwitchToActions}
              className="text-xs text-[#58A6FF] hover:underline font-semibold"
            >
              View in Actions tab &rarr;
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#21262D] border border-[#30363D]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">1. cppcheck Static AST Finding</span>
              </div>
              <span className="font-mono text-[#8B949E]">Passed</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#21262D] border border-[#30363D]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">2. ASan Bug Reproduction</span>
              </div>
              <span className="font-mono text-[#8B949E]">Crash Isolated</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#21262D] border border-[#30363D]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">3. GCC Build Gate (-fsanitize=address,undefined)</span>
              </div>
              <span className="font-mono text-[#8B949E]">0 Errors</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#21262D] border border-[#30363D]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">4. AddressSanitizer Crash Vector Replay</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold">Memory Clean</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#21262D] border border-[#30363D]">
              <div className="flex items-center gap-2">
                {stage6.banned_tokens_passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : verdict === 'REJECTED' ? (
                  <XCircle className="w-4 h-4 text-rose-400" />
                ) : (
                  <RotateCw className="w-4 h-4 text-[#8B949E]" />
                )}
                <span className="font-semibold text-white">5. Stage 6 Anti-Cheat & 3 Benign Tests</span>
              </div>
              <span className="font-mono text-[#8B949E]">
                {stage6.banned_tokens_passed ? 'Enforced' : verdict === 'REJECTED' ? 'Blocked' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. GitHub PR Merge Box */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-5 shadow-sm">
        {verdict === 'VERIFIED' && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                All checks have passed: Verified for tested cases
              </h4>
              <p className="text-xs text-[#8B949E] mt-0.5">
                Zero AddressSanitizer warnings on crash replay, 3/3 benign tests matched, and zero banned bypass tokens.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="px-3.5 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-bold shadow-xs cursor-pointer">
                  Ready to Merge
                </span>
                <span className="text-[11px] text-[#7D8590] font-mono italic">
                  *Scope: Formally verified against tested vectors. Universal safety is non-provable.
                </span>
              </div>
            </div>
          </div>
        )}

        {verdict === 'REJECTED' && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-300">
                Checks failed: Rejected by Stage 6 Guard
              </h4>
              <p className="text-xs text-rose-200 mt-0.5 font-mono">
                {stage6.rejection_reason || 'Banned token detected: no_sanitize, __attribute__'}
              </p>
              <p className="text-xs text-[#8B949E] mt-1">
                Deterministic security tools prevented unauthorized bypass code from merging.
              </p>
            </div>
          </div>
        )}

        {verdict === 'INITIALIZING' && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#21262D] text-[#8B949E] flex items-center justify-center shrink-0">
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Verification Required Before Merge
              </h4>
              <p className="text-xs text-[#8B949E] mt-0.5">
                Click "Run Verification" in the top header to launch the 7-stage deterministic verification ladder.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
