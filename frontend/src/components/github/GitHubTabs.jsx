// filepath: frontend/src/components/github/GitHubTabs.jsx
import React from 'react';
import {
  Code,
  PlayCircle,
  Shield,
  BarChart2,
  CheckCircle2,
  XCircle,
  RotateCw,
  Upload,
  Zap,
  Cpu,
} from 'lucide-react';

export default function GitHubTabs({ activeTab, onSelectTab, runState, isRunning }) {
  const verdict = runState?.verdict || 'INITIALIZING';

  const tabs = [
    {
      id: 'code',
      label: '<> Code & Upload',
      icon: Code,
      badge: null,
    },
    {
      id: 'actions',
      label: '⚡ 3D Verification Actions',
      icon: PlayCircle,
      badge: isRunning ? (
        <RotateCw className="w-3.5 h-3.5 animate-spin text-[#58A6FF]" />
      ) : verdict === 'VERIFIED' ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950]" />
      ) : verdict === 'REJECTED' ? (
        <XCircle className="w-3.5 h-3.5 text-[#F85149]" />
      ) : null,
    },
    {
      id: 'security',
      label: '🛡 Security & Executive Cards',
      icon: Shield,
      badge: '4 Cards',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    },
    {
      id: 'benchmark',
      label: '📊 Benchmark, Juliet & Competitors',
      icon: BarChart2,
      badge: '9 Cases',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
    },
    {
      id: 'hardware',
      label: '🔌 Hardware HIL Console',
      icon: Cpu,
      badge: runState?.hardware_state?.connected ? 'COM ACTIVE' : 'DIGITAL TWIN',
      badgeColor: runState?.hardware_state?.connected
        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    },
  ];

  return (
    <div className="bg-[#0D1117] border-b border-[#30363D] px-6 text-sm">
      <nav className="max-w-[1560px] mx-auto flex items-center gap-2 overflow-x-auto">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          const Icon = t.icon;

          return (
            <button
              key={t.id}
              onClick={() => onSelectTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition duration-150 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-[#F78166] text-white font-semibold bg-[#161B22]/50'
                  : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#8B949E]/40'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8B949E]'}`} />
              <span className="tracking-tight">{t.label}</span>

              {/* Status Badge */}
              {t.badge && (
                typeof t.badge === 'string' ? (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                      t.badgeColor || 'bg-[#21262D] text-[#C9D1D9] border border-[#30363D]'
                    }`}
                  >
                    {t.badge}
                  </span>
                ) : (
                  <span>{t.badge}</span>
                )
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
