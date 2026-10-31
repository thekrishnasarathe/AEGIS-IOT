// filepath: frontend/src/components/verification/stages/AIPatchStage.jsx
import React, { useState } from 'react';
import { Sparkles, ArrowRight, Bot, Cpu, CheckCircle2, ShieldCheck, FileCode, Copy, Check } from 'lucide-react';

export default function AIPatchStage({ runState }) {
  const s3 = runState?.stage_3 || {};
  const [viewMode, setViewMode] = useState('side_by_side'); // 'side_by_side' | 'unified_diff' | 'strategy'
  const [copied, setCopied] = useState(false);

  const rawDiff = s3.patch_unified_diff || `--- a/target.c
+++ b/target.c
@@ -25,6 +25,9 @@ int parse_mqtt_packet(const uint8_t *raw_stream, size_t stream_len, mqtt_msg_t *
     uint16_t topic_len = (raw_stream[1] << 8) | raw_stream[2];
     
+    if (topic_len >= MAX_TOPIC_BUF) {
+        return -1;
+    }
+
     memcpy(msg->topic, &raw_stream[3], topic_len);
     msg->topic[topic_len] = '\\0';`;

  const handleCopyDiff = () => {
    navigator.clipboard.writeText(rawDiff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-6 bg-[#080B10] font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">
              Neural Code Transformation · Surgical Bounds Patch Synthesis
            </div>
            <div className="text-[11px] text-slate-400">
              Transforming vulnerable memory access into verified bounded copy while preserving ABI signatures
            </div>
          </div>
        </div>

        {/* View Mode Switcher & Copy Diff Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#111720] p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setViewMode('side_by_side')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                viewMode === 'side_by_side' ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setViewMode('unified_diff')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                viewMode === 'unified_diff' ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Unified Diff
            </button>
            <button
              onClick={() => setViewMode('strategy')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                viewMode === 'strategy' ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Strategy
            </button>
          </div>

          <button
            onClick={handleCopyDiff}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111720] hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono transition cursor-pointer"
            title="Copy patch diff to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
            <span>{copied ? 'Copied' : 'Copy Diff'}</span>
          </button>

          <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
            PATCH READY FOR GATES
          </span>
        </div>
      </div>

      {/* Main Split-Screen Transformation Layout */}
      <div className="my-auto">
        {viewMode === 'side_by_side' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left: Original Vulnerable Code (5 cols) */}
            <div className="lg:col-span-5 bg-[#0B0F15] rounded-xl border border-slate-800/80 p-4 font-mono text-xs shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-[11px]">
                  <span className="text-rose-400 font-bold flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>BEFORE: Vulnerable target.c</span>
                  </span>
                  <span className="text-slate-500">Unprotected Copy</span>
                </div>

                <div className="space-y-1 text-slate-300">
                  <div className="text-slate-500">23: uint16_t topic_len = (raw_stream[1] &lt;&lt; 8) | raw_stream[2];</div>
                  <div className="text-slate-500">24: </div>
                  <div className="bg-rose-500/15 border-l-2 border-rose-500 px-2 py-1 text-rose-200">
                    <div className="text-rose-400 font-bold">28: memcpy(msg-&gt;topic, &amp;raw_stream[3], topic_len);</div>
                    <div className="text-[10px] text-rose-400/80">// No boundary check on topic_len</div>
                  </div>
                  <div className="text-slate-500 mt-2">29: msg-&gt;topic[topic_len] = '\0';</div>
                  <div className="text-slate-500">30: return 0;</div>
                </div>
              </div>

              <div className="mt-4 p-2.5 rounded-lg bg-[#080B10] border border-rose-500/20 text-[11px] text-rose-300">
                Defect: Buffer overflow if topic_len &gt;= 64
              </div>
            </div>

            {/* Center: Transformation Connector & Telemetry (2 cols) */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center space-y-3 py-2">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/10">
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>

              <div className="text-center font-mono text-[10px] space-y-1 text-slate-400">
                <div className="text-purple-300 font-bold">SYNTHESIS</div>
                <div>Model: claude-3-5</div>
                <div>Latency: 1.2s</div>
                <div>Attempt: 1 / 3</div>
              </div>

              <ArrowRight className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>

            {/* Right: Candidate Patched Code (5 cols) */}
            <div className="lg:col-span-5 bg-[#0B0F15] rounded-xl border border-slate-800/80 p-4 font-mono text-xs shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-[11px]">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>AFTER: Candidate Patched Source</span>
                  </span>
                  <span className="text-emerald-400">Bounds Enforced</span>
                </div>

                <div className="space-y-1 text-slate-300">
                  <div className="text-slate-500">23: uint16_t topic_len = (raw_stream[1] &lt;&lt; 8) | raw_stream[2];</div>
                  <div className="text-slate-500">24: </div>
                  <div className="bg-emerald-500/15 border-l-2 border-emerald-500 px-2 py-1 text-emerald-200">
                    <div className="text-emerald-400 font-bold">+ if (topic_len &gt;= MAX_TOPIC_BUF) &#123;</div>
                    <div className="text-emerald-400 font-bold">+     return -1; // Safe boundary rejection</div>
                    <div className="text-emerald-400 font-bold">+ &#125;</div>
                    <div className="text-slate-300 mt-1">28: memcpy(msg-&gt;topic, &amp;raw_stream[3], topic_len);</div>
                  </div>
                  <div className="text-slate-500 mt-2">29: msg-&gt;topic[topic_len] = '\0';</div>
                  <div className="text-slate-500">30: return 0;</div>
                </div>
              </div>

              <div className="mt-4 p-2.5 rounded-lg bg-[#080B10] border border-emerald-500/20 text-[11px] text-emerald-300">
                Resolution: Strict guard validates topic_len &lt; 64 before copy
              </div>
            </div>
          </div>
        ) : viewMode === 'unified_diff' ? (
          /* Unified Diff View */
          <div className="bg-[#0B0F15] rounded-xl border border-slate-800/80 p-4 font-mono text-xs shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-slate-400">
              <span className="text-white font-bold">Unified Patch Output (git diff format)</span>
              <span className="text-emerald-400 font-bold">+3 Lines Added · 0 Lines Removed</span>
            </div>
            <div className="bg-[#05070A] p-3 rounded-lg border border-slate-800 text-[12px] leading-relaxed overflow-auto max-h-60 whitespace-pre">
              <div className="text-slate-500">--- a/target.c</div>
              <div className="text-slate-500">+++ b/target.c</div>
              <div className="text-cyan-400 font-bold">@@ -25,6 +25,9 @@ int parse_mqtt_packet(...)</div>
              <div className="text-slate-300">     uint16_t topic_len = (raw_stream[1] &lt;&lt; 8) | raw_stream[2];</div>
              <div className="text-slate-300"> </div>
              <div className="text-emerald-400 bg-emerald-950/20 px-1 font-bold">+    if (topic_len &gt;= MAX_TOPIC_BUF) &#123;</div>
              <div className="text-emerald-400 bg-emerald-950/20 px-1 font-bold">+        return -1;</div>
              <div className="text-emerald-400 bg-emerald-950/20 px-1 font-bold">+    &#125;</div>
              <div className="text-slate-300"> </div>
              <div className="text-slate-300">     memcpy(msg-&gt;topic, &amp;raw_stream[3], topic_len);</div>
              <div className="text-slate-300">     msg-&gt;topic[topic_len] = '\0';</div>
            </div>
          </div>
        ) : (
          /* Strategy View */
          <div className="bg-[#0B0F15] rounded-xl border border-slate-800/80 p-5 font-mono text-xs shadow-xl space-y-3">
            <div className="text-white font-bold text-sm border-b border-slate-800 pb-2">
              Surgical AST Bounds Guard Strategy
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300 text-xs">
              <div className="p-3 rounded-lg bg-[#080B10] border border-slate-800">
                <div className="text-cyan-400 font-bold mb-1">1. Contract Preservation</div>
                <div className="text-[11px] text-slate-400">
                  Preserves function signature <code className="text-white">int parse_mqtt_packet(...)</code> with identical parameter count and return code semantics (<code className="text-white">-1</code> for invalid input).
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#080B10] border border-slate-800">
                <div className="text-purple-400 font-bold mb-1">2. Zero Memory Alteration</div>
                <div className="text-[11px] text-slate-400">
                  Does not resize <code className="text-white">mqtt_msg_t</code> or reallocate dynamic heap memory, preventing memory leaks on constrained embedded microcontrollers.
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#080B10] border border-slate-800">
                <div className="text-emerald-400 font-bold mb-1">3. Minimal Overhead</div>
                <div className="text-[11px] text-slate-400">
                  Introduces only a single conditional jump (<code className="text-white">cmp + ja</code>) adding just +46 bytes to the binary <code className="text-white">.text</code> section.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Ticker */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-800/80 pt-2.5">
        <span>Prompt Template: AST-Constrained Surgical Guard</span>
        <span>Signature Invariance: Validated (3 Arguments Preserved)</span>
        <span>Candidate Status: Ready for GCC Compilation Gate</span>
      </div>
    </div>
  );
}
