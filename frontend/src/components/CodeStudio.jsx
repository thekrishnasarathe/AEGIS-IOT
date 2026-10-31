// filepath: frontend/src/components/CodeStudio.jsx
import React, { useState } from 'react';
import {
  FileCode,
  GitCompare,
  Lock,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function CodeStudio({
  originalCode,
  harnessCode,
  unifiedDiff,
  patchedSource,
  faultLine = 28,
  cweLabel = 'CWE-121',
  sampleName = 'Firmware Target',
  activeTab,
  onTabChange,
}) {
  const [copied, setCopied] = useState(false);
  const [diffSubMode, setDiffSubMode] = useState('diff'); // 'diff' | 'source'

  const origLines = originalCode ? originalCode.replace(/\r\n/g, '\n').split('\n') : [];
  const harnessLines = harnessCode ? harnessCode.replace(/\r\n/g, '\n').split('\n') : [];
  const diffLines = unifiedDiff ? unifiedDiff.replace(/\r\n/g, '\n').split('\n') : [];
  const patchLines = patchedSource ? patchedSource.replace(/\r\n/g, '\n').split('\n') : [];

  const additions = diffLines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
  const deletions = diffLines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length;

  const handleCopy = () => {
    let text = '';
    if (activeTab === 'target') text = originalCode;
    else if (activeTab === 'diff') text = diffSubMode === 'diff' ? unifiedDiff : patchedSource;
    else if (activeTab === 'harness') text = harnessCode;

    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-2 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] flex flex-col h-[700px] overflow-hidden">
      {/* Daylight macOS-Style Card Header */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Traffic Light Dots */}
          <div className="flex items-center gap-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-rose-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>

          {/* Segmented Tab Switcher with Larger Typography */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl border border-slate-300/60 text-sm font-sans gap-1">
            <button
              onClick={() => onTabChange('target')}
              className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold ${
                activeTab === 'target'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Vulnerable target.c
            </button>

            <button
              onClick={() => onTabChange('diff')}
              className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-2 ${
                activeTab === 'diff'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span>Patch Diff</span>
              {unifiedDiff && (
                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  +{additions}/-{deletions}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('harness')}
              className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold ${
                activeTab === 'harness'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Read-Only harness.c
            </button>
          </div>
        </div>

        {/* Right: CWE & Line Callout Pill + Action Tools */}
        <div className="flex items-center gap-2.5">
          {activeTab === 'diff' && (
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-300/60 text-xs font-sans">
              <button
                onClick={() => setDiffSubMode('diff')}
                className={`px-2.5 py-1 rounded font-semibold ${
                  diffSubMode === 'diff'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Diff
              </button>
              <button
                onClick={() => setDiffSubMode('source')}
                className={`px-2.5 py-1 rounded font-semibold ${
                  diffSubMode === 'source'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Full C
              </button>
            </div>
          )}

          <span className="text-xs px-3 py-1 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            {cweLabel.split(':')[0]} · Line {faultLine}
          </span>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 transition"
            title="Copy source code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Explanatory Callout Banner */}
      {activeTab === 'target' && (
        <div className="px-4 py-2 bg-rose-50 border-b border-rose-100 text-xs text-rose-800 flex items-center justify-between font-sans">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">
              Fault at Line {faultLine}: Unbounded memory copy without input length validation against buffer limit.
            </span>
          </div>
          <span className="text-xs text-rose-600 font-semibold">Original Source</span>
        </div>
      )}

      {activeTab === 'diff' && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-xs text-emerald-800 flex items-center justify-between font-sans">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">
              AI Repair: Added surgical boundary validation before memory copy ({additions + deletions} lines modified).
            </span>
          </div>
          <span className="text-xs text-emerald-600 font-semibold">Synthesized Diff</span>
        </div>
      )}

      {activeTab === 'harness' && (
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs text-slate-700 flex items-center justify-between font-sans">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="font-medium">
              Locked Ground-Truth Test Harness: Contains the <code className="font-mono text-rose-700 bg-rose-50 px-1 rounded">--crash</code> test payload and 3 benign protocol tests.
            </span>
          </div>
          <span className="text-xs text-slate-500 font-semibold">Read-Only Gate</span>
        </div>
      )}

      {/* Main Code View Area (High-Contrast Slate Anchor) */}
      <div className="flex-1 overflow-auto font-mono text-[13.5px] p-4 leading-relaxed bg-[#0F172A] rounded-b-xl text-slate-100 selection:bg-indigo-500/40 selection:text-indigo-100">
        {/* Tab 1: Vulnerable target.c */}
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
                        ? 'bg-rose-500/20 border-l-2 border-rose-500 font-semibold text-rose-100'
                        : 'hover:bg-slate-800/40 text-slate-200'
                    }`}
                  >
                    <td className="w-10 pr-4 text-right select-none text-slate-500 font-mono text-xs">
                      {lineNum}
                    </td>
                    <td className="whitespace-pre overflow-x-visible font-mono">
                      {line || ' '}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Tab 2: Diff / Patched Source */}
        {activeTab === 'diff' && (
          diffSubMode === 'diff' ? (
            diffLines.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8 font-sans">
                <GitCompare className="w-10 h-10 text-slate-500 mb-3" />
                <p className="font-bold text-slate-300 text-base">No patch generated yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Click "Run Verification" above to synthesize memory-safe C repairs and verify against compiler sanitizers.
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {diffLines.map((line, idx) => {
                    let rowClass = 'text-slate-300';
                    if (line.startsWith('+++') || line.startsWith('---')) {
                      rowClass = 'text-indigo-300 font-semibold bg-indigo-950/40';
                    } else if (line.startsWith('@@')) {
                      rowClass = 'text-slate-400 bg-slate-800/40';
                    } else if (line.startsWith('+')) {
                      rowClass = 'bg-emerald-500/20 text-emerald-300 border-l-2 border-emerald-400 font-semibold';
                    } else if (line.startsWith('-')) {
                      rowClass = 'bg-rose-500/20 text-rose-300 border-l-2 border-rose-400 font-semibold';
                    }

                    return (
                      <tr key={idx} className={`font-mono ${rowClass}`}>
                        <td className="w-8 pr-3 text-right select-none text-slate-500 font-mono text-xs">
                          {idx + 1}
                        </td>
                        <td className="whitespace-pre overflow-x-visible font-mono">{line || ' '}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {patchLines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 text-slate-200">
                    <td className="w-10 pr-4 text-right select-none text-slate-500 font-mono text-xs">
                      {idx + 1}
                    </td>
                    <td className="whitespace-pre overflow-x-visible font-mono">{line || ' '}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
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
                        ? 'bg-rose-500/20 border-l-2 border-rose-400 text-rose-200 font-medium'
                        : isBenign
                        ? 'bg-emerald-500/15 border-l-2 border-emerald-400 text-emerald-200 font-medium'
                        : 'hover:bg-slate-800/40 text-slate-200'
                    }`}
                  >
                    <td className="w-10 pr-4 text-right select-none text-slate-500 font-mono text-xs">
                      {lineNum => lineNum}
                      {idx + 1}
                    </td>
                    <td className="whitespace-pre overflow-x-visible font-mono">
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
