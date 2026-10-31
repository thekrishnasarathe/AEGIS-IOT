// filepath: frontend/src/components/verification/StageNavigationRail.jsx
import React from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCw,
  Search,
  Flame,
  Sparkles,
  Hammer,
  ShieldCheck,
  Lock,
  Award,
} from 'lucide-react';

export default function StageNavigationRail({
  currentStageIdx,
  onSelectStage,
  runState,
  isRunning,
}) {
  const verdict = runState?.verdict || 'INITIALIZING';

  const stages = [
    {
      id: 0,
      gate: 'GATE 01',
      label: 'AST Scan',
      sub: 'Static C Triage',
      icon: Search,
      color: '#22D3EE',
      data: runState?.stage_1,
    },
    {
      id: 1,
      gate: 'GATE 02',
      label: 'Bug Repro',
      sub: 'ASan Memory Crash',
      icon: Flame,
      color: '#EF4444',
      data: runState?.stage_2,
    },
    {
      id: 2,
      gate: 'GATE 03',
      label: 'AI Patch',
      sub: 'Few-Shot Synthesis',
      icon: Sparkles,
      color: '#38BDF8',
      data: runState?.stage_3,
    },
    {
      id: 3,
      gate: 'GATE 04',
      label: 'GCC Gate',
      sub: '-O2 Native Compile',
      icon: Hammer,
      color: '#3B82F6',
      data: runState?.stage_4,
    },
    {
      id: 4,
      gate: 'GATE 05',
      label: 'Input Test',
      sub: 'Zero-Crash Check',
      icon: ShieldCheck,
      color: '#06B6D4',
      data: runState?.stage_5,
    },
    {
      id: 5,
      gate: 'GATE 06',
      label: 'Integrity',
      sub: 'Anti-Cheat Guards',
      icon: Lock,
      color: '#F59E0B',
      data: runState?.stage_6,
    },
    {
      id: 6,
      gate: 'GATE 07',
      label: 'Evidence',
      sub: 'Budget Audit Proof',
      icon: Award,
      color: '#10B981',
      data: runState?.stage_7,
    },
  ];

  return (
    <div className="w-full bg-[#080C14] border-2 border-black rounded-xl p-3 shadow-2xl font-sans">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[10px] text-sky-400">⚡ 7-GATE DETERMINISTIC LADDER</span>
          <span className="text-[10px] font-vt text-slate-400 tracking-wider">
            [VOXEL VERIFICATION RAILS]
          </span>
        </div>
        <div className="text-[10px] font-pixel text-slate-400">
          STATUS: <span className="text-white">{verdict}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {stages.map((st) => {
          const isSelected = currentStageIdx === st.id;
          const status = st.data?.status || 'PENDING';
          const duration = st.data?.duration_ms;
          const Icon = st.icon;

          let matClass = 'mat-obsidian';
          let statusBadgeText = 'PENDING';

          if (status === 'PASSED') {
            matClass = 'mat-emerald';
            statusBadgeText = 'PASS';
          } else if (status === 'FAILED') {
            matClass = 'mat-redstone';
            statusBadgeText = 'FAIL';
          } else if (status === 'RUNNING') {
            matClass = 'mat-glowstone text-black';
            statusBadgeText = 'RUN';
          }

          const selectedRing = isSelected
            ? 'ring-4 ring-sky-400 scale-[1.02] z-20 shadow-xl'
            : 'hover:scale-[1.01]';

          return (
            <button
              key={st.id}
              onClick={() => onSelectStage(st.id)}
              className={`voxel-block lego-studs p-3 rounded-lg text-left transition-all duration-150 cursor-pointer flex flex-col justify-between min-h-[96px] ${matClass} ${selectedRing}`}
            >
              {/* Top Gate Tag */}
              <div className="flex items-center justify-between w-full">
                <span className="font-pixel text-[8px] tracking-tighter opacity-90">
                  {st.gate}
                </span>

                {status === 'PASSED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                ) : status === 'FAILED' ? (
                  <XCircle className="w-3.5 h-3.5 text-white shrink-0" />
                ) : status === 'RUNNING' ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-black shrink-0" />
                ) : null}
              </div>

              {/* Title & Icon */}
              <div className="my-1.5 flex items-center gap-1.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-pixel text-[9px] font-bold truncate tracking-tight">
                  {st.label}
                </span>
              </div>

              {/* Bottom Telemetry / Duration */}
              <div className="flex items-center justify-between text-[9px] font-vt tracking-wider w-full opacity-90 border-t border-black/20 pt-1">
                <span className="truncate">{st.sub}</span>
                {duration !== undefined && duration > 0 ? (
                  <span className="font-pixel text-[7px] shrink-0">{Math.round(duration)}ms</span>
                ) : (
                  <span className="font-pixel text-[7px] shrink-0">{statusBadgeText}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
