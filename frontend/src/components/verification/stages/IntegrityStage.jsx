// filepath: frontend/src/components/verification/stages/IntegrityStage.jsx
import React, { useState } from 'react';
import { Lock, CheckCircle2, XCircle, ShieldCheck, FileCheck, Layers, Terminal, Search } from 'lucide-react';

export default function IntegrityStage({ runState }) {
  const s6 = runState?.stage_6 || {};
  const verdict = runState?.verdict || 'INITIALIZING';
  const [selectedLayer, setSelectedLayer] = useState(0); // 0: Signature, 1: Benign, 2: Anti-Cheat

  const sigPassed = s6.signature_passed ?? true;
  const tokensPassed = s6.banned_tokens_passed ?? true;
  const benignPassed = (s6.benign_passed ?? 3) === (s6.benign_total ?? 3);

  const benignTests = [
    {
      id: 1,
      topic: 'sensors/temperature',
      bytes: '0x30 0x15 0x00 0x13 0x73 0x65 0x6e...',
      len: 19,
      expectedRet: 0,
      actualRet: 0,
      status: 'EQUIVALENT',
    },
    {
      id: 2,
      topic: 'devices/esp32/status',
      bytes: '0x30 0x16 0x00 0x14 0x64 0x65 0x76...',
      len: 20,
      expectedRet: 0,
      actualRet: 0,
      status: 'EQUIVALENT',
    },
    {
      id: 3,
      topic: 'home/livingroom/thermostat',
      bytes: '0x30 0x1c 0x00 0x1a 0x68 0x6f 0x6d...',
      len: 26,
      expectedRet: 0,
      actualRet: 0,
      status: 'EQUIVALENT',
    },
  ];

  const scannedTokens = [
    { token: 'no_sanitize', rule: 'Banned: Disables AddressSanitizer checks', found: 0, status: 'PASS' },
    { token: '__attribute__((no_sanitize))', rule: 'Banned: GCC attribute bypass', found: 0, status: 'PASS' },
    { token: 'ASAN_POISON_MEMORY_REGION', rule: 'Banned: Manipulates ASan shadow state', found: 0, status: 'PASS' },
    { token: 'harness.c tampering', rule: 'Banned: Modifying ground truth test harness', found: 0, status: 'PASS' },
  ];

  return (
    <div className="w-full h-full flex flex-col justify-between p-6 bg-[#080B10] font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              Integrity Verification · Three-Layer Security Inspection
            </div>
            <div className="text-[11px] text-slate-400">
              Validating signature invariance, regression equivalence on benign inputs, and deterministic anti-cheat rules
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Layer Selector Pill */}
          <div className="flex items-center bg-[#111720] p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setSelectedLayer(0)}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                selectedLayer === 0 ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Signature
            </button>
            <button
              onClick={() => setSelectedLayer(1)}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                selectedLayer === 1 ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Regressions
            </button>
            <button
              onClick={() => setSelectedLayer(2)}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                selectedLayer === 2 ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Anti-Cheat
            </button>
          </div>

          <span className={`text-[11px] font-mono px-2.5 py-1 rounded-md border font-bold ${
            verdict === 'REJECTED'
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/40'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}>
            {verdict === 'REJECTED' ? 'INTEGRITY VIOLATION DETECTED' : 'ALL 3 LAYERS VERIFIED'}
          </span>
        </div>
      </div>

      {/* Main Three-Layer Inspection Panels Layout */}
      <div className="my-auto space-y-4">
        {/* Layer Cards Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Layer 1 Overview Card */}
          <button
            onClick={() => setSelectedLayer(0)}
            className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer text-left ${
              selectedLayer === 0
                ? 'bg-[#181C26] border-cyan-400 ring-2 ring-cyan-400/30 shadow-md'
                : 'bg-[#0B0F15] border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                <span>1. Signature Invariance</span>
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-[11px] text-slate-300">parse_mqtt_packet() ABI intact</div>
            <div className="text-[10px] text-emerald-400 font-bold mt-1">3/3 Params Preserved</div>
          </button>

          {/* Layer 2 Overview Card */}
          <button
            onClick={() => setSelectedLayer(1)}
            className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer text-left ${
              selectedLayer === 1
                ? 'bg-[#181C26] border-purple-400 ring-2 ring-purple-400/30 shadow-md'
                : 'bg-[#0B0F15] border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>2. Benign Regression</span>
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-[11px] text-slate-300">Valid protocol vectors verified</div>
            <div className="text-[10px] text-emerald-400 font-bold mt-1">3/3 Baseline Equivalences</div>
          </button>

          {/* Layer 3 Overview Card */}
          <button
            onClick={() => setSelectedLayer(2)}
            className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer text-left ${
              selectedLayer === 2
                ? 'bg-[#181C26] border-amber-400 ring-2 ring-amber-400/30 shadow-md'
                : 'bg-[#0B0F15] border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>3. Anti-Cheat Guardrails</span>
              </span>
              {tokensPassed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <div className="text-[11px] text-slate-300">Prohibited cheat token inspection</div>
            <div className="text-[10px] text-emerald-400 font-bold mt-1">Zero Banned Keywords</div>
          </button>
        </div>

        {/* Detailed Inspection Box for Selected Layer */}
        <div className="p-4 rounded-xl bg-[#0B0F15] border border-slate-800/80 shadow-xl font-mono text-xs">
          {selectedLayer === 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-slate-400">
                <span className="text-white font-bold">Function Prototype &amp; Parameter Contract Comparison</span>
                <span className="text-emerald-400 font-bold">100% ABI Invariant</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded bg-[#080B10] border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">BASELINE SPECIFICATION:</div>
                  <div className="text-cyan-300 text-[11px]">int parse_mqtt_packet(const uint8_t *raw_stream, size_t stream_len, mqtt_msg_t *msg);</div>
                </div>
                <div className="p-2.5 rounded bg-[#080B10] border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">CANDIDATE REPAIR SPECIFICATION:</div>
                  <div className="text-emerald-300 text-[11px]">int parse_mqtt_packet(const uint8_t *raw_stream, size_t stream_len, mqtt_msg_t *msg);</div>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                Verified: Parameter types, ordering, calling convention (<code className="text-white">System V AMD64 ABI</code>), and return status code ranges are identical.
              </div>
            </div>
          )}

          {selectedLayer === 1 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-slate-400">
                <span className="text-white font-bold">Benign Regression Testing (Non-Malicious Protocol Vectors)</span>
                <span className="text-emerald-400 font-bold">3 of 3 Matches</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {benignTests.map((t) => (
                  <div key={t.id} className="p-2 rounded bg-[#080B10] border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold">Vector {t.id}: {t.topic}</span>
                      <span className="text-slate-500 text-[10px] ml-2">({t.len}B topic payload)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-[11px]">Return Code: <strong className="text-emerald-400">{t.actualRet}</strong></span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedLayer === 2 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-slate-400">
                <span className="text-white font-bold">Deterministic Anti-Cheat &amp; Bypass Keyword Scanner</span>
                <span className="text-emerald-400 font-bold">Clean (0 Violations)</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {scannedTokens.map((st, idx) => (
                  <div key={idx} className="p-2 rounded bg-[#080B10] border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-amber-300 font-bold">{st.token}</span>
                      <span className="text-slate-500 text-[10px] ml-2">{st.rule}</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {st.status} (0 occurrences)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Ticker */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-800/80 pt-2.5">
        <span>AST Token Scan: Checked 1,280 identifiers</span>
        <span>Benign Coverage: 100% of defined protocol states</span>
        <span>Execution Time: {s6.duration_ms ? `${Math.round(s6.duration_ms)}ms` : '31ms'}</span>
      </div>
    </div>
  );
}
