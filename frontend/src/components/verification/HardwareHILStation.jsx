// filepath: frontend/src/components/verification/HardwareHILStation.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Radio,
  AlertTriangle,
  Volume2,
  VolumeX,
  ShieldAlert,
  ShieldCheck,
  Send,
  RefreshCw,
  Terminal,
  Activity,
  Zap,
  Flame,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function HardwareHILStation({ runState }) {
  const [hardwareState, setHardwareState] = useState({
    connected: false,
    mode: 'DIGITAL_TWIN_MIRROR',
    port: 'EMULATED_COM_PORT (ATmega328P)',
    available_ports: [],
    baudrate: 9600,
    mcu: 'ATmega328P (8-bit AVR @ 16 MHz)',
    specs: {
      flash_bytes: 32768,
      sram_bytes: 2048,
      eeprom_bytes: 1024,
      buffer_capacity: 32,
      max_cmd_len: 31,
    },
    kit: 'Indeyes IoT Trainer Kit (Arduino UNO R3)',
    peripherals: [
      '16x2 Character LCD (Parallel / I2C)',
      'Red Warning LED (Pin 8)',
      'Active Piezo Buzzer (Pin 9)',
    ],
    lcd_line1: 'AEGIS-IoT HIL   ',
    lcd_line2: 'Device Ready    ',
    led_on: false,
    buzzer_on: false,
    invalid_command_count: 0,
    metrics: {
      total_commands: 0,
      oversized_blocked: 0,
      floods_blocked: 0,
      brute_force_alerts: 0,
    },
    recent_logs: [],
  });

  const [selectedPort, setSelectedPort] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingPorts, setIsRefreshingPorts] = useState(false);
  const logContainerRef = useRef(null);

  // Poll hardware status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/hardware/status');
      if (res.ok) {
        const data = await res.json();
        setHardwareState(data);
        if (data.available_ports && data.available_ports.length > 0 && !selectedPort) {
          setSelectedPort(data.available_ports[0].device);
        }
      }
    } catch (err) {
      // Backend may be momentarily busy
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1200);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll serial log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [hardwareState.recent_logs]);

  // Command Dispatch
  const sendCommand = async (cmd) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/hardware/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status) {
          setHardwareState(data.status);
        }
      }
    } catch (err) {
      console.error('Error sending hardware command:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect / Disconnect Handlers
  const handleConnect = async () => {
    setIsRefreshingPorts(true);
    try {
      const res = await fetch('/api/hardware/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: selectedPort || null }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status) setHardwareState(data.status);
      }
    } catch (err) {
      console.error('Connection error:', err);
    } finally {
      setIsRefreshingPorts(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/hardware/disconnect', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.status) setHardwareState(data.status);
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  const isPhysical = hardwareState.connected;

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Header Bar with Physical Hardware / Digital Twin Mirror Switch */}
      <div className="p-4 rounded-xl bg-[#0B0F17] border border-cyan-900/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-950/50">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                Hardware-in-the-Loop (HIL) Station
              </h2>
              <span
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                  isPhysical
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {isPhysical ? `PHYSICAL HARDWARE (${hardwareState.port})` : 'DIGITAL TWIN MIRROR (FAIL-SAFE)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Microchip ATmega328P · Indeyes IoT Trainer Kit (Arduino UNO) · 9600 Baud Serial · 32-Byte Guarded Buffer
            </p>
          </div>
        </div>

        {/* Port Selector & Connection Controls */}
        <div className="flex items-center gap-2">
          {hardwareState.available_ports && hardwareState.available_ports.length > 0 ? (
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              disabled={isPhysical}
              className="bg-[#131A26] border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
            >
              {hardwareState.available_ports.map((p) => (
                <option key={p.device} value={p.device}>
                  {p.device} - {p.description}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-[11px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
              No COM Port Detected
            </span>
          )}

          {isPhysical ? (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 border border-rose-700/50 text-xs font-semibold transition cursor-pointer"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isRefreshingPorts}
              className="px-3 py-1.5 rounded-lg bg-cyan-700/50 hover:bg-cyan-600/70 text-cyan-200 border border-cyan-500/50 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingPorts ? 'animate-spin' : ''}`} />
              Connect Hardware
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Hardware Panel: LCD + Indicators + Interactive Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: 16x2 Character LCD & Physical Actuators (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* LCD 16x2 Display */}
          <div className="voxel-card lego-studs p-4 rounded-xl bg-[#060D08] border-2 border-[#1E3B27] shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E3B27] mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]" />
                <span className="font-pixel text-[10px] text-emerald-400 uppercase tracking-widest">
                  16x2 Character LCD Telemetry
                </span>
              </div>
              <span className="font-mono text-[10px] text-emerald-600">HD44780 Parallel / I2C</span>
            </div>

            {/* Retro Backlit Screen Frame */}
            <div className="bg-[#0B2113] border-4 border-[#12311C] rounded-lg p-4 shadow-[inset_0_4px_16px_rgba(0,0,0,0.85)] relative">
              {/* Scanline Effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-950/10 to-transparent pointer-events-none opacity-40" />

              <div className="font-pixel text-emerald-400 text-sm md:text-base tracking-[0.2em] space-y-1.5 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] select-all">
                <div className="whitespace-pre bg-[#07170D] px-3 py-1.5 rounded border border-[#163D24]">
                  {hardwareState.lcd_line1.padEnd(16, ' ').slice(0, 16)}
                </div>
                <div className="whitespace-pre bg-[#07170D] px-3 py-1.5 rounded border border-[#163D24]">
                  {hardwareState.lcd_line2.padEnd(16, ' ').slice(0, 16)}
                </div>
              </div>

              <div className="flex justify-between items-center mt-3 text-[9px] font-mono text-emerald-600/90 pt-2 border-t border-[#12311C]">
                <span>16 CHARACTERS × 2 LINES</span>
                <span>ATMEGA328P PORT DISPLAY</span>
              </div>
            </div>
          </div>

          {/* Physical Indicators & MCU Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Red Warning LED (Pin 8) */}
            <div
              className={`p-3.5 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                hardwareState.led_on
                  ? 'bg-rose-950/80 border-rose-500/80 shadow-[0_0_24px_rgba(244,63,94,0.45)]'
                  : 'bg-[#0E131E] border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-pixel text-slate-300">RED LED (D8)</span>
                <span
                  className={`w-3.5 h-3.5 rounded-full border ${
                    hardwareState.led_on
                      ? 'bg-rose-500 border-white shadow-[0_0_12px_#F43F5E] animate-ping'
                      : 'bg-rose-950 border-rose-800'
                  }`}
                />
              </div>
              <div className="mt-3">
                <div
                  className={`text-sm font-bold font-mono ${
                    hardwareState.led_on ? 'text-rose-400' : 'text-slate-500'
                  }`}
                >
                  {hardwareState.led_on ? 'ACTIVE (THREAT/OVERFLOW)' : 'OFF (NOMINAL)'}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Pin 8 Actuator</span>
              </div>
            </div>

            {/* Active Buzzer (Pin 9) */}
            <div
              className={`p-3.5 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                hardwareState.buzzer_on
                  ? 'bg-amber-950/80 border-amber-500/80 shadow-[0_0_24px_rgba(245,158,11,0.45)]'
                  : 'bg-[#0E131E] border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-pixel text-slate-300">BUZZER (D9)</span>
                {hardwareState.buzzer_on ? (
                  <Volume2 className="w-4 h-4 text-amber-400 animate-bounce" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-600" />
                )}
              </div>
              <div className="mt-3">
                <div
                  className={`text-sm font-bold font-mono ${
                    hardwareState.buzzer_on ? 'text-amber-400' : 'text-slate-500'
                  }`}
                >
                  {hardwareState.buzzer_on ? 'BEEPING (ALARM)' : 'SILENT'}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Pin 9 Piezo Transducer</span>
              </div>
            </div>

            {/* MCU Memory Specs */}
            <div className="p-3.5 rounded-xl bg-[#0E131E] border border-cyan-900/40 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-pixel text-cyan-400">ATmega328P</span>
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2 space-y-0.5 text-[10px] font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Flash ROM:</span>
                  <span className="text-cyan-300 font-bold">32 KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SRAM:</span>
                  <span className="text-cyan-300 font-bold">2,048 B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cmd Buffer:</span>
                  <span className="text-emerald-400 font-bold">32 B (Cap)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Test Action Dispatcher */}
          <div className="p-4 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[11px] text-white uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Hardware Test Commands
              </span>
              <span className="text-[10px] font-mono text-slate-400">Click to dispatch to ATmega328P</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => sendCommand('READY')}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold transition active:scale-95 cursor-pointer text-center"
              >
                READY
              </button>
              <button
                onClick={() => sendCommand('SCAN')}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-mono font-bold transition active:scale-95 cursor-pointer text-center"
              >
                SCAN (Gate 01)
              </button>
              <button
                onClick={() => sendCommand('THREAT')}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-mono font-bold transition active:scale-95 cursor-pointer text-center"
              >
                THREAT (Gate 02)
              </button>
              <button
                onClick={() => sendCommand('PATCH')}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-xs font-mono font-bold transition active:scale-95 cursor-pointer text-center"
              >
                PATCH (Gate 03)
              </button>
            </div>

            {/* High-Impact Security Attack Simulators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => sendCommand('OVERSIZED_TEST')}
                disabled={isLoading}
                className="px-3.5 py-2.5 rounded-lg bg-gradient-to-r from-rose-900/60 to-red-800/60 hover:from-rose-800 hover:to-red-700 text-white border border-rose-500/50 text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-lg shadow-rose-950/40"
              >
                <Flame className="w-4 h-4 text-rose-400" />
                Fire 64-Byte Buffer Attack (AAAA...)
              </button>

              <button
                onClick={() => sendCommand('FLOOD_TEST')}
                disabled={isLoading}
                className="px-3.5 py-2.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/70 text-amber-200 border border-amber-600/50 text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Test Flood / Rate-Limit Guard
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => sendCommand('PASS')}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-mono font-bold transition active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                PASS (Verified)
              </button>
              <button
                onClick={() => sendCommand('FAIL')}
                disabled={isLoading}
                className="px-3 py-2 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-mono font-bold transition active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                FAIL (Rejected)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Serial Monitor Drawer & Metrics (5 cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* Security Interception Counters */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-[#0B0F17] border border-slate-800 rounded-xl text-center">
              <div className="text-[10px] font-mono text-slate-400">Oversized Interceptions</div>
              <div className="text-xl font-bold font-pixel text-rose-400 my-0.5">
                {hardwareState.metrics?.oversized_blocked || 0}
              </div>
              <div className="text-[9px] text-slate-500 font-mono">&gt; 31 Bytes Blocked</div>
            </div>

            <div className="p-3 bg-[#0B0F17] border border-slate-800 rounded-xl text-center">
              <div className="text-[10px] font-mono text-slate-400">Flood Throttles</div>
              <div className="text-xl font-bold font-pixel text-amber-400 my-0.5">
                {hardwareState.metrics?.floods_blocked || 0}
              </div>
              <div className="text-[9px] text-slate-500 font-mono">&gt; 5 cmds / 1500ms</div>
            </div>
          </div>

          {/* Live Serial Monitor Console */}
          <div className="flex-1 bg-[#06080F] border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-xl min-h-[340px]">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-pixel text-[10px] text-slate-200">Serial Stream (9600 Baud)</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500">8-N-1 · ASCII '\n'</span>
              </div>

              {/* Log Stream Output */}
              <div
                ref={logContainerRef}
                className="h-[240px] overflow-y-auto space-y-1 font-mono text-[11px] pr-1 scrollbar-thin"
              >
                {hardwareState.recent_logs && hardwareState.recent_logs.length > 0 ? (
                  hardwareState.recent_logs.map((log, idx) => (
                    <div key={idx} className="leading-snug break-all">
                      {log.direction === 'TX' && (
                        <span className="text-cyan-400 font-bold">TX &gt; </span>
                      )}
                      {log.direction === 'RX' && (
                        <span className="text-emerald-400 font-bold">RX &lt; </span>
                      )}
                      {log.direction === 'SYS' && (
                        <span className="text-amber-400 font-bold">[SYS] </span>
                      )}
                      <span
                        className={
                          log.direction === 'TX'
                            ? 'text-cyan-200'
                            : log.direction === 'RX'
                            ? log.text.includes('SECURITY ALERT') || log.text.includes('OVERSIZED')
                              ? 'text-rose-400 font-bold'
                              : 'text-emerald-200'
                            : 'text-slate-400 italic'
                        }
                      >
                        {log.text}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-600 italic">No serial traffic yet. Send a command above.</div>
                )}
              </div>
            </div>

            {/* Custom Command Sender Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customCommand.trim()) {
                  sendCommand(customCommand.trim());
                  setCustomCommand('');
                }
              }}
              className="mt-3 pt-2 border-t border-slate-800 flex gap-2"
            >
              <input
                type="text"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                placeholder="Type command (e.g. STATUS, READY)..."
                maxLength={64}
                className="flex-1 bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white rounded-lg focus:outline-none font-mono"
              />
              <button
                type="submit"
                disabled={isLoading || !customCommand.trim()}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

