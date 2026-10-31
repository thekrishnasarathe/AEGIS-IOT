// filepath: frontend/src/components/LogDrawer.jsx
import React, { useState } from 'react';
import { Terminal, X, Copy, Check } from 'lucide-react';

export default function LogDrawer({ isOpen, onClose, activeTab, onSelectTab, runState }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const tabs = [
    { key: 'stage_1_cppcheck', label: '1. cppcheck Static' },
    { key: 'stage_2_asan_repro', label: '2. ASan Crash Trace' },
    { key: 'stage_3_patch_diff', label: '3. Unified Diff' },
    { key: 'stage_4_gcc', label: '4. GCC Compiler' },
    { key: 'stage_5_crash_replay', label: '5. Crash Replay' },
    { key: 'stage_6_guards', label: '6. Integrity Audit' },
    { key: 'stage_7_audit_md', label: '7. Full Report Markdown' },
  ];

  const rawLogs = runState?.raw_logs || {};
  const currentContent = rawLogs[activeTab] || 'No terminal logs recorded for this stage yet.';

  const handleCopy = () => {
    if (!currentContent) return;
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm transition-all font-sans">
      <div className="bg-white border border-slate-200 rounded-t-2xl w-full max-w-6xl h-[70vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-150">
        {/* Drawer Header */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <span>Deterministic Tool Execution Logs</span>
                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Subprocess Output
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-sans">
                Unfiltered ground truth from cppcheck, AddressSanitizer, GCC, and Stage 6 integrity scanners.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-sans font-bold text-slate-800 border border-slate-200 transition shadow-xs"
              title="Copy active terminal log"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              <span>{copied ? 'Copied' : 'Copy Log'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
              title="Close log drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 7 Tab Navigation Bar */}
        <div className="px-4 py-2 bg-slate-100/90 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const hasData = Boolean(rawLogs[tab.key]);
            return (
              <button
                key={tab.key}
                onClick={() => onSelectTab(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-sans whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'bg-white text-slate-900 font-bold border border-slate-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 font-semibold'
                }`}
              >
                <span>{tab.label}</span>
                {hasData && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </button>
            );
          })}
        </div>

        {/* Terminal Screen Body (High-Contrast Slate Anchor) */}
        <div className="flex-1 p-5 bg-[#0F172A] overflow-auto font-mono text-xs text-slate-100 leading-relaxed whitespace-pre selection:bg-indigo-500/40 selection:text-indigo-100">
          {currentContent}
        </div>
      </div>
    </div>
  );
}
