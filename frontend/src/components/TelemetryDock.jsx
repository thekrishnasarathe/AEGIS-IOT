// filepath: frontend/src/components/TelemetryDock.jsx
import React from 'react';
import { Terminal, Download, HardDrive, Clock, FileText, CheckCircle2 } from 'lucide-react';

export default function TelemetryDock({
  runState,
  activeTab,
  onSelectTab,
  onExportPatch,
  onExportMarkdown,
}) {
  const tabs = [
    { key: 'stage_1_cppcheck', label: 'Stage 1: cppcheck' },
    { key: 'stage_2_asan_repro', label: 'Stage 2: ASan Repro' },
    { key: 'stage_3_patch_diff', label: 'Stage 3: Patch Diff' },
    { key: 'stage_4_gcc', label: 'Stage 4: GCC Compiler' },
    { key: 'stage_5_crash_replay', label: 'Stage 5: Crash Replay' },
    { key: 'stage_6_guards', label: 'Stage 6: Integrity Guards' },
    { key: 'stage_7_audit_md', label: 'Stage 7: Audit Report' },
  ];

  const rawLogs = runState?.raw_logs || {};
  const currentLog = rawLogs[activeTab] || 'No telemetry logged for this stage yet.';

  const telemetry = runState?.stage_7?.runtime_telemetry || {};
  const deltas = runState?.stage_7?.resource_delta || {};

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] flex flex-col lg:flex-row h-72">
      {/* Left / Center: Raw Log Drawer */}
      <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 min-w-0">
        {/* Tab Headers */}
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 font-sans text-xs">
            <Terminal className="w-4 h-4 text-indigo-600 mr-1 shrink-0" />
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const hasData = Boolean(rawLogs[tab.key]);

              return (
                <button
                  key={tab.key}
                  onClick={() => onSelectTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                  {hasData && <span className="ml-1.5 w-1.5 h-1.5 inline-block rounded-full bg-emerald-500" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Log Viewer Body (Slate Anchor) */}
        <div className="flex-1 p-3 bg-[#0F172A] overflow-auto font-mono text-xs leading-relaxed text-slate-100 whitespace-pre">
          {currentLog}
        </div>
      </div>

      {/* Right: Resource Overhead Card & 1-Click Export Actions */}
      <div className="w-full lg:w-80 bg-slate-50 p-4 flex flex-col justify-between shrink-0 border-l border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-4 h-4 text-indigo-600" />
            <span className="font-sans text-xs font-bold text-slate-900">
              Binary Overhead & Telemetry
            </span>
          </div>

          {/* Memory Sections Table */}
          <div className="space-y-2 font-sans text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-slate-500">.text (Code Section)</span>
              <span className="font-mono font-bold text-slate-900">
                {deltas.text_bytes !== undefined ? `+${deltas.text_bytes} B` : '--'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-slate-500">.data (Static Inits)</span>
              <span className="font-mono font-bold text-emerald-700">
                {deltas.data_bytes !== undefined ? `${deltas.data_bytes} B` : '--'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-slate-500">.bss (Zero Inits)</span>
              <span className="font-mono font-bold text-slate-900">
                {deltas.bss_bytes !== undefined ? `${deltas.bss_bytes} B` : '--'}
              </span>
            </div>

            {/* FR-28 Boundary Sweep */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                FR-28 Boundary Sweep
              </span>
              <span className="font-bold text-emerald-700">
                {runState?.verdict === 'VERIFIED'
                  ? '5 of 5 clean'
                  : runState?.verdict === 'REJECTED'
                  ? 'Blocked at G6'
                  : '--'}
              </span>
            </div>

            {/* Runtime Median */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                -O2 Runtime Delta
              </span>
              <span className="font-bold text-indigo-700">
                {telemetry.delta_pct || '--'}
              </span>
            </div>
          </div>
        </div>

        {/* 1-Click Export Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
          <button
            onClick={onExportPatch}
            disabled={!runState?.run_id}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-sans font-bold text-slate-800 transition shadow-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Export Unified .patch</span>
          </button>

          <button
            onClick={onExportMarkdown}
            disabled={!runState?.run_id}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-sans font-bold text-slate-800 transition shadow-xs disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Export Evidence Report.md</span>
          </button>
        </div>
      </div>
    </div>
  );
}
