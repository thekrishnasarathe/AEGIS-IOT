// filepath: frontend/src/components/verification/stages/ASTScanStage.jsx
import React, { useState, useEffect } from 'react';
import { Search, AlertOctagon, Terminal, ArrowRight, ShieldAlert, Cpu, Code, GitCommit, RotateCw } from 'lucide-react';

export default function ASTScanStage({ runState, sampleDetail }) {
  const faultLine = sampleDetail?.fault_line || 28;
  const cwe = sampleDetail?.cwe || 'CWE-121: Stack-based Buffer Overflow';
  const s1 = runState?.stage_1 || {};

  const [scanLine, setScanLine] = useState(18);
  const [lockedOnDefect, setLockedOnDefect] = useState(false);
  const [viewMode, setViewMode] = useState('code'); // 'code' | 'ast_tree'
  const [selectedLine, setSelectedLine] = useState(28);

  const startScan = () => {
    setScanLine(18);
    setLockedOnDefect(false);
    setSelectedLine(28);

    const interval = setInterval(() => {
      setScanLine((prev) => {
        if (prev >= 28) {
          setLockedOnDefect(true);
          clearInterval(interval);
          return 28;
        }
        return prev + 2;
      });
    }, 240);
  };

  useEffect(() => {
    startScan();
  }, [runState]);

  const codeSnippets = [
    { line: 18, code: 'int parse_mqtt_packet(const uint8_t *raw_stream, size_t stream_len, mqtt_msg_t *msg) {', isDefect: false, astNode: 'FunctionDecl: parse_mqtt_packet (int)' },
    { line: 19, code: '    if (!raw_stream || !msg || stream_len < 4) return -1;', isDefect: false, astNode: 'IfStmt (NULL pointer & stream validation)' },
    { line: 20, code: '    uint8_t header = raw_stream[0];', isDefect: false, astNode: 'DeclStmt: uint8_t header' },
    { line: 21, code: '    if ((header & 0xF0) != 0x30) return -2; // Require PUBLISH command', isDefect: false, astNode: 'IfStmt (MQTT command opcode check)' },
    { line: 24, code: '    uint16_t topic_len = (raw_stream[1] << 8) | raw_stream[2];', isDefect: false, astNode: 'DeclStmt: uint16_t topic_len (network byte order)' },
    { line: 27, code: '    // VULNERABILITY (CWE-121): Unbounded copy into 64-byte stack buffer', isDefect: false, isComment: true, astNode: 'CommentNode' },
    { line: 28, code: '    memcpy(msg->topic, &raw_stream[3], topic_len);', isDefect: true, astNode: 'CallExpr: memcpy (UNCHECKED BOUNDS)' },
    { line: 29, code: '    msg->topic[topic_len] = \'\\0\';', isDefect: false, astNode: 'ArraySubscriptExpr: NUL termination' },
    { line: 30, code: '    return 0;', isDefect: false, astNode: 'ReturnStmt: int(0)' },
    { line: 31, code: '}', isDefect: false, astNode: 'CompoundStmt End' },
  ];

  const astTreeNodes = [
    { type: 'TranslationUnitDecl', label: 'target.c (C99 AST Root)', depth: 0, status: 'scanned' },
    { type: 'RecordDecl', label: 'struct mqtt_msg_t [topic: 64B, packet_id: 2B, payload_len: 4B]', depth: 1, status: 'scanned' },
    { type: 'FunctionDecl', label: 'parse_mqtt_packet (params: 3, returns: int)', depth: 1, status: 'scanned' },
    { type: 'CompoundStmt', label: 'Function Body [10 statements]', depth: 2, status: 'scanned' },
    { type: 'DeclStmt', label: 'uint16_t topic_len = (raw_stream[1] << 8) | raw_stream[2]', depth: 3, status: 'scanned' },
    { type: 'BinaryOperator', label: 'Bitwise OR & Shift (Big Endian extraction)', depth: 4, status: 'scanned' },
    { type: 'CallExpr', label: 'memcpy(msg->topic, &raw_stream[3], topic_len)', depth: 3, status: 'DEFECT_FOUND', highlight: true },
    { type: 'DiagnosticWarning', label: 'CWE-121: Untrusted topic_len copied into 64-byte destination without check', depth: 4, status: 'CRITICAL', highlight: true },
  ];

  const activeSnippet = codeSnippets.find((s) => s.line === selectedLine) || codeSnippets[6];

  return (
    <div className="w-full h-full flex flex-col justify-between p-6 bg-[#080B10] font-sans">
      {/* Top Header Information */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              Static Code Triage · AST Analysis Engine
            </div>
            <div className="text-[11px] text-slate-400">
              Traversing abstract syntax tree and tracking memory copy boundary constraints
            </div>
          </div>
        </div>

        {/* View Toggle & Re-scan Action */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#111720] p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setViewMode('code')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                viewMode === 'code' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Code View
            </button>
            <button
              onClick={() => setViewMode('ast_tree')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                viewMode === 'ast_tree' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              AST Tree
            </button>
          </div>

          {/* Re-scan Button */}
          <button
            onClick={startScan}
            className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#111720] hover:bg-slate-800 border border-slate-700 text-slate-300 transition cursor-pointer"
            title="Re-run AST scan animation"
          >
            <RotateCw className="w-3 h-3 text-cyan-400" />
            <span>Re-scan</span>
          </button>

          <span className={`text-[11px] font-mono px-2.5 py-1 rounded-md border font-bold ${
            lockedOnDefect
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 animate-pulse'
          }`}>
            {lockedOnDefect ? 'DEFECT CONFIRMED' : 'TRAVERSING AST'}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Code or AST Tree Viewer (7 Cols) */}
        <div className="lg:col-span-7 bg-[#0B0F15] rounded-xl border border-slate-800/80 p-4 shadow-xl font-mono text-xs overflow-hidden relative min-h-[310px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 text-white font-bold">
              {viewMode === 'code' ? (
                <>
                  <Code className="w-3.5 h-3.5 text-cyan-400" />
                  <span>target.c (Click line to inspect AST node)</span>
                </>
              ) : (
                <>
                  <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Abstract Syntax Tree Hierarchy (clang / cppcheck)</span>
                </>
              )}
            </span>
            <span className="text-slate-500">Buffer Size: 64B</span>
          </div>

          {viewMode === 'code' ? (
            <div className="space-y-1.5 leading-relaxed">
              {codeSnippets.map((item) => {
                const isCurrentScan = scanLine === item.line;
                const isFlagged = lockedOnDefect && item.isDefect;
                const isSelected = selectedLine === item.line;

                return (
                  <div
                    key={item.line}
                    onClick={() => setSelectedLine(item.line)}
                    className={`flex items-center gap-3 px-2 py-0.5 rounded cursor-pointer transition-all duration-150 ${
                      isFlagged
                        ? 'bg-rose-500/15 border-l-2 border-rose-500 text-rose-200 font-bold'
                        : isSelected
                        ? 'bg-slate-800/80 border-l-2 border-cyan-400 text-white'
                        : isCurrentScan
                        ? 'bg-cyan-500/15 border-l-2 border-cyan-400 text-cyan-100'
                        : item.isComment
                        ? 'text-slate-500 italic hover:bg-slate-800/40'
                        : 'text-slate-300 hover:bg-slate-800/40'
                    }`}
                  >
                    <span className={`w-6 text-right select-none ${
                      isFlagged ? 'text-rose-400 font-bold' : isCurrentScan ? 'text-cyan-400' : 'text-slate-600'
                    }`}>
                      {item.line}
                    </span>
                    <span className="truncate flex-1">{item.code}</span>
                    {isFlagged && (
                      <span className="text-[10px] font-sans font-bold bg-rose-500 text-black px-1.5 py-0.2 rounded">
                        CWE-121
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Kinetic Scan Beam Line */}
              {!lockedOnDefect && (
                <div
                  className="absolute left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_12px_#22d3ee] pointer-events-none transition-all duration-300"
                  style={{ top: `${Math.min(92, (scanLine - 18) * 9 + 18)}%` }}
                />
              )}
            </div>
          ) : (
            /* AST Tree Hierarchy View */
            <div className="space-y-1.5 leading-relaxed">
              {astTreeNodes.map((node, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-2 py-1 rounded ${
                    node.highlight
                      ? 'bg-rose-500/15 border border-rose-500/40 text-rose-300 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/40'
                  }`}
                  style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
                >
                  <span className="text-slate-500">├─</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#080B10] border border-slate-800 text-cyan-400">
                    {node.type}
                  </span>
                  <span className="truncate flex-1">{node.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Technical Diagnostic Annotation & Selected AST Node Properties (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-4">
          <div className={`p-4 rounded-xl border transition-all duration-300 ${
            lockedOnDefect
              ? 'bg-[#131924] border-rose-500/40 shadow-rose-950/20 shadow-xl'
              : 'bg-[#111720]/80 border-slate-800'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className={`w-5 h-5 ${lockedOnDefect ? 'text-rose-400' : 'text-cyan-400'}`} />
              <h3 className="text-sm font-bold text-white tracking-tight">
                {lockedOnDefect ? 'Unbounded Memory Copy Detected' : 'Analyzing Buffer Boundaries...'}
              </h3>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div className="flex justify-between border-b border-slate-800/80 pb-1">
                <span className="text-slate-400">Target Line:</span>
                <span className="text-rose-400 font-bold">Line {faultLine}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1">
                <span className="text-slate-400">Destination:</span>
                <span className="text-slate-200">msg-&gt;topic [MAX_TOPIC_BUF = 64]</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1">
                <span className="text-slate-400">Copy Size:</span>
                <span className="text-amber-400 font-bold">topic_len (Untrusted uint16_t)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">CWE Classification:</span>
                <span className="text-rose-400 font-bold">{cwe.split(':')[0]}</span>
              </div>
            </div>

            <div className="mt-3 p-2.5 rounded-lg bg-[#080B10] border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              <span className="text-rose-400 font-bold">Defect Summary: </span>
              The parser extracts <code className="text-cyan-300">topic_len</code> directly from untrusted input bytes 1–2 without comparing it against <code className="text-cyan-300">MAX_TOPIC_BUF (64)</code> before invoking <code className="text-rose-300">memcpy()</code>.
            </div>
          </div>

          {/* Interactive Line Inspector Callout */}
          <div className="p-3 rounded-xl bg-[#0B0F15] border border-slate-800/80 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Selected Line AST Node:</span>
              <span className="text-cyan-400 font-bold">Line {activeSnippet.line}</span>
            </div>
            <div className="text-white text-[11px] font-bold truncate">{activeSnippet.astNode}</div>
          </div>
        </div>
      </div>

      {/* Bottom Status Ticker */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-800/80 pt-2.5">
        <span>AST Nodes: 142 Analyzed · 1 Flagged CallExpr</span>
        <span>Static Tool: {s1.tool || 'cppcheck AST Engine'}</span>
        <span>Duration: {s1.duration_ms ? `${Math.round(s1.duration_ms)}ms` : '38ms'}</span>
      </div>
    </div>
  );
}
