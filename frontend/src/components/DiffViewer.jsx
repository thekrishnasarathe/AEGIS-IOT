// filepath: frontend/src/components/DiffViewer.jsx
import React, { useState } from 'react';
import { GitCompare, Copy, Check, FileCheck, Layers } from 'lucide-react';

export default function DiffViewer({ unifiedDiff, patchedSource, isRunning }) {
  const [activeTab, setActiveTab] = useState('diff'); // 'diff' | 'source'
  const [copied, setCopied] = useState(false);

  const diffLines = unifiedDiff ? unifiedDiff.replace(/\r\n/g, '\n').split('\n') : [];
  const sourceLines = patchedSource ? patchedSource.replace(/\r\n/g, '\n').split('\n') : [];

  const additions = diffLines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
  const deletions = diffLines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length;

  const handleCopy = () => {
    const text = activeTab === 'diff' ? unifiedDiff : patchedSource;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl flex flex-col h-full overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)]">
      {/* Header with View Toggle & Diff Metrics */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-slate-200/70 p-1 border border-slate-300/60 text-xs font-sans gap-1">
            <button
              onClick={() => setActiveTab('diff')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeTab === 'diff'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5 inline mr-1 text-indigo-600" />
              Unified Diff
            </button>
            <button
              onClick={() => setActiveTab('source')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeTab === 'source'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
              Patched Source
            </button>
          </div>
        </div>

        {/* Line Metrics & Copy */}
        <div className="flex items-center gap-2.5">
          {activeTab === 'diff' && unifiedDiff && (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                +{additions}
              </span>
              <span className="px-2 py-0.5 rounded-md font-bold bg-rose-50 text-rose-700 border border-rose-200">
                -{deletions}
              </span>
            </div>
          )}

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content Area (Slate Anchor) */}
      <div className="flex-1 overflow-auto font-mono text-xs p-3 leading-relaxed bg-[#0F172A] text-slate-100">
        {activeTab === 'diff' ? (
          diffLines.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-center p-6 font-sans">
              <Layers className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-slate-300 font-medium">Unified diff will appear once Stage 3 proposes candidate patch.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {diffLines.map((line, idx) => {
                  let rowClass = 'text-slate-300';
                  if (line.startsWith('+++') || line.startsWith('---')) {
                    rowClass = 'text-indigo-300 font-bold bg-indigo-950/40';
                  } else if (line.startsWith('@@')) {
                    rowClass = 'text-slate-400 bg-slate-800/40';
                  } else if (line.startsWith('+')) {
                    rowClass = 'bg-emerald-500/20 text-emerald-300 border-l-2 border-emerald-400 font-semibold';
                  } else if (line.startsWith('-')) {
                    rowClass = 'bg-rose-500/20 text-rose-300 border-l-2 border-rose-400 font-semibold';
                  }

                  return (
                    <tr key={idx} className={`font-mono ${rowClass}`}>
                      <td className="w-8 pr-2 text-right select-none text-slate-500 font-mono text-[10px]">
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
          sourceLines.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-center p-6 font-sans">
              <FileCheck className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-slate-300 font-medium">Patched target.c source code will display here.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {sourceLines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="w-10 pr-3 text-right select-none text-slate-500 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="whitespace-pre overflow-x-visible text-slate-200 font-mono">
                      {line || ' '}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
