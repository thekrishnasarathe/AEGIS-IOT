// filepath: frontend/src/components/Navbar.jsx
import React from 'react';
import {
  ShieldCheck,
  Play,
  Loader2,
  BarChart2,
  Cpu,
  Layers,
  FileWarning,
  ShieldAlert,
} from 'lucide-react';

export default function Navbar({
  selectedSampleId,
  onSelectSample,
  executionLane,
  onChangeLane,
  onRunLadder,
  isRunning,
  onOpenBenchmark,
  provenance,
}) {
  const scenarios = [
    { id: 'iot_mqtt_parser', label: '1. UART Stack Overflow', icon: Cpu },
    { id: 'iot_coap_option_heap', label: '2. CoAP Heap Overflow', icon: Layers },
    { id: 'iot_ota_manifest_null', label: '3. OTA Null Pointer', icon: FileWarning },
    { id: 'iot_adversarial_guard_demo', label: '4. Adversarial AI Guard', icon: ShieldAlert },
  ];

  return (
    <header className="h-16 px-6 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm flex items-center justify-between sticky top-0 z-40">
      {/* Left: Logo + Title + Stage Insurance Badge */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-extrabold text-slate-900 tracking-tight">AEGIS-IoT</span>
          <span className="hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 font-semibold px-3 py-1 rounded-full text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Stage Insurance Active
          </span>
        </div>
      </div>

      {/* Center: Larger Scenario Switcher with 16px Lucide Icons */}
      <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner gap-1">
        {scenarios.map((sc) => {
          const isSelected = selectedSampleId === sc.id;
          const Icon = sc.icon;
          return (
            <button
              key={sc.id}
              onClick={() => onSelectSample(sc.id)}
              disabled={isRunning}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-150 ${
                isSelected
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 font-medium'
              } ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
              <span className="whitespace-nowrap">{sc.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: Lane Selector + Benchmark Button + Royal Indigo Primary CTA */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Lane Select */}
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-700 font-medium">
          <Cpu className="w-3.5 h-3.5 text-indigo-600" />
          <select
            value={executionLane}
            onChange={(e) => onChangeLane(e.target.value)}
            disabled={isRunning}
            className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer pr-1"
          >
            <option value="REPLAY_FIXTURE">Lane: Replay</option>
            <option value="CLOUD_LLM">Lane: Cloud LLM</option>
            <option value="LOCAL_OLLAMA">Lane: Local Ollama</option>
          </select>
        </div>

        {/* Benchmarks Ghost Button */}
        <button
          onClick={onOpenBenchmark}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
        >
          <BarChart2 className="w-4 h-4 text-indigo-600" />
          <span className="hidden md:inline">Benchmarks</span>
        </button>

        {/* PRIMARY HERO CTA BUTTON */}
        <button
          onClick={onRunLadder}
          disabled={isRunning}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-500/20 transition-all duration-200 ${
            isRunning
              ? 'bg-indigo-400 text-white cursor-wait animate-pulse'
              : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white active:scale-[0.98]'
          }`}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current text-white" />
              <span>Run Verification</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
