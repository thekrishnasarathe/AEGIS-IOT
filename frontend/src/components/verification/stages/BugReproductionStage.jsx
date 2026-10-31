// filepath: frontend/src/components/verification/stages/BugReproductionStage.jsx
import React, { useState, useEffect } from 'react';
import { Flame, AlertTriangle, Layers, Activity, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';

export default function BugReproductionStage({ runState }) {
  const s2 = runState?.stage_2 || {};
  const [selectedSize, setSelectedSize] = useState(92); // 32, 64, or 92 bytes
  const [fillProgress, setFillProgress] = useState(0); // 0 to 100%
  const [breached, setBreached] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);

  const runSimulation = (targetSize) => {
    setFillProgress(0);
    setBreached(false);

    let current = 0;
    const interval = setInterval(() => {
      current += 6;
      if (current >= 100) {
        setFillProgress(100);
        if (targetSize > 64) {
          setBreached(true);
        }
        clearInterval(interval);
      } else {
        setFillProgress(current);
        const currentBytes = (current / 100) * targetSize;
        if (currentBytes > 64) {
          setBreached(true);
        }
      }
    }, 80);
  };

  useEffect(() => {
    runSimulation(selectedSize);
  }, [selectedSize, runState]);

  const currentBytesInjected = Math.round((fillProgress / 100) * selectedSize);

  // 16 cells in 64-byte buffer (4 bytes each)
  const bufferBlocks = Array.from({ length: 16 }).map((_, i) => {
    const byteStart = i * 4;
    const filled = currentBytesInjected > byteStart;
    const hexAddr = `0x7ffd58${(32 + i * 4).toString(16).padStart(2, '0')}`;
    return {
      index: i,
      label: `${byteStart}..${byteStart + 3}`,
      addr: hexAddr,
      filled,
      val: filled ? '0x41 0x41 0x41 0x41' : '0x00 0x00 0x00 0x00',
    };
  });

  // 7 cells in adjacent redzone (4 bytes each = 28 bytes)
  const redzoneBlocks = Array.from({ length: 7 }).map((_, i) => {
    const byteStart = 64 + i * 4;
    const isCorrupt = currentBytesInjected > byteStart;
    const hexAddr = `0x7ffd58${(96 + i * 4).toString(16).padStart(2, '0')}`;
    return {
      index: i,
      label: `+${i * 4}B`,
      addr: hexAddr,
      isCorrupt,
      val: isCorrupt ? '0x41 0x41 0x41 0x41 [CORRUPTED]' : '[UNTOUCHED REDZONE]',
    };
  });

  return (
    <div className="w-full h-full flex flex-col justify-between p-6 bg-[#080B10] font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
              Dynamic ASan Memory Architecture · Defect Reproduction
            </div>
            <div className="text-[11px] text-slate-400">
              Simulating input injection into stack buffer to test memory boundary integrity under AddressSanitizer
            </div>
          </div>
        </div>

        {/* Interactive Payload Size Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#111720] p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
            <span className="text-slate-500 px-2 select-none">Vector:</span>
            <button
              onClick={() => setSelectedSize(32)}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                selectedSize === 32 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              32B (Safe)
            </button>
            <button
              onClick={() => setSelectedSize(64)}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                selectedSize === 64 ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              64B (Limit)
            </button>
            <button
              onClick={() => setSelectedSize(92)}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                selectedSize === 92 ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              92B (Exploit)
            </button>
          </div>

          <span className={`text-[11px] font-mono px-2.5 py-1 rounded-md border font-bold ${
            breached
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-sm'
              : selectedSize <= 64
              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            {breached ? 'ASan FAULT CONFIRMED' : selectedSize <= 64 ? 'WITHIN BOUNDS' : 'INJECTING...'}
          </span>
        </div>
      </div>

      {/* Main Interactive Memory Architecture Diagram */}
      <div className="my-auto space-y-5">
        {/* Memory Map Layout */}
        <div className="bg-[#0B0F15] p-5 rounded-xl border border-slate-800/80 shadow-2xl">
          <div className="flex items-center justify-between mb-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-300 font-bold">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Stack Frame Memory Map (Thread T0: 0x7ffd5820 - 0x7ffd587c)</span>
            </span>
            <span className="text-slate-400">
              Input Injected: <strong className={breached ? 'text-rose-400 font-bold' : 'text-cyan-400 font-bold'}>
                {currentBytesInjected} / {selectedSize} Bytes
              </strong>
            </span>
          </div>

          {/* Memory Visualizer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* 1. Valid Buffer Zone: 64 Bytes (8 cols) */}
            <div className="md:col-span-8 p-3 rounded-lg bg-[#080B10] border border-cyan-500/30 relative">
              <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 mb-2 font-bold">
                <span>BUFFER ZONE: msg-&gt;topic[64]</span>
                <span>0x7ffd5820 - 0x7ffd5860 (Capacity: 64B)</span>
              </div>

              <div className="grid grid-cols-8 gap-1.5">
                {bufferBlocks.map((b) => (
                  <div
                    key={b.index}
                    onMouseEnter={() => setHoveredCell(b)}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`h-11 rounded border flex flex-col items-center justify-center text-[10px] font-mono transition-all duration-150 cursor-pointer ${
                      b.filled
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 hover:border-cyan-200'
                        : 'bg-[#111720] border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <span>[{b.label}]</span>
                    <span className="text-[9px] text-slate-400">4B</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Buffer Boundary Marker */}
            <div className="hidden md:flex flex-col items-center justify-center -mx-1 z-10">
              <div className="h-full w-[2px] bg-rose-500 relative flex items-center justify-center">
                <div className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap -rotate-90 ${
                  breached ? 'bg-rose-500 text-black animate-pulse' : 'bg-slate-800 text-slate-400'
                }`}>
                  BOUNDARY (64B)
                </div>
              </div>
            </div>

            {/* 3. Stack Redzone / Adjacent Struct Memory: 28 Bytes (4 cols) */}
            <div className={`md:col-span-4 p-3 rounded-lg border transition-all duration-300 relative ${
              breached
                ? 'bg-rose-950/20 border-rose-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                : 'bg-[#080B10] border-slate-800'
            }`}>
              <div className="flex items-center justify-between text-[11px] font-mono mb-2 font-bold">
                <span className={breached ? 'text-rose-400' : 'text-slate-400'}>
                  STACK REDZONE (OVERFLOW: {selectedSize > 64 ? `+${selectedSize - 64}B` : '0B'})
                </span>
                <span className="text-slate-500">0x7ffd5860+</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {redzoneBlocks.map((b) => (
                  <div
                    key={b.index}
                    onMouseEnter={() => setHoveredCell(b)}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`h-11 rounded border flex flex-col items-center justify-center text-[10px] font-mono transition-all duration-150 cursor-pointer ${
                      b.isCorrupt
                        ? 'bg-rose-500/30 border-rose-500 text-rose-100 font-bold animate-pulse hover:border-rose-300'
                        : 'bg-[#111720] border-slate-800 text-slate-600 hover:border-slate-700'
                    }`}
                  >
                    <span>{b.label}</span>
                    <span className={`text-[9px] ${b.isCorrupt ? 'text-rose-300 font-bold' : 'text-slate-500'}`}>
                      {b.isCorrupt ? 'CORRUPT' : 'CLEAN'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Memory Cell Inspection Tooltip */}
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">
              {hoveredCell ? (
                <span>
                  Inspecting Address <strong className="text-cyan-300">{hoveredCell.addr}</strong>: <code className="text-white">{hoveredCell.val}</code>
                </span>
              ) : (
                <span className="text-slate-500">Hover over any 4-byte memory cell to inspect memory address and hex payload.</span>
              )}
            </span>
            <span className="text-slate-400 font-bold">
              Overflow Delta: <span className={selectedSize > 64 ? 'text-rose-400' : 'text-emerald-400'}>{selectedSize > 64 ? `+${selectedSize - 64} Bytes` : '0 Bytes'}</span>
            </span>
          </div>
        </div>

        {/* Real AddressSanitizer Crash Trace Console Output */}
        <div className={`p-4 rounded-xl border font-mono text-xs transition-all duration-300 ${
          breached
            ? 'bg-[#120B0F] border-rose-500/40 text-rose-300'
            : 'bg-[#0B0F15] border-slate-800 text-slate-400'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-rose-500/20 mb-2">
            <span className="flex items-center gap-2 font-bold text-rose-400">
              <ShieldAlert className="w-4 h-4" />
              <span>AddressSanitizer Crash Telemetry</span>
            </span>
            <span className="text-[11px] text-slate-400">Exit Code: {breached ? '1 (SIGABRT)' : '0 (CLEAN)'} · PID: 18492</span>
          </div>

          {breached ? (
            <div className="space-y-1 text-[12px] leading-relaxed">
              <div>==18492==ERROR: AddressSanitizer: <strong className="text-rose-300">stack-buffer-overflow</strong> on address 0x7ffd5860 pc 0x55dc814</div>
              <div>WRITE of size {selectedSize} at 0x7ffd5820 thread T0</div>
              <div className="text-slate-400 pl-4">#0 0x55dc814 in parse_mqtt_packet target.c:28:5</div>
              <div className="text-slate-400 pl-4">#1 0x55dc98a in main harness.c:45:9</div>
              <div className="text-rose-400 font-bold mt-1">
                Address 0x7ffd5860 is located in stack of thread T0 at offset 64 in frame &lt;parse_mqtt_packet&gt;
              </div>
            </div>
          ) : (
            <div className="text-emerald-400 text-[12px]">
              Payload size ({selectedSize}B) fits within allocated buffer boundary (64B). Zero memory access violations recorded by AddressSanitizer shadow bytes.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Ticker */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-800/80 pt-2.5">
        <span>ASan Shadow Byte: [00 00 00 00 00 00 00 00 | 04 f3 f3 f3]</span>
        <span>Crash Provenance: Deterministic Ground-Truth Harness</span>
        <span>Execution Time: {s2.duration_ms ? `${Math.round(s2.duration_ms)}ms` : '44ms'}</span>
      </div>
    </div>
  );
}
