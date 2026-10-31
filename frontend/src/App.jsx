// filepath: frontend/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import GitHubTopNav from './components/github/GitHubTopNav';
import GitHubTabs from './components/github/GitHubTabs';
import CodeTabView from './components/github/CodeTabView';
import ActionsTabView from './components/github/ActionsTabView';
import SecurityTabView from './components/github/SecurityTabView';
import BenchmarkTabView from './components/github/BenchmarkTabView';
import FileUploadModal from './components/github/FileUploadModal';

export default function App() {
  const [samples, setSamples] = useState([]);
  const [selectedSampleId, setSelectedSampleId] = useState('iot_mqtt_parser');
  const [sampleDetail, setSampleDetail] = useState(null);
  const [executionLane, setExecutionLane] = useState('CLOUD_LLM');
  const [runState, setRunState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Active GitHub Tab: 'code' | 'actions' | 'security' | 'benchmark'
  const [activeGitHubTab, setActiveGitHubTab] = useState('code');

  const pollIntervalRef = useRef(null);

  // Load samples on mount and auto-trigger verification run on initial sample
  useEffect(() => {
    fetch('/api/samples')
      .then((res) => res.json())
      .then((data) => {
        setSamples(data);
        if (data.length > 0) {
          const firstId = data[0].id || data[0].sample_id || 'iot_mqtt_parser';
          loadSampleDetail(firstId, true);
        }
      })
      .catch((err) => {
        console.error('Error fetching samples:', err);
        // Fallback to default
        loadSampleDetail('iot_mqtt_parser', true);
      });
  }, []);

  // Fetch full sample detail and optionally auto-execute verification ladder
  const loadSampleDetail = async (sampleId, autoRun = false) => {
    setSelectedSampleId(sampleId);
    try {
      const res = await fetch(`/api/samples/${sampleId}`);
      if (res.ok) {
        const data = await res.json();
        setSampleDetail(data);
        if (autoRun) {
          handleRunLadder(sampleId);
        }
      }
    } catch (err) {
      console.error('Error fetching sample detail:', err);
    }
  };

  // Run the 7-Stage Deterministic Verification Ladder
  const handleRunLadder = async (targetSampleId = null) => {
    const sampleToRun = targetSampleId || selectedSampleId || 'iot_mqtt_parser';

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    setIsRunning(true);

    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sample_id: sampleToRun,
          lane: executionLane,
          provider: 'auto',
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to start run: ${res.statusText}`);
      }

      const initialRun = await res.json();
      setRunState(initialRun);

      const runId = initialRun.run_id;

      // Start 400ms Live Telemetry Polling Loop
      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/runs/${runId}`);
          if (pollRes.ok) {
            const current = await pollRes.json();
            setRunState(current);

            // Check completion conditions
            if (['VERIFIED', 'REJECTED', 'UNVERIFIED', 'ERROR'].includes(current.verdict)) {
              clearInterval(pollIntervalRef.current);
              setIsRunning(false);
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 400);
    } catch (err) {
      console.error('Run initialization error:', err);
      setIsRunning(false);
    }
  };

  // Handle successful file or folder upload
  const handleUploadSuccess = (uploadResult) => {
    if (uploadResult?.results && uploadResult.results.length > 0) {
      const first = uploadResult.results[0];
      const newSampleId = first.sample_id;
      loadSampleDetail(newSampleId, false);
      setActiveGitHubTab('actions');
      if (first.run_id) {
        // Poll uploaded run
        setIsRunning(true);
        pollIntervalRef.current = setInterval(async () => {
          try {
            const pollRes = await fetch(`/api/runs/${first.run_id}`);
            if (pollRes.ok) {
              const current = await pollRes.json();
              setRunState(current);
              if (['VERIFIED', 'REJECTED', 'UNVERIFIED', 'ERROR'].includes(current.verdict)) {
                clearInterval(pollIntervalRef.current);
                setIsRunning(false);
              }
            }
          } catch (e) {
            console.error('Upload poll error:', e);
          }
        }, 400);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleExportPatch = () => {
    if (!runState?.run_id) return;
    window.location.href = `/api/runs/${runState.run_id}/export?format=patch`;
  };

  const handleExportMarkdown = () => {
    if (!runState?.run_id) return;
    window.location.href = `/api/runs/${runState.run_id}/export?format=md`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0D1117] text-[#E6EDF3] font-sans selection:bg-[#388BFD]/30 selection:text-white">
      {/* 1. Global GitHub Header with Octocat & Breadcrumbs */}
      <GitHubTopNav
        selectedSampleId={selectedSampleId}
        onSelectSample={(id) => loadSampleDetail(id, false)}
        executionLane={executionLane}
        onChangeLane={setExecutionLane}
        onRunLadder={() => handleRunLadder()}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        isRunning={isRunning}
        verdict={runState?.verdict}
      />

      {/* 2. Authentic GitHub Repository Navigation Tabs (4 Streamlined Tabs) */}
      <GitHubTabs
        activeTab={activeGitHubTab}
        onSelectTab={setActiveGitHubTab}
        runState={runState}
        isRunning={isRunning}
      />

      {/* 3. Main Dedicated Tab Content Area */}
      <main className="flex-1 max-w-[1560px] w-full mx-auto px-6 py-6">
        {/* Tab 1: Code & Upload */}
        {activeGitHubTab === 'code' && (
          <CodeTabView
            sampleDetail={sampleDetail}
            originalCode={sampleDetail?.original_code}
            harnessCode={sampleDetail?.harness_code}
            unifiedDiff={runState?.stage_3?.patch_unified_diff}
            faultLine={sampleDetail?.fault_line || 28}
            cweLabel={sampleDetail?.cwe || 'CWE-121'}
            sampleName={sampleDetail?.name || 'Firmware Target'}
            onExportPatch={handleExportPatch}
            onOpenUpload={() => setIsUploadModalOpen(true)}
          />
        )}

        {/* Tab 2: 3D Verification Actions */}
        {activeGitHubTab === 'actions' && (
          <ActionsTabView
            runState={runState}
            isRunning={isRunning}
            onRunLadder={() => handleRunLadder()}
            sampleName={sampleDetail?.name || 'UART Stack Overflow'}
            sampleDetail={sampleDetail}
            onExportPatch={handleExportPatch}
            onExportMarkdown={handleExportMarkdown}
            onSwitchToTab={setActiveGitHubTab}
          />
        )}

        {/* Tab 3: Security & Executive Cards */}
        {activeGitHubTab === 'security' && (
          <SecurityTabView
            runState={runState}
            sampleDetail={sampleDetail}
          />
        )}

        {/* Tab 4: Benchmark, Juliet & Competitors */}
        {activeGitHubTab === 'benchmark' && (
          <BenchmarkTabView
            onExportPatch={handleExportPatch}
            onExportMarkdown={handleExportMarkdown}
          />
        )}
      </main>

      {/* 4. Upload Modal for .C File or Folder */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* 5. GitHub Standard Dark Footer */}
      <footer className="border-t border-[#30363D] py-6 px-6 bg-[#0D1117] text-xs text-[#8B949E] mt-auto">
        <div className="max-w-[1560px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#E6EDF3]">AEGIS-IoT</span>
            <span>·</span>
            <span>Team SIGMOID SQUAD (Scope Global Skills University, Bhopal)</span>
            <span>·</span>
            <span>AI-Manthan 2.0 (AITR, Indore)</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="italic text-[#7D8590]">
              *Strict Claim Policy: Labels patches &quot;Verified for tested cases&quot;, never &quot;safe&quot; or &quot;secure&quot;.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
