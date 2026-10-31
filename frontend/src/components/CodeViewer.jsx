// filepath: frontend/src/components/CodeViewer.jsx
import React, { useState } from 'react';
import { Copy, Check, FileCode, AlertCircle } from 'lucide-react';

export default function CodeViewer({ code, faultLine = 28, cweLabel = 'CWE-121' }) {
  const [copied, setCopied] = useState(false);

  const lines = code ? code.replace(/\r\n/g, '\n').split('\n') : [];

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl flex flex-col h-full overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)]">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-indigo-600" />
          <span className="font-sans text-xs font-bold text-slate-900">
            target.c <span className="text-slate-500 font-normal">(Original Grounded Source)</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Fault Line {faultLine}: {cweLabel.split(':')[0]}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition"
            title="Copy code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Code Area (Slate Anchor) */}
      <div className="flex-1 overflow-auto font-mono text-xs p-3 leading-relaxed bg-[#0F172A] text-slate-100">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const isFault = lineNum === faultLine;

              return (
                <tr
                  key={idx}
                  className={`${
                    isFault
                      ? 'bg-rose-500/20 border-l-2 border-rose-500 text-rose-100 font-semibold'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="w-10 pr-3 text-right select-none text-slate-500 font-mono text-[11px]">
                    {lineNum}
                  </td>
                  <td className="whitespace-pre overflow-x-visible text-slate-200 font-mono">
                    {line || ' '}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
