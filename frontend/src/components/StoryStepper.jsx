// filepath: frontend/src/components/StoryStepper.jsx
import React from 'react';
import {
  SearchCode,
  Flame,
  Sparkles,
  Hammer,
  ShieldCheck,
  Lock,
  Award,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';

export default function StoryStepper({ runState, onOpenLogStage }) {
  const stage1 = runState?.stage_1?.status || 'PENDING';
  const stage2 = runState?.stage_2?.status || 'PENDING';
  const stage3 = runState?.stage_3?.status || 'PENDING';
  const stage4 = runState?.stage_4?.status || 'PENDING';
  const stage5 = runState?.stage_5?.status || 'PENDING';
  const stage6 = runState?.stage_6?.status || 'PENDING';
  const stage7 = runState?.stage_7?.status || 'PENDING';

  const steps = [
    { key: 'stage_1_cppcheck', num: 'STAGE 1', title: 'Static Finding', icon: SearchCode, status: stage1 },
    { key: 'stage_2_asan_repro', num: 'STAGE 2', title: 'Bug Repro', icon: Flame, status: stage2 },
    { key: 'stage_3_patch_diff', num: 'STAGE 3', title: 'Patch Proposed', icon: Sparkles, status: stage3 },
    { key: 'stage_4_gcc', num: 'STAGE 4', title: 'GCC Compiles', icon: Hammer, status: stage4 },
    { key: 'stage_5_crash_replay', num: 'STAGE 5', title: 'Crash Clean', icon: ShieldCheck, status: stage5 },
    { key: 'stage_6_guards', num: 'STAGE 6', title: 'Anti-Cheat', icon: Lock, status: stage6 },
    { key: 'stage_7_audit_md', num: 'STAGE 7', title: 'Audit Verified', icon: Award, status: stage7 },
  ];

  return (
    <div className="w-full mb-4 overflow-x-auto pb-1">
      <div className="flex items-center gap-2 min-w-[1080px] justify-between">
        {steps.map((step, idx) => {
          const isPassed = step.status === 'PASSED';
          const isFailed = step.status === 'FAILED';
          const isRunning = step.status === 'RUNNING';
          const StepIcon = step.icon;

          // Card pill style
          let cardStyle = 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300 shadow-sm';
          let badgeStyle = 'bg-slate-100 text-slate-500';
          let numStyle = 'text-slate-400';
          let titleStyle = 'text-slate-800';
          let IconComponent = <StepIcon className="w-4 h-4" />;

          if (isPassed) {
            cardStyle = 'bg-emerald-50/80 border-emerald-200 shadow-sm shadow-emerald-500/5';
            badgeStyle = 'bg-emerald-100 text-emerald-600';
            numStyle = 'text-emerald-700';
            titleStyle = 'text-emerald-950';
            IconComponent = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
          } else if (isFailed) {
            cardStyle = 'bg-rose-50/80 border-rose-200 shadow-sm shadow-rose-500/5';
            badgeStyle = 'bg-rose-100 text-rose-600';
            numStyle = 'text-rose-700';
            titleStyle = 'text-rose-950';
            IconComponent = <XCircle className="w-5 h-5 text-rose-600" />;
          } else if (isRunning) {
            cardStyle = 'bg-indigo-50/90 border-indigo-200 shadow-sm shadow-indigo-500/10 animate-pulse';
            badgeStyle = 'bg-indigo-100 text-indigo-600';
            numStyle = 'text-indigo-600';
            titleStyle = 'text-indigo-950';
            IconComponent = <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />;
          }

          return (
            <React.Fragment key={step.key}>
              <button
                onClick={() => onOpenLogStage(step.key)}
                className={`flex-1 flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-150 cursor-pointer text-left ${cardStyle}`}
                title={`Inspect Stage logs: ${step.title}`}
              >
                {/* 32x32 Rounded Icon Badge */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${badgeStyle}`}>
                  {IconComponent}
                </div>

                {/* Step Metadata */}
                <div className="min-w-0 flex-1">
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${numStyle}`}>
                    {step.num}
                  </div>
                  <div className={`text-sm font-bold truncate ${titleStyle}`}>
                    {step.title}
                  </div>
                </div>

                {/* Status indicator on the right */}
                {isPassed && idx === 1 && (
                  <span className="hidden xl:inline text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md">
                    Crash OK
                  </span>
                )}
              </button>

              {idx < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mx-0.5" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
