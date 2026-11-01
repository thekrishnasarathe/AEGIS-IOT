// filepath: frontend/src/components/github/GitHubTopNav.jsx
import React, { useState } from 'react';
import {
  GitBranch,
  Star,
  GitFork,
  Eye,
  Search,
  Play,
  RotateCw,
  Cpu,
  ChevronDown,
  Check,
  Layers,
  FileWarning,
  ShieldAlert,
  Upload,
  Radio,
} from 'lucide-react';

export default function GitHubTopNav({
  selectedSampleId,
  onSelectSample,
  executionLane,
  onChangeLane,
  onRunLadder,
  onOpenUpload,
  isRunning,
  verdict,
}) {
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  const scenarios = [
    { id: 'iot_mqtt_parser', label: 'iot_mqtt_parser', desc: 'UART Stack Overflow (CWE-121)', icon: Cpu },
    { id: 'iot_coap_option_heap', label: 'iot_coap_option_heap', desc: 'CoAP Heap Overflow (CWE-122)', icon: Layers },
    { id: 'iot_ota_manifest_null', label: 'iot_ota_manifest_null', desc: 'OTA Null Pointer (CWE-476)', icon: FileWarning },
    { id: 'iot_adversarial_guard_demo', label: 'iot_adversarial_guard_demo', desc: 'Catching Cheating AI (Stage 6 Blocked)', icon: ShieldAlert },
  ];

  const currentScenario = scenarios.find((s) => s.id === selectedSampleId) || scenarios[0];

  return (
    <div className="bg-[#161B22] text-[#E6EDF3] border-b border-[#30363D]">
      {/* 1. Global GitHub Dark Top Bar */}
      <div className="px-6 h-14 bg-[#010409] border-b border-[#30363D] flex items-center justify-between text-sm">
        {/* Left: GitHub Octocat Logo & Repo Breadcrumb */}
        <div className="flex items-center gap-3.5">
          {/* GitHub Octocat Icon */}
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#010409] shadow-xs shrink-0">
            <svg height="22" viewBox="0 0 16 16" width="22" fill="currentColor">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
            </svg>
          </div>

          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="text-[#8B949E] hover:underline cursor-pointer">sigmoid-squad</span>
            <span className="text-[#8B949E]">/</span>
            <span className="font-bold text-white hover:underline cursor-pointer">aegis-firmware-repair</span>
            <span className="text-[11px] font-semibold text-[#58A6FF] bg-[#388BFD]/15 px-2.5 py-0.5 rounded-full border border-[#388BFD]/30 ml-1">
              Public · AI-Manthan 2.0
            </span>
          </div>

          {/* Search Bar */}
          <div className="hidden lg:flex items-center gap-2 bg-[#0D1117] border border-[#30363D] rounded-md px-3 py-1 text-xs text-[#8B949E] w-64 ml-2">
            <Search className="w-3.5 h-3.5" />
            <span>Search or jump to...</span>
            <span className="ml-auto border border-[#30363D] px-1.5 py-0.2 rounded text-[10px] font-mono text-[#8B949E]">/</span>
          </div>
        </div>

        {/* Right: Stage Insurance + Lane Selector + Primary CTA */}
        <div className="flex items-center gap-3">
          {/* HIL Node Badge */}
          <span className="hidden xl:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            HIL: ATmega328P
          </span>

          {/* Stage Insurance Indicator */}
          <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Stage Insurance Active
          </span>

          {/* Provider Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#21262D] border border-[#30363D] px-3 py-1.5 rounded-md text-xs font-medium">
            <Cpu className="w-3.5 h-3.5 text-[#58A6FF]" />
            <select
              value={executionLane}
              onChange={(e) => onChangeLane(e.target.value)}
              disabled={isRunning}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
            >
              <option value="CLOUD_LLM" className="bg-[#161B22] text-white">Auto (Cloud -&gt; Local Qwen 3.5 -&gt; Replay)</option>
              <option value="LOCAL_OLLAMA" className="bg-[#161B22] text-white">Local Ollama (qwen3.5:4b)</option>
              <option value="REPLAY_FIXTURE" className="bg-[#161B22] text-white">Recorded Replay (Stage Insurance)</option>
            </select>
          </div>

          {/* Upload .C File / Folder Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#21262D] hover:bg-[#30363D] text-white border border-[#30363D] text-xs font-semibold transition cursor-pointer shadow-xs"
            title="Upload single .c/.h file or entire firmware folder"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Upload .C / Folder</span>
          </button>

          {/* Primary Action Button: Authentic GitHub Green */}
          <button
            onClick={onRunLadder}
            disabled={isRunning}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition shadow-xs cursor-pointer ${
              isRunning
                ? 'bg-[#238636]/80 text-white cursor-wait animate-pulse'
                : 'bg-[#238636] hover:bg-[#2EA043] text-white border border-[#2EA043] shadow-sm'
            }`}
          >
            {isRunning ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Ladder...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Verification</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Repository Sub-Header with Branch Switcher & Social Counters */}
      <div className="px-6 py-3 bg-[#0D1117] border-b border-[#30363D] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Branch Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              disabled={isRunning}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#21262D] hover:bg-[#30363D] text-white text-xs font-semibold border border-[#30363D] shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <GitBranch className="w-3.5 h-3.5 text-[#58A6FF]" />
              <span className="font-mono font-bold">{currentScenario.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8B949E]" />
            </button>

            {isBranchDropdownOpen && (
              <div
                className="absolute left-0 mt-2 w-84 bg-[#161B22] border border-[#30363D] rounded-md shadow-2xl z-50 overflow-hidden"
                onMouseLeave={() => setIsBranchDropdownOpen(false)}
              >
                <div className="p-2.5 bg-[#21262D] border-b border-[#30363D] text-xs font-bold text-[#8B949E] uppercase tracking-wider">
                  Switch Vulnerability Scenario
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
                        className={`w-full flex items-center justify-between p-2.5 rounded-md text-left text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#1F6FEB]/20 text-[#58A6FF] font-semibold'
                            : 'text-[#C9D1D9] hover:bg-[#21262D]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-[#8B949E] shrink-0" />
                          <div>
                            <div className="font-mono font-bold text-xs text-white">{sc.label}</div>
                            <div className="text-[11px] text-[#8B949E]">{sc.desc}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#58A6FF] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <span className="text-xs text-[#8B949E] font-medium hidden sm:inline">
            Active Target: <strong className="text-[#E6EDF3]">{currentScenario.desc}</strong>
          </span>
        </div>

        {/* GitHub Social Counters */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center rounded-md border border-[#30363D] bg-[#21262D] overflow-hidden text-xs">
            <button className="flex items-center gap-1.5 px-2.5 py-1 text-[#C9D1D9] hover:bg-[#30363D] transition cursor-pointer">
              <Eye className="w-3.5 h-3.5 text-[#8B949E]" />
              <span className="font-semibold">Watch</span>
            </button>
            <span className="px-2 py-1 bg-[#161B22] text-[#8B949E] border-l border-[#30363D] font-mono text-[11px] font-bold">
              3
            </span>
          </div>

          <div className="flex items-center rounded-md border border-[#30363D] bg-[#21262D] overflow-hidden text-xs">
            <button className="flex items-center gap-1.5 px-2.5 py-1 text-[#C9D1D9] hover:bg-[#30363D] transition cursor-pointer">
              <GitFork className="w-3.5 h-3.5 text-[#8B949E]" />
              <span className="font-semibold">Fork</span>
            </button>
            <span className="px-2 py-1 bg-[#161B22] text-[#8B949E] border-l border-[#30363D] font-mono text-[11px] font-bold">
              12
            </span>
          </div>

          <div className="flex items-center rounded-md border border-[#30363D] bg-[#21262D] overflow-hidden text-xs">
            <button className="flex items-center gap-1.5 px-2.5 py-1 text-[#C9D1D9] hover:bg-[#30363D] transition cursor-pointer">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
              <span className="font-semibold">Star</span>
            </button>
            <span className="px-2 py-1 bg-[#161B22] text-[#8B949E] border-l border-[#30363D] font-mono text-[11px] font-bold">
              48
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
