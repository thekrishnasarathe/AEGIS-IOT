# filepath: backend/app/engine/hardware_bridge.py
"""
AEGIS-IoT Hardware-in-the-Loop (HIL) Bridge & Digital Twin Mirror.
Target MCU: Microchip ATmega328P (8-bit AVR @ 16 MHz) on Indeyes IoT Trainer Kit.
Peripherals: 16x2 Character LCD, Red Warning LED (Pin 8), Active Buzzer (Pin 9).
Baudrate: 9600 Baud (Newline '\n' terminated).

Zero-Lag Design Axioms:
1. Maintain ONE persistent singleton serial.Serial connection (dsrdtr=False, rtscts=False).
   Never open/close per command, which would toggle DTR and reset the Arduino UNO for 2s.
2. Background reader daemon thread handles incoming serial RX asynchronously without blocking.
3. Fast in-memory state updates (<1ms) so FastAPI verification ladder requests never wait on UART I/O.
4. Fail-Safe Digital Twin Mirror fallback ensures zero crash / zero UI freeze when disconnected.
"""

import os
import time
import threading
from typing import Dict, Any, List, Optional

try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    serial = None
    SERIAL_AVAILABLE = False


class HardwareBridge:
    """
    Manages persistent USB Serial communication with Arduino UNO ATmega328P node
    with asynchronous background RX and an instantaneous Digital Twin Mirror fallback.
    """

    def __init__(self):
        self.lock = threading.RLock()
        self.serial_conn: Optional[Any] = None
        self.active_port: Optional[str] = None
        self.port_error: Optional[str] = None
        self.baudrate: int = 9600

        # MCU & Peripheral Metadata
        self.mcu = "ATmega328P (8-bit AVR @ 16 MHz)"
        self.specs = {
            "flash_bytes": 32768,      # 32 KB
            "sram_bytes": 2048,        # 2 KB
            "eeprom_bytes": 1024,      # 1 KB
            "buffer_capacity": 32,     # char commandBuffer[32]
            "max_cmd_len": 31,
        }
        self.kit = "Indeyes IoT Trainer Kit (Arduino UNO R3)"
        self.peripherals = [
            "16x2 Character LCD (Parallel / I2C)",
            "Red Warning LED (Pin 8)",
            "Active Piezo Buzzer (Pin 9)",
        ]

        # Emulated / Mirrored Physical State
        self.lcd_line1: str = "AEGIS-IoT HIL   "
        self.lcd_line2: str = "Device Ready    "
        self.led_on: bool = False
        self.buzzer_on: bool = False
        self.invalid_count: int = 0
        self.max_invalid_attempts: int = 3

        # Rate-limiting window: max 5 commands per 1.5 seconds
        self.command_timestamps: List[float] = []
        self.rate_limit_window: float = 1.5
        self.rate_limit_max: int = 5

        # Telemetry & Security Metrics
        self.total_commands: int = 0
        self.oversized_blocked: int = 0
        self.floods_blocked: int = 0
        self.brute_force_alerts: int = 0

        # Background reader thread
        self.reader_thread: Optional[threading.Thread] = None
        self.stop_reader = threading.Event()

        # Timestamped circular serial log (max 120 lines)
        self.serial_log: List[Dict[str, Any]] = [
            {
                "direction": "SYS",
                "text": "AEGIS-IoT Hardware Bridge initialized (Zero-Lag Async Engine).",
                "timestamp": time.time(),
            }
        ]

        # Auto-detect on startup
        self.auto_connect()

    def list_ports(self) -> List[Dict[str, str]]:
        """Enumerates connected USB/COM serial ports."""
        ports = []
        if SERIAL_AVAILABLE and serial is not None:
            try:
                for p in serial.tools.list_ports.comports():
                    ports.append({
                        "device": p.device,
                        "description": p.description or "Serial Device",
                        "hwid": p.hwid or "",
                    })
            except Exception:
                pass

        # Windows Registry kernel serial enumeration fallback
        if os.name == "nt":
            try:
                import winreg
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DEVICEMAP\SERIALCOMM")
                for i in range(winreg.QueryInfoKey(key)[1]):
                    name, val, _ = winreg.EnumValue(key, i)
                    if not any(p["device"] == val for p in ports):
                        ports.append({
                            "device": val,
                            "description": f"USB Serial Device ({val})",
                            "hwid": name,
                        })
                winreg.CloseKey(key)
            except Exception:
                pass

        return ports

    def auto_connect(self) -> bool:
        """Attempts to discover and connect to an Arduino / USB-Serial device."""
        if not SERIAL_AVAILABLE or serial is None:
            return False

        ports = self.list_ports()
        # Sort ports so Arduino / USB Serial devices come first
        keywords = ["arduino", "ch340", "ftdi", "cp210", "usb serial", "usb-serial", "2341:0043", "vid:pid=2341", "com5"]
        def rank(p):
            txt = (p.get("description", "") + " " + p.get("hwid", "") + " " + p.get("device", "")).lower()
            return 0 if any(k in txt for k in keywords) else 1

        sorted_ports = sorted(ports, key=rank)

        for p in sorted_ports:
            dev = p["device"]
            if self.connect(dev):
                return True

        return False

    def connect(self, port_name: str) -> bool:
        """
        Opens a single persistent serial connection to designated COM port.
        dsrdtr=False and rtscts=False prevent accidental DTR reset loops.
        """
        if not SERIAL_AVAILABLE or serial is None:
            self.port_error = "PySerial not available"
            return False

        with self.lock:
            try:
                self._stop_reader_thread()
                if self.serial_conn and self.serial_conn.is_open:
                    try:
                        self.serial_conn.close()
                    except Exception:
                        pass

                # Persistent singleton connection with low timeout and stable DTR
                self.serial_conn = serial.Serial(
                    port=port_name,
                    baudrate=self.baudrate,
                    timeout=0.05,
                    write_timeout=0.1,
                    dsrdtr=False,
                    rtscts=False,
                )
                try:
                    self.serial_conn.dtr = False
                except Exception:
                    pass

                self.active_port = port_name
                self.port_error = None
                self._start_reader_thread()
                self._append_log("SYS", f"Persistent serial stream connected to {port_name} @ {self.baudrate} baud (DTR stable).")
                
                # Send READY state to sync MCU
                try:
                    self.serial_conn.write(b"READY\n")
                    self.serial_conn.flush()
                except Exception:
                    pass

                return True
            except Exception as e:
                self.serial_conn = None
                err_str = str(e)
                if "PermissionError" in err_str or "Access is denied" in err_str:
                    self.port_error = f"{port_name} is locked by another process (Close Arduino IDE Serial Monitor to connect)"
                else:
                    self.port_error = f"Cannot open {port_name}: {err_str}"
                self._append_log("SYS", f"Could not connect to {port_name}: {err_str}. Operating via Digital Twin Mirror.")
                return False

    def disconnect(self) -> None:
        """Closes persistent serial connection and stops background reader."""
        with self.lock:
            self._stop_reader_thread()
            if self.serial_conn and self.serial_conn.is_open:
                try:
                    self.serial_conn.close()
                except Exception:
                    pass
            self.serial_conn = None
            self.active_port = None
            self.port_error = None
            self._append_log("SYS", "Disconnected from physical serial port. Switched to Digital Twin Mirror.")

    def _start_reader_thread(self) -> None:
        self.stop_reader.clear()
        self.reader_thread = threading.Thread(target=self._background_reader, daemon=True)
        self.reader_thread.start()

    def _stop_reader_thread(self) -> None:
        self.stop_reader.set()
        if self.reader_thread and self.reader_thread.is_alive():
            self.reader_thread.join(timeout=0.2)
        self.reader_thread = None

    def _background_reader(self) -> None:
        """Asynchronously ingests RX lines without ever blocking HTTP requests."""
        while not self.stop_reader.is_set():
            conn = self.serial_conn
            if conn and conn.is_open:
                try:
                    if conn.in_waiting > 0:
                        raw = conn.readline()
                        line = raw.decode("utf-8", errors="ignore").strip()
                        if line:
                            self._append_log("RX", line)
                            self._sync_state_from_rx(line)
                    else:
                        time.sleep(0.015)
                except Exception:
                    time.sleep(0.05)
            else:
                time.sleep(0.05)

    def _sync_state_from_rx(self, line: str) -> None:
        """Updates internal telemetry from incoming Arduino output."""
        if "OVERSIZED" in line:
            self.oversized_blocked += 1
            self.led_on = True
            self.buzzer_on = True
            self.lcd_line1 = "OVERSIZED INPUT "
            self.lcd_line2 = "Command Rejected"
        elif "Ready for verification" in line:
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "AEGIS-IoT HIL   "
            self.lcd_line2 = "Device Ready    "
        elif "Gate 01" in line:
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "GATE 01: SCAN   "
            self.lcd_line2 = "Scanning AST... "
        elif "Gate 02" in line and "Threat detected" in line:
            self.led_on = True
            self.buzzer_on = True
            self.lcd_line1 = "THREAT DETECTED "
            self.lcd_line2 = "ASan Crash Repro"
        elif "Gate 02" in line:
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "GATE 02: REPRO  "
            self.lcd_line2 = "ASan Crash Repro"
        elif "Gate 03" in line:
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "GATE 03: PATCH  "
            self.lcd_line2 = "Synthesizing... "
        elif "Gate 04" in line:
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "GATE 04: COMPILE"
            self.lcd_line2 = "Build Clean     "
        elif "Gate 05" in line:
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "GATE 05: CLEAN  "
            self.lcd_line2 = "Replay Clean OK "
        elif "Gate 06" in line or "STAGE 6" in line:
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "STAGE 6: GUARDS "
            self.lcd_line2 = "AntiCheat Check "
        elif "VERIFIED FOR TESTED CASES" in line:
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "VERIFIED PASS   "
            self.lcd_line2 = "MCU Budget OK   "
        elif "REJECTED BY GUARDS" in line:
            self.led_on = True
            self.buzzer_on = True
            self.lcd_line1 = "PATCH REJECTED  "
            self.lcd_line2 = "Guard Blocked!  "
        elif "flood rate-limit" in line:
            self.floods_blocked += 1
            self.led_on = True
            self.buzzer_on = True
            self.lcd_line1 = "FLOOD DETECTED  "
            self.lcd_line2 = "Rate Limited    "

    def _append_log(self, direction: str, text: str) -> None:
        self.serial_log.append({
            "direction": direction,
            "text": text,
            "timestamp": time.time(),
        })
        if len(self.serial_log) > 120:
            self.serial_log.pop(0)

    def _check_rate_limit(self) -> bool:
        now = time.time()
        self.command_timestamps = [t for t in self.command_timestamps if (now - t) < self.rate_limit_window]
        self.command_timestamps.append(now)
        return len(self.command_timestamps) > self.rate_limit_max

    def send_command(self, cmd_input: str, is_ladder_dispatch: bool = False) -> Dict[str, Any]:
        """
        Non-blocking thread-safe command dispatcher.
        Immediately updates mirrored state in < 1ms and writes to physical serial without stalling.
        """
        with self.lock:
            self.total_commands += 1

            if cmd_input.strip() == "OVERSIZED_TEST":
                raw_payload = "A" * 64
                display_cmd = "OVERSIZED_TEST (64-Byte Buffer Attack: 'A'*64)"
            elif cmd_input.strip() == "FLOOD_TEST":
                return self._simulate_flood_burst()
            else:
                raw_payload = cmd_input.strip()
                display_cmd = raw_payload

            self._append_log("TX", display_cmd)

            # Instantaneous state update for zero latency
            self._update_state_for_command(raw_payload, is_ladder_dispatch)

            # Non-blocking write to physical hardware if connected
            if self.serial_conn and self.serial_conn.is_open:
                try:
                    to_send = (raw_payload + "\n").encode("utf-8", errors="replace")
                    self.serial_conn.write(to_send)
                    self.serial_conn.flush()
                except Exception as e:
                    self._append_log("SYS", f"Serial write warning: {str(e)}")

            # Determine immediate RX response lines for API caller
            rx_lines = []
            if len(raw_payload) > self.specs["max_cmd_len"]:
                rx_lines = [
                    "SECURITY ALERT!",
                    "Oversized input detected.",
                    "Command safely rejected.",
                    "[HIL-DEFENSE] Buffer bound enforced: char commandBuffer[32].",
                ]
            elif not (self.serial_conn and self.serial_conn.is_open):
                rx_lines = self._generate_digital_twin_rx(raw_payload, is_ladder_dispatch)
            else:
                # Wait briefly (40ms) for MCU serial stream response
                time.sleep(0.04)
                recent_rx = [entry["text"] for entry in self.serial_log[-5:] if entry["direction"] == "RX"]
                rx_lines = recent_rx if recent_rx else self._generate_digital_twin_rx(raw_payload, is_ladder_dispatch)

            return {
                "mode": "PHYSICAL_HARDWARE" if (self.serial_conn and self.serial_conn.is_open) else "DIGITAL_TWIN_MIRROR",
                "port": self.active_port or "EMULATED_COM_PORT (ATmega328P)",
                "command": display_cmd,
                "rx_lines": rx_lines,
                "status": self.get_status(),
            }

    def _update_state_for_command(self, payload: str, is_ladder_dispatch: bool) -> None:
        """Immediately sets lockstep hardware indicators in < 1ms."""
        # 1. Oversized payload
        if len(payload) > self.specs["max_cmd_len"]:
            self.oversized_blocked += 1
            self.led_on = True
            self.buzzer_on = True
            self.lcd_line1 = "OVERSIZED INPUT "
            self.lcd_line2 = "Command Rejected"
            return

        # 2. Flood rate-limit check (for user commands)
        if not is_ladder_dispatch and self._check_rate_limit():
            self.floods_blocked += 1
            self.led_on = True
            self.buzzer_on = True
            self.lcd_line1 = "FLOOD DETECTED  "
            self.lcd_line2 = "Rate Limited    "
            return

        # 3. Known commands
        cmd = payload.upper()
        if cmd == "READY":
            self.invalid_count = 0
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "AEGIS-IoT HIL   "
            self.lcd_line2 = "Device Ready    "
        elif cmd == "SCAN":
            self.invalid_count = 0
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "GATE 01: SCAN   "
            self.lcd_line2 = "Scanning AST... "
        elif cmd == "REPRO":
            self.invalid_count = 0
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "GATE 02: REPRO  "
            self.lcd_line2 = "ASan Crash Repro"
        elif cmd == "THREAT":
            self.invalid_count = 0
            self.led_on = True
            self.buzzer_on = True  # Threat reproduction confirms bug: Red LED + Active Buzzer ON
            self.lcd_line1 = "THREAT DETECTED "
            self.lcd_line2 = "ASan Crash Repro"
        elif cmd == "PATCH":
            self.invalid_count = 0
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "GATE 03: PATCH  "
            self.lcd_line2 = "Synthesizing... "
        elif cmd == "COMPILE":
            self.invalid_count = 0
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "GATE 04: COMPILE"
            self.lcd_line2 = "Build Clean     "
        elif cmd == "CLEAN":
            self.invalid_count = 0
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "GATE 05: CLEAN  "
            self.lcd_line2 = "Replay Clean OK "
        elif cmd == "GUARDS":
            self.invalid_count = 0
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "STAGE 6: GUARDS "
            self.lcd_line2 = "AntiCheat Check "
        elif cmd == "PASS":
            self.invalid_count = 0
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "VERIFIED PASS   "
            self.lcd_line2 = "MCU Budget OK   "
        elif cmd == "FAIL":
            self.invalid_count = 0
            self.led_on = True
            self.buzzer_on = True
            self.lcd_line1 = "PATCH REJECTED  "
            self.lcd_line2 = "Guard Blocked!  "
        elif cmd == "STATUS":
            pass
        else:
            self.invalid_count += 1
            if self.invalid_count >= self.max_invalid_attempts:
                self.brute_force_alerts += 1
                self.led_on = True
                self.buzzer_on = False
                self.lcd_line1 = "BRUTE FORCE     "
                self.lcd_line2 = "Alert Triggered "
            else:
                self.lcd_line1 = "INVALID COMMAND "
                self.lcd_line2 = (payload[:16]).ljust(16)

    def _generate_digital_twin_rx(self, payload: str, is_ladder_dispatch: bool) -> List[str]:
        """Generates digital twin mirror responses."""
        if len(payload) > self.specs["max_cmd_len"]:
            lines = [
                "SECURITY ALERT!",
                "Oversized input detected.",
                "Command safely rejected.",
                "[HIL-DEFENSE] Buffer bound enforced: char commandBuffer[32].",
            ]
        elif not is_ladder_dispatch and len(self.command_timestamps) > self.rate_limit_max:
            lines = [
                "SECURITY ALERT!",
                "Command flood rate-limit exceeded.",
                "Throttling serial reception for 1500ms.",
            ]
        else:
            cmd = payload.upper()
            responses = {
                "READY": ["[MCU-STATUS] Ready for verification ladder.", "[PERIPHERALS] LCD: Active | LED: OFF | Buzzer: OFF"],
                "SCAN": ["[MCU-STATUS] Gate 01: AST syntax tree scan initiated."],
                "REPRO": ["[MCU-STATUS] Gate 02: Memory crash reproduced in sandbox."],
                "THREAT": ["[MCU-STATUS] Gate 02: Memory breach confirmed by AddressSanitizer.", "[ALERT] Red warning LED active. Threat detected."],
                "PATCH": ["[MCU-STATUS] Gate 03: Neural patch synthesis in progress."],
                "COMPILE": ["[MCU-STATUS] Gate 04: GCC compiler verified zero errors."],
                "CLEAN": ["[MCU-STATUS] Gate 05: Crash input replayed cleanly on patch."],
                "GUARDS": ["[MCU-STATUS] Gate 06: Deterministic anti-cheat guards passed."],
                "PASS": ["[MCU-STATUS] Verdict: VERIFIED FOR TESTED CASES.", "[INTEGRITY] Flash & SRAM delta within ATmega328P budget."],
                "FAIL": ["[MCU-STATUS] Verdict: REJECTED BY GUARDS.", "[CRITICAL] Untrusted patch refused execution."],
                "STATUS": [
                    "[MCU-INFO] Microchip ATmega328P @ 16 MHz.",
                    "[MEMORY] Flash: 32 KB | SRAM: 2048 B | EEPROM: 1024 B.",
                    "[BUFFER] Command Buffer Capacity: 32 Bytes (Protected).",
                    f"[STATE] Invalid Count: {self.invalid_count} | LED: {'ON' if self.led_on else 'OFF'}",
                ],
            }
            lines = responses.get(cmd, [f"[MCU-WARN] Unknown command '{payload}'. Invalid count: {self.invalid_count}"])

        for l in lines:
            self._append_log("RX", l)
        return lines

    def _simulate_flood_burst(self) -> Dict[str, Any]:
        """Simulates rapid consecutive commands to verify rate-limiting defense."""
        with self.lock:
            for i in range(4):
                self.command_timestamps.append(time.time())
                self._append_log("TX", f"BURST_PING_{i+1}")
            self.floods_blocked += 1
            self.led_on = True
            self.buzzer_on = True
            self.lcd_line1 = "FLOOD DETECTED  "
            self.lcd_line2 = "Rate Limited    "
            self._append_log("TX", "BURST_PING_5")
            rx_lines = [
                "SECURITY ALERT!",
                "Command flood rate-limit exceeded.",
                "Throttling serial reception for 1500ms.",
            ]
            for l in rx_lines:
                self._append_log("RX", l)
            return {
                "mode": "PHYSICAL_HARDWARE" if (self.serial_conn and self.serial_conn.is_open) else "DIGITAL_TWIN_MIRROR",
                "port": self.active_port or "EMULATED_COM_PORT (ATmega328P)",
                "command": "FLOOD_TEST",
                "rx_lines": rx_lines,
                "status": self.get_status(),
            }

    def dispatch_ladder_stage(self, stage_identifier: str) -> None:
        """
        Non-blocking lockstep dispatch from verification ladder:
        - Stage 1 Finding -> SCAN
        - Stage 2 Repro   -> REPRO (calm progress update on LCD, LED=OFF, Buzzer=OFF)
        - Stage 3 Patch   -> PATCH
        - Stage 4 Compile -> COMPILE
        - Stage 5 Clean   -> CLEAN
        - Stage 6 Guards  -> GUARDS
        - Stage 7 Verdict -> PASS (silent clean pass) or FAIL (alarm active)
        """
        s = str(stage_identifier).upper()
        if "REJECTED" in s or "FAIL" in s:
            self.send_command("FAIL", is_ladder_dispatch=True)
        elif "STAGE_1" in s or "FINDING" in s:
            self.send_command("SCAN", is_ladder_dispatch=True)
        elif "STAGE_2" in s or "REPRODUCED" in s:
            self.send_command("REPRO", is_ladder_dispatch=True)
        elif "STAGE_3" in s or "PATCH" in s:
            self.send_command("PATCH", is_ladder_dispatch=True)
        elif "STAGE_4" in s or "COMPILES" in s:
            self.send_command("COMPILE", is_ladder_dispatch=True)
        elif "STAGE_5" in s or "CRASH_INPUT_CLEAN" in s or "CLEAN" in s:
            self.send_command("CLEAN", is_ladder_dispatch=True)
        elif "STAGE_6" in s or "GUARDS" in s:
            self.send_command("GUARDS", is_ladder_dispatch=True)
        elif "VERIFIED" in s or "PASS" in s or "STAGE_7" in s:
            self.send_command("PASS", is_ladder_dispatch=True)

    def get_status(self) -> Dict[str, Any]:
        """Returns instantaneous runtime state of the hardware node."""
        is_physical = bool(self.serial_conn and self.serial_conn.is_open)
        return {
            "connected": is_physical,
            "mode": "PHYSICAL_HARDWARE" if is_physical else "DIGITAL_TWIN_MIRROR",
            "port": self.active_port if is_physical else "EMULATED_COM_PORT (ATmega328P)",
            "port_error": self.port_error,
            "available_ports": self.list_ports(),
            "baudrate": self.baudrate,
            "mcu": self.mcu,
            "specs": self.specs,
            "kit": self.kit,
            "peripherals": self.peripherals,
            "lcd_line1": self.lcd_line1,
            "lcd_line2": self.lcd_line2,
            "led_on": self.led_on,
            "buzzer_on": self.buzzer_on,
            "invalid_command_count": self.invalid_count,
            "metrics": {
                "total_commands": self.total_commands,
                "oversized_blocked": self.oversized_blocked,
                "floods_blocked": self.floods_blocked,
                "brute_force_alerts": self.brute_force_alerts,
            },
            "recent_logs": self.serial_log[-35:],
        }


# Singleton Instance
hardware_bridge = HardwareBridge()
