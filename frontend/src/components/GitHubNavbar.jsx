// filepath: frontend/src/components/GitHubNavbar.jsx
import React, { useState } from 'react';
import {
  ShieldCheck,
  GitBranch,
  Cpu,
  BarChart2,
  ChevronDown,
  Layers,
  FileWarning,
  ShieldAlert,
  Zap,
  Check,
  ExternalLink,
} from 'lucide-react';

export default function GitHubNavbar({
  selectedSampleId,
  onSelectSample,
  executionLane,
  onChangeLane,
  onRunLadder,
  isRunning,
  onOpenBenchmark,
}) {
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  const scenarios = [
    { id: 'iot_mqtt_parser', label: 'iot_mqtt_parser', title: '1. UART Stack Overflow', cwe: 'CWE-121', icon: Cpu },
    { id: 'iot_coap_option_heap', label: 'iot_coap_option_heap', title: '2. CoAP Heap Overflow', cwe: 'CWE-122', icon: Layers },
    { id: 'iot_ota_manifest_null', label: 'iot_ota_manifest_null', title: '3. OTA Null Pointer', cwe: 'CWE-476', icon: FileWarning },
    { id: 'iot_adversarial_guard_demo', label: 'iot_adversarial_guard_demo', title: '4. Adversarial AI Guard', cwe: 'CWE-121 (Cheat)', icon: ShieldAlert },
  ];

  const currentScenario = scenarios.find((s) => s.id === selectedSampleId) || scenarios[0];

  return (
    <header className="bg-[#24292F] text-white sticky top-0 z-50 border-b border-[#30363D]">
      {/* Top Main Navigation Bar */}
      <div className="max-w-[1780px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: GitHub Repository Breadcrumbs */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#8B949E] hover:underline cursor-pointer">sigmoid-squad</span>
            <span className="text-[#8B949E]">/</span>
            <span className="font-bold text-white tracking-tight flex items-center gap-2">
              <span>aegis-firmware-repair</span>
              <span className="text-[10px] font-semibold text-[#58A6FF] bg-[#388BFD]/15 px-2 py-0.5 rounded-full border border-[#388BFD]/30">
                Public · AI-Manthan 2.0
              </span>
            </span>
          </div>
        </div>

        {/* Center: GitHub-Style Branch / Scenario Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
            disabled={isRunning}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#30363D] hover:bg-[#3C444D] text-white text-xs font-semibold border border-[#484F58] shadow-2xs transition disabled:opacity-50"
          >
            <GitBranch className="w-3.5 h-3.5 text-[#58A6FF]" />
            <span className="font-mono">{currentScenario.label}</span>
            <span className="text-[10px] text-amber-300 font-normal">({currentScenario.cwe})</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Branch Dropdown Menu */}
          {isBranchDropdownOpen && (
            <div
              className="absolute left-0 mt-2 w-80 bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150"
              onMouseLeave={() => setIsBranchDropdownOpen(false)}
            >
              <div className="p-2.5 bg-[#21262D] border-b border-[#30363D] text-[11px] font-semibold text-[#8B949E]">
                Switch Vulnerability Target (IoT Firmware)
              </div>
              <div className="p-1 space-y-0.5">
                {scenarios.map((sc) => {
                  const isSelected = sc.id === selectedSampleId;
                  const Icon = sc.icon;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => {
                        onSelectSample(sc.id);
                        setIsBranchDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition ${
                        isSelected
                          ? 'bg-[#1F6FEB]/20 text-[#58A6FF] font-semibold'
                          : 'text-[#C9D1D9] hover:bg-[#21262D]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <div className="font-mono text-xs">{sc.label}</div>
                          <div className="text-[10px] text-[#8B949E]">{sc.title}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#58A6FF]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Lane Selector + Benchmarks + Fail-Safe Insurance Pill */}
        <div className="flex items-center gap-3">
          {/* Stage Insurance Active */}
          <span className="hidden xl:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Stage Insurance Active
          </span>

          {/* Model Lane Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#30363D] border border-[#484F58] px-2.5 py-1 rounded-lg text-xs font-medium">
            <Cpu className="w-3.5 h-3.5 text-[#58A6FF]" />
            <select
              value={executionLane}
              onChange={(e) => onChangeLane(e.target.value)}
              disabled={isRunning}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
            >
              <option value="REPLAY_FIXTURE" className="bg-[#161B22] text-white">
                Lane: Replay Fixture
              </option>
              <option value="CLOUD_LLM" className="bg-[#161B22] text-white">
                Lane: Cloud LLM
              </option>
              <option value="LOCAL_OLLAMA" className="bg-[#161B22] text-white">
                Lane: Local Ollama
              </option>
            </select>
          </div>

          {/* Benchmarks Matrix Button */}
          <button
            onClick={onOpenBenchmark}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#30363D] hover:bg-[#3C444D] text-white text-xs font-semibold border border-[#484F58] transition"
          >
            <BarChart2 className="w-3.5 h-3.5 text-[#58A6FF]" />
            <span className="hidden sm:inline">Benchmarks</span>
          </button>
        </div>
      </div>
    </header>
  );
}

