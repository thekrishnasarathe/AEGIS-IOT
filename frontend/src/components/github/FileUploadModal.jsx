// filepath: frontend/src/components/github/FileUploadModal.jsx
import React, { useState, useRef } from 'react';
import {
  Upload,
  FolderUp,
  FileCode,
  X,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Code,
  File,
} from 'lucide-react';

export default function FileUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'folder' | 'paste'
  const [fileList, setFileList] = useState([]);
  const [pasteFilename, setPasteFilename] = useState('custom_target.c');
  const [pasteCode, setPasteCode] = useState(`// Paste vulnerable C/C++ firmware code here
#include <stdio.h>
#include <string.h>

void process_data(const char *in) {
    char buf[32];
    // Vulnerable unbounded copy:
    strcpy(buf, in);
}
`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  if (!isOpen) return null;

  const handleSingleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setFileList(files);
    setErrorMessage(null);
  };

  const handleFolderChange = (e) => {
    const files = Array.from(e.target.files || []).filter(
      (f) => f.name.endsWith('.c') || f.name.endsWith('.h') || f.name.endsWith('.cpp')
    );
    if (files.length === 0) {
      setErrorMessage('No .c, .cpp, or .h files found in selected folder.');
      return;
    }
    setFileList(files);
    setErrorMessage(null);
  };

  const readFileText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let payload = {};

      if (activeTab === 'paste') {
        if (!pasteCode.trim()) {
          throw new Error('Please enter C source code.');
        }
        payload = {
          filename: pasteFilename || 'target.c',
          code: pasteCode,
          lane: 'CLOUD_LLM',
          provider: 'auto',
        };
      } else {
        if (fileList.length === 0) {
          throw new Error('Please select at least one file to upload.');
        }

        const items = [];
        for (const file of fileList) {
          const content = await readFileText(file);
          items.push({
            filename: file.webkitRelativePath || file.name,
            code: content,
          });
        }

        payload = {
          files: items,
          lane: 'CLOUD_LLM',
          provider: 'auto',
        };
      }

      const res = await fetch('/api/upload-and-repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.statusText} (${errText})`);
      }

      const resultData = await res.json();
      if (onUploadSuccess) {
        onUploadSuccess(resultData);
      }
      onClose();
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMessage(err.message || 'Failed to upload and repair source.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 font-sans">
      <div className="voxel-card lego-studs bg-[#0D1117] w-full max-w-2xl rounded-xl border-2 border-black overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 bg-[#161B22] border-b border-[#30363D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded voxel-block mat-diamond flex items-center justify-center text-white">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-pixel text-xs text-white uppercase tracking-wide">
                Upload Firmware Source (.C / Folder)
              </h2>
              <span className="text-[11px] text-[#8B949E]">
                AST Triage · LLM Multi-Cloud Patch · 7-Stage Sandbox Verification
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#30363D] bg-[#090D13] text-xs">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-3 font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'single'
                ? 'border-[#F78166] text-white bg-[#161B22]'
                : 'border-transparent text-[#8B949E] hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Single File (.c / .h)</span>
          </button>

          <button
            onClick={() => setActiveTab('folder')}
            className={`flex-1 py-3 font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'folder'
                ? 'border-[#F78166] text-white bg-[#161B22]'
                : 'border-transparent text-[#8B949E] hover:text-white'
            }`}
          >
            <FolderUp className="w-4 h-4" />
            <span>Firmware Folder</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-3 font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'paste'
                ? 'border-[#F78166] text-white bg-[#161B22]'
                : 'border-transparent text-[#8B949E] hover:text-white'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Paste C Code</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          {errorMessage && (
            <div className="bg-rose-950/40 border border-rose-800 text-rose-300 p-3 rounded text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'single' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#30363D] hover:border-[#58A6FF] rounded-lg p-8 text-center cursor-pointer transition bg-[#161B22]/40"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".c,.h,.cpp"
                onChange={handleSingleFileChange}
                className="hidden"
              />
              <FileCode className="w-10 h-10 text-[#58A6FF] mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">Click or drag & drop a .C / .H file here</p>
              <p className="text-xs text-[#8B949E] mt-1">Supports C99 / C11 IoT firmware targets</p>
              {fileList.length > 0 && (
                <div className="mt-3 font-pixel text-[10px] text-emerald-400 bg-emerald-500/10 py-1 px-3 rounded inline-block border border-emerald-500/30">
                  ✓ Selected: {fileList[0].name} ({(fileList[0].size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
          )}

          {activeTab === 'folder' && (
            <div
              onClick={() => folderInputRef.current?.click()}
              className="border-2 border-dashed border-[#30363D] hover:border-[#58A6FF] rounded-lg p-8 text-center cursor-pointer transition bg-[#161B22]/40"
            >
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory="true"
                multiple
                onChange={handleFolderChange}
                className="hidden"
              />
              <FolderUp className="w-10 h-10 text-[#58A6FF] mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">Click to select an entire firmware project folder</p>
              <p className="text-xs text-[#8B949E] mt-1">Automatically indexes all .c and .h files</p>
              {fileList.length > 0 && (
                <div className="mt-3 font-pixel text-[10px] text-emerald-400 bg-emerald-500/10 py-1 px-3 rounded inline-block border border-emerald-500/30">
                  ✓ Found {fileList.length} C source files
                </div>
              )}
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#8B949E]">Virtual Filename:</span>
                <input
                  type="text"
                  value={pasteFilename}
                  onChange={(e) => setPasteFilename(e.target.value)}
                  className="bg-[#161B22] border border-[#30363D] px-2 py-1 rounded text-white text-xs w-48 focus:outline-hidden focus:border-[#58A6FF]"
                />
              </div>

              <textarea
                value={pasteCode}
                onChange={(e) => setPasteCode(e.target.value)}
                rows={9}
                className="w-full bg-[#010409] border border-[#30363D] rounded-md p-3 font-mono text-xs text-white focus:outline-hidden focus:border-[#58A6FF] resize-none"
                placeholder="// Enter C source code here..."
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#161B22] border-t border-[#30363D] flex items-center justify-between">
          <span className="text-[11px] text-[#8B949E] font-mono">
            Orchestrator: Fast-lane Groq -&gt; Gemini -&gt; Ollama (:11434)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="voxel-block mat-emerald font-pixel text-[10px] px-4 py-2 rounded flex items-center gap-2 cursor-pointer shadow-md"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload & Run Verification</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

