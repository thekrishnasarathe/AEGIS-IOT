// filepath: frontend/src/components/GitHubPipelineRibbon.jsx
import React from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCw,
  SearchCode,
  Flame,
  Sparkles,
  ShieldCheck,
  Lock,
  ChevronRight,
  Terminal,
} from 'lucide-react';

export default function GitHubPipelineRibbon({ runState, onOpenLogStage }) {
  const stage1 = runState?.stage_1?.status || 'PENDING';
  const stage2 = runState?.stage_2?.status || 'PENDING';
  const stage3 = runState?.stage_3?.status || 'PENDING';
  const stage4 = runState?.stage_4?.status || 'PENDING';
  const stage5 = runState?.stage_5?.status || 'PENDING';
  const stage6 = runState?.stage_6?.status || 'PENDING';
  const stage7 = runState?.stage_7?.status || 'PENDING';

  const stages = [
    {
      key: 'stage_1_cppcheck',
      label: '1. Scan',
      sub: 'cppcheck triage',
      status: stage1,
      icon: SearchCode,
    },
    {
      key: 'stage_2_asan_repro',
      label: '2. Reproduce Bug',
      sub: 'ASan crash vector',
      status: stage2,
      icon: Flame,
    },
    {
      key: 'stage_3_patch_diff',
      label: '3. Propose Patch',
      sub: 'Minimal unified diff',
      status: stage3,
      icon: Sparkles,
    },
    {
      key: 'stage_5_crash_replay',
      label: '4. ASan Replay',
      sub: 'Crash input clean',
      status: stage5,
      icon: ShieldCheck,
    },
    {
      key: 'stage_6_guards',
      label: '5. Anti-Cheat Guard',
      sub: 'Zero bypass & 3 benign tests',
      status: stage6,
      icon: Lock,
    },
  ];

  return (
    <div className="w-full mb-4">
      {/* GitHub Workflow Run Card */}
      <div className="gh-card p-2.5 flex items-center justify-between gap-2 overflow-x-auto bg-white border border-[#D0D7DE]">
        {stages.map((st, idx) => {
          const isPassed = st.status === 'PASSED';
          const isFailed = st.status === 'FAILED';
          const isRunning = st.status === 'RUNNING';
          const Icon = st.icon;

          let pillBg = 'bg-[#F6F8FA] border-[#D0D7DE] text-[#656D76] hover:bg-[#EAEEF2]';
          let iconComponent = <Icon className="w-4 h-4 text-slate-400" />;

          if (isPassed) {
            pillBg = 'bg-[#E6FFEC] border-[#2DA44E]/40 text-[#1A7F37] shadow-2xs';
            iconComponent = <CheckCircle2 className="w-4 h-4 text-[#1A7F37]" />;
          } else if (isFailed) {
            pillBg = 'bg-[#FFEBE9] border-[#CF222E]/40 text-[#CF222E] shadow-2xs';
            iconComponent = <XCircle className="w-4 h-4 text-[#CF222E]" />;
          } else if (isRunning) {
            pillBg = 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs animate-pulse';
            iconComponent = <RotateCw className="w-4 h-4 text-indigo-600 animate-spin" />;
          }

          return (
            <React.Fragment key={st.key}>
              <button
                onClick={() => onOpenLogStage(st.key)}
                className={`flex-1 min-w-[170px] p-2 rounded-xl border flex items-center gap-2.5 transition cursor-pointer text-left ${pillBg}`}
                title={`Inspect tool log for ${st.label}`}
              >
                <div className="shrink-0">{iconComponent}</div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate leading-tight">{st.label}</div>
                  <div className="text-[10px] opacity-75 truncate">{st.sub}</div>
                </div>
              </button>

              {idx < stages.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

