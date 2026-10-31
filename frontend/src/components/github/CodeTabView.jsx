// filepath: frontend/src/components/github/CodeTabView.jsx
import React, { useState } from 'react';
import {
  FileCode,
  FileText,
  File,
  Copy,
  Check,
  Download,
  GitCompare,
  Upload,
  FolderUp,
} from 'lucide-react';

export default function CodeTabView({
  sampleDetail,
  originalCode,
  harnessCode,
  unifiedDiff,
  faultLine = 28,
  cweLabel = 'CWE-121',
  sampleName = 'Firmware Target',
  onExportPatch,
  onOpenUpload,
}) {
  const [selectedFile, setSelectedFile] = useState('target.c'); // 'target.c' | 'harness.c' | 'patch.diff' | 'Makefile' | 'README.md'
  const [copied, setCopied] = useState(false);

  const makefileContent = `# AEGIS-IoT Build Rules
CC = gcc
CFLAGS = -Wall -Wextra -O2 -g
SAN_FLAGS = -fsanitize=address,undefined -fno-omit-frame-pointer

all: build

build:
\t$(CC) $(CFLAGS) $(SAN_FLAGS) target.c harness.c -o firmware_test

clean:
\trm -f firmware_test *.o
`;

  const readmeContent = `# ${sampleName}
Vulnerability Class: ${cweLabel}
Defect Location: target.c, Line ${faultLine}

### Description
This firmware module unpacks binary packets from UART/network into a fixed-length memory buffer.
A crafted payload exceeds buffer boundaries, causing a deterministic memory fault reproducible under AddressSanitizer.
`;

  let displayCode = originalCode;
  if (selectedFile === 'harness.c') displayCode = harnessCode;
  else if (selectedFile === 'patch.diff') displayCode = unifiedDiff || '// No patch generated yet. Run verification in the top header to synthesize a repair diff.';
  else if (selectedFile === 'Makefile') displayCode = makefileContent;
  else if (selectedFile === 'README.md') displayCode = readmeContent;

  const lines = displayCode ? displayCode.replace(/\r\n/g, '\n').split('\n') : [];

  const diffLines = unifiedDiff ? unifiedDiff.replace(/\r\n/g, '\n').split('\n') : [];
  const additions = diffLines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
  const deletions = diffLines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length;

  const handleCopy = () => {
    if (!displayCode) return;
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* 1. GitHub Commit Info Bar (Dark Mode) */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-md p-3 flex items-center justify-between text-xs text-[#E6EDF3] shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
            AI
          </div>
          <div>
            <span className="font-bold hover:underline cursor-pointer text-white">AI-Repair-Bot</span>
            <span className="text-[#8B949E] ml-2">
              ground-truth baseline: import {sampleDetail?.sample_id || 'sample'} firmware target & ASan harness
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[#8B949E] font-mono text-[11px]">
          <span className="hover:text-[#58A6FF] cursor-pointer">commit 8f3c1b</span>
          <span>·</span>
          <span>14 commits</span>
        </div>
      </div>

      {/* 2. Repository Action Bar with Upload CTA */}
      <div className="flex items-center justify-between gap-3 bg-[#161B22] border border-[#30363D] rounded-md p-3">
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[10px] text-white uppercase">Branch:</span>
          <span className="font-mono text-xs text-[#58A6FF] font-semibold bg-[#21262D] px-2 py-0.5 rounded border border-[#30363D]">
            main ({sampleDetail?.name || 'Firmware Target'})
          </span>
        </div>

        <button
          onClick={onOpenUpload}
          className="voxel-block mat-emerald font-pixel text-[10px] px-3.5 py-1.5 rounded flex items-center gap-2 cursor-pointer shadow-md text-white"
          title="Upload custom .C file or full firmware directory"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>📤 Upload .C File / Folder</span>
        </button>
      </div>

      {/* 3. GitHub Repository File Explorer Table (Dark Mode) */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-md overflow-hidden shadow-xs">
        <div className="bg-[#21262D] px-4 py-2.5 border-b border-[#30363D] text-xs font-semibold text-[#8B949E] flex items-center justify-between">
          <span>File name</span>
          <span>Last commit message</span>
        </div>

        <div className="divide-y divide-[#21262D] text-xs">
          {/* File 1: target.c */}
          <div
            onClick={() => setSelectedFile('target.c')}
            className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition ${
              selectedFile === 'target.c' ? 'bg-[#1F6FEB]/15 font-semibold text-[#58A6FF]' : 'hover:bg-[#21262D]/60 text-[#C9D1D9]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileCode className="w-4 h-4 text-[#8B949E]" />
              <span className="font-mono font-medium">target.c</span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                {cweLabel.split(':')[0]} (Fault Line {faultLine})
              </span>
            </div>
            <span className="text-[#8B949E] text-[11px]">Original vulnerable C firmware target</span>
          </div>

          {/* File 2: harness.c */}
          <div
            onClick={() => setSelectedFile('harness.c')}
            className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition ${
              selectedFile === 'harness.c' ? 'bg-[#1F6FEB]/15 font-semibold text-[#58A6FF]' : 'hover:bg-[#21262D]/60 text-[#C9D1D9]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileCode className="w-4 h-4 text-[#3FB950]" />
              <span className="font-mono font-medium">harness.c</span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-[#21262D] text-[#8B949E] border border-[#30363D]">
                Ground Truth
              </span>
            </div>
            <span className="text-[#8B949E] text-[11px]">Test harness with --crash & --benign vectors</span>
          </div>

          {/* File 3: patch.diff */}
          <div
            onClick={() => setSelectedFile('patch.diff')}
            className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition ${
              selectedFile === 'patch.diff' ? 'bg-[#1F6FEB]/15 font-semibold text-[#58A6FF]' : 'hover:bg-[#21262D]/60 text-[#C9D1D9]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <GitCompare className="w-4 h-4 text-emerald-400" />
              <span className="font-mono font-medium">patch.diff</span>
              {unifiedDiff && (
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                  +{additions}/-{deletions}
                </span>
              )}
            </div>
            <span className="text-[#8B949E] text-[11px]">AI synthesized surgical repair diff</span>
          </div>

          {/* File 4: Makefile */}
          <div
            onClick={() => setSelectedFile('Makefile')}
            className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition ${
              selectedFile === 'Makefile' ? 'bg-[#1F6FEB]/15 font-semibold text-[#58A6FF]' : 'hover:bg-[#21262D]/60 text-[#C9D1D9]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <File className="w-4 h-4 text-[#8B949E]" />
              <span className="font-mono font-medium">Makefile</span>
            </div>
            <span className="text-[#8B949E] text-[11px]">GCC build rules with -fsanitize=address,undefined</span>
          </div>

          {/* File 5: README.md */}
          <div
            onClick={() => setSelectedFile('README.md')}
            className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition ${
              selectedFile === 'README.md' ? 'bg-[#1F6FEB]/15 font-semibold text-[#58A6FF]' : 'hover:bg-[#21262D]/60 text-[#C9D1D9]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-[#8B949E]" />
              <span className="font-mono font-medium">README.md</span>
            </div>
            <span className="text-[#8B949E] text-[11px]">Scenario specification and CWE details</span>
          </div>
        </div>
      </div>

      {/* 3. GitHub File Code Viewer (Dark Mode) */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-md overflow-hidden shadow-sm">
        {/* Box Header */}
        <div className="bg-[#21262D] px-4 py-2.5 border-b border-[#30363D] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-[#8B949E]" />
            <span className="font-bold text-white font-mono text-sm">{selectedFile}</span>
            <span className="text-[#8B949E] text-xs">({lines.length} lines)</span>
          </div>

          <div className="flex items-center gap-2.5">
            {selectedFile === 'target.c' && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                Fault Line {faultLine}: Memory Copy
              </span>
            )}

            {selectedFile === 'patch.diff' && unifiedDiff && (
              <button
                onClick={onExportPatch}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] text-xs border border-[#30363D] transition"
              >
                <Download className="w-3.5 h-3.5 text-[#8B949E]" />
                <span>Export .patch</span>
              </button>
            )}

            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md hover:bg-[#30363D] text-[#8B949E] hover:text-white border border-[#30363D] bg-[#21262D] transition shadow-xs"
              title="Copy file contents"
            >
              {copied ? <Check className="w-4 h-4 text-[#3FB950]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Code Content Area with JetBrains Mono 14px */}
        <div className="p-4 overflow-auto font-mono text-[14px] leading-relaxed max-h-[580px] bg-[#0D1117] text-[#E6EDF3]">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => {
                const lineNum = idx + 1;
                const isFault = selectedFile === 'target.c' && lineNum === faultLine;

                let rowClass = 'hover:bg-[#161B22]/50 text-[#C9D1D9]';
                let gutterClass = 'text-[#6E7681]';

                if (isFault) {
                  rowClass = 'bg-rose-950/30 border-l-4 border-[#F85149] font-semibold text-rose-200';
                  gutterClass = 'text-rose-400 font-bold';
                } else if (selectedFile === 'patch.diff') {
                  if (line.startsWith('+++') || line.startsWith('---')) {
                    rowClass = 'bg-[#1F6FEB]/15 text-[#58A6FF] font-semibold';
                  } else if (line.startsWith('@@')) {
                    rowClass = 'bg-[#161B22] text-[#8B949E] font-semibold';
                  } else if (line.startsWith('+')) {
                    rowClass = 'diff-add-row font-semibold';
                  } else if (line.startsWith('-')) {
                    rowClass = 'diff-del-row font-semibold';
                  }
                } else if (selectedFile === 'harness.c') {
                  if (line.includes('--crash')) {
                    rowClass = 'bg-rose-950/20 text-rose-200 font-semibold';
                  } else if (line.includes('--benign')) {
                    rowClass = 'bg-emerald-950/20 text-emerald-200 font-semibold';
                  }
                }

                return (
                  <tr key={idx} className={`font-mono ${rowClass}`}>
                    <td className={`w-12 pr-3 py-0.5 text-right select-none font-mono text-xs ${gutterClass}`}>
                      {lineNum}
                    </td>
                    <td className="whitespace-pre px-3 py-0.5 font-mono">
                      {line || ' '}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
