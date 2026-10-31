// filepath: frontend/src/components/GitHubDiffStudio.jsx
import React, { useState } from 'react';
import {
  FileCode,
  GitPullRequest,
  GitCommit,
  Check,
  Copy,
  AlertCircle,
  Sparkles,
  Lock,
  Columns,
  List,
  ChevronDown,
} from 'lucide-react';

export default function GitHubDiffStudio({
  originalCode,
  harnessCode,
  unifiedDiff,
  patchedSource,
  faultLine = 28,
  cweLabel = 'CWE-121',
  sampleName = 'Firmware Target',
  activeTab,
  onTabChange,
  verdict,
}) {
  const [copied, setCopied] = useState(false);
  const [splitMode, setSplitMode] = useState(false); // false = unified, true = split

  const origLines = originalCode ? originalCode.replace(/\r\n/g, '\n').split('\n') : [];
  const harnessLines = harnessCode ? harnessCode.replace(/\r\n/g, '\n').split('\n') : [];
  const diffLines = unifiedDiff ? unifiedDiff.replace(/\r\n/g, '\n').split('\n') : [];
  const patchLines = patchedSource ? patchedSource.replace(/\r\n/g, '\n').split('\n') : [];

  const additions = diffLines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
  const deletions = diffLines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length;

  const handleCopy = () => {
    let text = '';
    if (activeTab === 'target') text = originalCode;
    else if (activeTab === 'diff') text = unifiedDiff || patchedSource;
    else if (activeTab === 'harness') text = harnessCode;

    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="gh-card flex flex-col h-[720px] overflow-hidden bg-white border border-[#D0D7DE] shadow-sm">
      {/* GitHub PR-Style Header */}
      <div className="p-4 bg-[#F6F8FA] border-b border-[#D0D7DE]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* PR Status Icon */}
            {verdict === 'VERIFIED' ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#8250DF] text-white shadow-xs">
                <GitPullRequest className="w-3.5 h-3.5" />
                Verified & Merged
              </span>
            ) : verdict === 'REJECTED' ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#CF222E] text-white shadow-xs">
                <GitPullRequest className="w-3.5 h-3.5" />
                Closed (Rejected)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1A7F37] text-white shadow-xs">
                <GitPullRequest className="w-3.5 h-3.5" />
                Candidate PR #1
              </span>
            )}

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#1F2328] truncate flex items-center gap-2">
                <span>fix(firmware): bound input payload to prevent memory overflow</span>
              </h2>
            </div>
          </div>

          {/* Diff Counters */}
          <div className="flex items-center gap-2 shrink-0">
            {unifiedDiff ? (
              <span className="text-xs font-mono font-bold flex items-center gap-1.5 bg-white border border-[#D0D7DE] px-2.5 py-1 rounded-md shadow-2xs">
                <span className="text-[#1A7F37]">+{additions}</span>
                <span className="text-[#CF222E]">-{deletions}</span>
                <span className="text-slate-400 font-normal">lines</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-sans">1 file modified</span>
            )}

            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 border border-[#D0D7DE] bg-white transition shadow-2xs"
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* GitHub Segmented View Tabs */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E1E4E8]">
          <div className="flex items-center gap-1 text-xs font-semibold font-sans">
            <button
              onClick={() => onTabChange('diff')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeTab === 'diff'
                  ? 'bg-white text-[#1F2328] border border-[#D0D7DE] shadow-xs font-bold'
                  : 'text-[#656D76] hover:text-[#1F2328] hover:bg-slate-200/60'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5 text-indigo-600" />
              <span>Files changed (1)</span>
            </button>

            <button
              onClick={() => onTabChange('target')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeTab === 'target'
                  ? 'bg-white text-[#1F2328] border border-[#D0D7DE] shadow-xs font-bold'
                  : 'text-[#656D76] hover:text-[#1F2328] hover:bg-slate-200/60'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-rose-500" />
              <span>Original target.c</span>
            </button>

            <button
              onClick={() => onTabChange('harness')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeTab === 'harness'
                  ? 'bg-white text-[#1F2328] border border-[#D0D7DE] shadow-xs font-bold'
                  : 'text-[#656D76] hover:text-[#1F2328] hover:bg-slate-200/60'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Locked harness.c</span>
            </button>
          </div>

          {/* Split / Unified Toggle (Only on Diff tab) */}
          {activeTab === 'diff' && unifiedDiff && (
            <div className="flex items-center bg-[#EAEEF2] p-0.5 rounded-lg text-[11px] font-sans font-medium">
              <button
                onClick={() => setSplitMode(false)}
                className={`px-2 py-0.5 rounded ${
                  !splitMode ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Unified
              </button>
              <button
                onClick={() => setSplitMode(true)}
                className={`px-2 py-0.5 rounded ${
                  splitMode ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Split
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Explanatory Callout Banner */}
      {activeTab === 'target' && (
        <div className="px-4 py-2 bg-[#FFEBE9] border-b border-[#FFD1CE] text-xs text-[#CF222E] flex items-center justify-between font-sans">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#CF222E]" />
            <span className="font-medium">
              Defect at Line {faultLine}: Unchecked buffer bounds copy triggerable by controlled crash input.
            </span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white text-[#CF222E] border border-[#FFD1CE]">
            {cweLabel.split(':')[0]}
          </span>
        </div>
      )}

      {activeTab === 'diff' && (
        <div className="px-4 py-2 bg-[#E6FFEC] border-b border-[#CCFFD8] text-xs text-[#1A7F37] flex items-center justify-between font-sans">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-[#1A7F37]" />
            <span className="font-medium">
              Synthesized Patch: Added bounds checking constraint before memory operation. Zero sanitizer suppression.
            </span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white text-[#1A7F37] border border-[#CCFFD8]">
            Minimal Diff Budget Passed
          </span>
        </div>
      )}

      {activeTab === 'harness' && (
        <div className="px-4 py-2 bg-[#F6F8FA] border-b border-[#D0D7DE] text-xs text-slate-700 flex items-center justify-between font-sans">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0 text-slate-500" />
            <span className="font-medium">
              Deterministic Test Harness: Contains proof-of-concept crash vector and 3 benign protocol tests.
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">Read-Only Ground Truth</span>
        </div>
      )}

      {/* Main Diff / Code Table Area (GitHub Style Code Viewer) */}
      <div className="flex-1 overflow-auto font-mono text-[12.5px] leading-relaxed bg-white">
        {/* Tab 1: Unified / Split Diff */}
        {activeTab === 'diff' && (
          diffLines.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8 font-sans">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <GitCommit className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-700 text-sm">No patch synthesized yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Click <strong>"Clean & Verify Firmware"</strong> on the right to synthesize a surgical repair and evaluate with sanitizers.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {diffLines.map((line, idx) => {
                  let rowBg = 'hover:bg-slate-50';
                  let textCol = 'text-[#1F2328]';
                  let gutterBg = 'bg-white text-slate-400';
                  let prefix = ' ';

                  if (line.startsWith('+++') || line.startsWith('---')) {
                    rowBg = 'bg-[#F0F6FC] font-semibold';
                    textCol = 'text-[#0969DA]';
                    gutterBg = 'bg-[#EBF0F7] text-slate-400';
                  } else if (line.startsWith('@@')) {
                    rowBg = 'bg-[#F0F6FC] text-[#57606A] font-semibold';
                    gutterBg = 'bg-[#EBF0F7] text-[#57606A]';
                  } else if (line.startsWith('+')) {
                    rowBg = 'gh-diff-add font-semibold';
                    textCol = 'text-[#1F2328]';
                    gutterBg = 'gh-diff-add-line text-[#1A7F37]';
                    prefix = '+';
                  } else if (line.startsWith('-')) {
                    rowBg = 'gh-diff-del font-semibold';
                    textCol = 'text-[#1F2328]';
                    gutterBg = 'gh-diff-del-line text-[#CF222E]';
                    prefix = '-';
                  }

                  return (
                    <tr key={idx} className={`${rowBg} transition-colors border-b border-transparent`}>
                      <td className={`w-10 pr-2 py-0.5 text-right select-none font-mono text-xs ${gutterBg}`}>
                        {idx + 1}
                      </td>
                      <td className="w-6 text-center select-none font-mono font-bold text-xs opacity-70">
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
          )
        )}

        {/* Tab 2: Original target.c */}
        {activeTab === 'target' && (
          <table className="w-full border-collapse">
            <tbody>
              {origLines.map((line, idx) => {
                const lineNum = idx + 1;
                const isFault = lineNum === faultLine;

                return (
                  <tr
                    key={idx}
                    className={`${
                      isFault
                        ? 'bg-[#FFEBE9] font-semibold border-l-4 border-[#CF222E]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="w-10 pr-3 py-0.5 text-right select-none text-slate-400 font-mono text-xs bg-slate-50">
                      {lineNum}
                    </td>
                    <td className="whitespace-pre px-3 py-0.5 font-mono text-[#1F2328]">
                      {line || ' '}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Tab 3: harness.c */}
        {activeTab === 'harness' && (
          <table className="w-full border-collapse">
            <tbody>
              {harnessLines.map((line, idx) => {
                const isCrash = line.includes('--crash');
                const isBenign = line.includes('--benign');

                return (
                  <tr
                    key={idx}
                    className={`${
                      isCrash
                        ? 'bg-[#FFEBE9] font-semibold border-l-4 border-[#CF222E]'
                        : isBenign
                        ? 'bg-[#E6FFEC] font-semibold border-l-4 border-[#1A7F37]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="w-10 pr-3 py-0.5 text-right select-none text-slate-400 font-mono text-xs bg-slate-50">
                      {idx + 1}
                    </td>
                    <td className="whitespace-pre px-3 py-0.5 font-mono text-[#1F2328]">
                      {line || ' '}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

