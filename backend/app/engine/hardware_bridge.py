# filepath: backend/app/engine/hardware_bridge.py
"""
AEGIS-IoT Hardware-in-the-Loop (HIL) Bridge & Digital Twin Mirror.
Target MCU: Microchip ATmega328P (8-bit AVR @ 16 MHz) on Indeyes IoT Trainer Kit.
Peripherals: 16x2 Character LCD, Red Warning LED (Pin 8), Active Buzzer (Pin 9).
Baudrate: 9600 Baud (Newline '\n' terminated).

Design Axiom:
- If physical Arduino UNO is connected via USB Serial, communicates directly with hardware.
- If physical device is disconnected, seamlessly falls back to Hardware Digital Twin Mirror,
  guaranteeing zero crashed requests or UI freezes while preserving identical logic and telemetry.
"""

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
    Manages physical USB Serial communication with Arduino UNO ATmega328P node
    and provides a high-fidelity Digital Twin Mirror fallback.
    """

    def __init__(self):
        self.lock = threading.Lock()
        self.serial_conn: Optional[Any] = None
        self.active_port: Optional[str] = None
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

        # Timestamped circular serial log (max 120 lines)
        self.serial_log: List[Dict[str, Any]] = [
            {
                "direction": "SYS",
                "text": "AEGIS-IoT Hardware Bridge initialized. Ready for ATmega328P node.",
                "timestamp": time.time(),
            }
        ]

        # Auto-detect on startup
        self.auto_connect()

    def list_ports(self) -> List[Dict[str, str]]:
        """Enumerates connected USB/COM serial ports."""
        if not SERIAL_AVAILABLE or serial is None:
            return []
        try:
            ports = []
            for p in serial.tools.list_ports.comports():
                ports.append({
                    "device": p.device,
                    "description": p.description or "Serial Device",
                    "hwid": p.hwid or "",
                })
            return ports
        except Exception:
            return []

    def auto_connect(self) -> bool:
        """Attempts to discover and connect to an Arduino / USB-Serial device."""
        if not SERIAL_AVAILABLE or serial is None:
            return False

        ports = self.list_ports()
        for p in ports:
            desc = p["description"].lower()
            dev = p["device"]
            # Look for common Arduino USB identifiers (CH340, FTDI, CP210x, Arduino)
            if any(k in desc for k in ["arduino", "ch340", "ftdi", "cp210", "usb-serial"]):
                if self.connect(dev):
                    return True

        # If none matched by keyword, try first available port if present
        if ports and not self.serial_conn:
            return self.connect(ports[0]["device"])

        return False

    def connect(self, port_name: str) -> bool:
        """Opens serial connection to the designated COM/tty port."""
        if not SERIAL_AVAILABLE or serial is None:
            return False

        with self.lock:
            try:
                if self.serial_conn and self.serial_conn.is_open:
                    self.serial_conn.close()

                self.serial_conn = serial.Serial(
                    port=port_name,
                    baudrate=self.baudrate,
                    timeout=0.6,
                    write_timeout=0.6,
                )
                self.active_port = port_name
                time.sleep(1.8)  # Allow Arduino DTR auto-reset settling time
                self._append_log("SYS", f"Physical USB Serial connected to {port_name} @ {self.baudrate} baud.")
                return True
            except Exception as e:
                self.serial_conn = None
                self._append_log("SYS", f"Could not connect to {port_name}: {str(e)}. Operating via Digital Twin.")
                return False

    def disconnect(self) -> None:
        """Closes physical serial connection."""
        with self.lock:
            if self.serial_conn and self.serial_conn.is_open:
                try:
                    self.serial_conn.close()
                except Exception:
                    pass
            self.serial_conn = None
            self.active_port = None
            self._append_log("SYS", "Disconnected from physical serial port. Switched to Digital Twin Mirror.")

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
        Transmits a command to the physical Arduino UNO or processes it
        via the Digital Twin Mirror simulation.
        Special keyword: 'OVERSIZED_TEST' automatically expands to 64 bytes of 'A'.
        """
        with self.lock:
            self.total_commands += 1

            # Resolve actual payload
            if cmd_input.strip() == "OVERSIZED_TEST":
                raw_payload = "A" * 64
                display_cmd = "OVERSIZED_TEST (64-Byte Buffer Attack: 'A'*64)"
            elif cmd_input.strip() == "FLOOD_TEST":
                # Simulated flood of 6 commands
                return self._simulate_flood_burst()
            else:
                raw_payload = cmd_input.strip()
                display_cmd = raw_payload

            self._append_log("TX", display_cmd)

            # Check if physical connection is active
            if self.serial_conn and self.serial_conn.is_open:
                try:
                    return self._send_to_physical_hardware(raw_payload, display_cmd)
                except Exception as e:
                    self._append_log("SYS", f"Physical serial error: {str(e)}. Falling back to Digital Twin.")
                    self.serial_conn = None

            # Fallback / Default: Execute via Digital Twin Mirror
            return self._execute_digital_twin(raw_payload, display_cmd, is_ladder_dispatch=is_ladder_dispatch)

    def _send_to_physical_hardware(self, payload: str, display_cmd: str) -> Dict[str, Any]:
        """Sends bytes directly to physical Arduino over USB Serial."""
        to_send = (payload + "\n").encode("utf-8", errors="replace")
        self.serial_conn.write(to_send)
        self.serial_conn.flush()

        time.sleep(0.12)
        rx_lines = []
        while self.serial_conn.in_waiting > 0:
            line = self.serial_conn.readline().decode("utf-8", errors="ignore").strip()
            if line:
                rx_lines.append(line)
                self._append_log("RX", line)

        # Update mirrored state from responses
        for line in rx_lines:
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
                self.lcd_line2 = "AST Triage...   "
            elif "Gate 02" in line or "Threat detected" in line:
                self.led_on = True
                self.buzzer_on = False
                self.lcd_line1 = "GATE 02: THREAT "
                self.lcd_line2 = "ASan Crash Repro"
            elif "Gate 03" in line:
                self.led_on = False
                self.buzzer_on = False
                self.lcd_line1 = "GATE 03: PATCH  "
                self.lcd_line2 = "Synthesizing... "
            elif "VERIFIED FOR TESTED CASES" in line:
                self.led_on = False
                self.buzzer_on = False
                self.lcd_line1 = "VERIFIED PASS   "
                self.lcd_line2 = "Tested Cases OK "
            elif "REJECTED BY GUARDS" in line:
                self.led_on = True
                self.buzzer_on = True
                self.lcd_line1 = "VERIFY REJECTED "
                self.lcd_line2 = "Guard Blocked   "
            elif "flood rate-limit" in line:
                self.floods_blocked += 1
                self.led_on = True
                self.buzzer_on = True
                self.lcd_line1 = "FLOOD DETECTED  "
                self.lcd_line2 = "Rate Limited    "

        return {
            "mode": "PHYSICAL_HARDWARE",
            "port": self.active_port,
            "command": display_cmd,
            "rx_lines": rx_lines,
            "status": self.get_status(),
        }

    def _execute_digital_twin(self, payload: str, display_cmd: str, is_ladder_dispatch: bool = False) -> Dict[str, Any]:
        """Faithfully mirrors the firmware logic of hardware/aegis_uno_hil/aegis_uno_hil.ino."""
        rx_lines = []

        # 1. Hardware Oversized Input Buffer Overflow Protection
        # ATmega328P commandBuffer has capacity 32 (MAX_COMMAND_LENGTH = 31).
        if len(payload) > self.specs["max_cmd_len"]:
            self.oversized_blocked += 1
            self.led_on = True
            self.buzzer_on = True
            self.lcd_line1 = "OVERSIZED INPUT "
            self.lcd_line2 = "Command Rejected"
            rx_lines = [
                "SECURITY ALERT!",
                "Oversized input detected.",
                "Command safely rejected.",
                "[HIL-DEFENSE] Buffer bound enforced: char commandBuffer[32].",
                f"[SRAM GUARD] Input payload was {len(payload)} bytes (> 31 byte limit). Zero heap/stack corruption.",
            ]
            for line in rx_lines:
                self._append_log("RX", line)

            return {
                "mode": "DIGITAL_TWIN_MIRROR",
                "port": "EMULATED_COM_PORT (ATmega328P)",
                "command": display_cmd,
                "rx_lines": rx_lines,
                "status": self.get_status(),
            }

        # 2. Command Flood Rate-Limit Check (applicable to external inputs, not ladder internal transitions)
        if not is_ladder_dispatch and self._check_rate_limit():
            self.floods_blocked += 1
            self.led_on = True
            self.buzzer_on = True
            self.lcd_line1 = "FLOOD DETECTED  "
            self.lcd_line2 = "Rate Limited    "
            rx_lines = [
                "SECURITY ALERT!",
                "Command flood rate-limit exceeded.",
                "Throttling serial reception for 1500ms.",
            ]
            for line in rx_lines:
                self._append_log("RX", line)
            return {
                "mode": "DIGITAL_TWIN_MIRROR",
                "port": "EMULATED_COM_PORT (ATmega328P)",
                "command": display_cmd,
                "rx_lines": rx_lines,
                "status": self.get_status(),
            }

        # 3. Lifecycle Commands
        cmd = payload.upper()
        if cmd == "READY":
            self.invalid_count = 0
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "AEGIS-IoT HIL   "
            self.lcd_line2 = "Device Ready    "
            rx_lines = [
                "[MCU-STATUS] Ready for verification ladder.",
                "[PERIPHERALS] LCD: Active | LED: OFF | Buzzer: OFF",
            ]
        elif cmd == "SCAN":
            self.invalid_count = 0
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "GATE 01: SCAN   "
            self.lcd_line2 = "AST Triage...   "
            rx_lines = [
                "[MCU-STATUS] Gate 01: AST syntax tree scan initiated.",
            ]
        elif cmd == "THREAT":
            self.invalid_count = 0
            self.led_on = True
            self.buzzer_on = False  # Buzzer alarmed momentarily, Red LED persists
            self.lcd_line1 = "GATE 02: THREAT "
            self.lcd_line2 = "ASan Crash Repro"
            rx_lines = [
                "[MCU-STATUS] Gate 02: Memory breach confirmed by AddressSanitizer.",
                "[ALERT] Red warning LED active. Threat detected.",
            ]
        elif cmd == "PATCH":
            self.invalid_count = 0
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "GATE 03: PATCH  "
            self.lcd_line2 = "Synthesizing... "
            rx_lines = [
                "[MCU-STATUS] Gate 03: Neural patch synthesis in progress.",
            ]
        elif cmd == "PASS":
            self.invalid_count = 0
            self.led_on = False
            self.buzzer_on = False
            self.lcd_line1 = "VERIFIED PASS   "
            self.lcd_line2 = "Tested Cases OK "
            rx_lines = [
                "[MCU-STATUS] Verdict: VERIFIED FOR TESTED CASES.",
                "[INTEGRITY] Flash & SRAM delta within ATmega328P budget.",
            ]
        elif cmd == "FAIL":
            self.invalid_count = 0
            self.led_on = True
            self.buzzer_on = True
            self.lcd_line1 = "VERIFY REJECTED "
            self.lcd_line2 = "Guard Blocked   "
            rx_lines = [
                "[MCU-STATUS] Verdict: REJECTED BY GUARDS.",
                "[CRITICAL] Untrusted patch refused execution.",
            ]
        elif cmd == "STATUS":
            rx_lines = [
                "[MCU-INFO] Microchip ATmega328P @ 16 MHz.",
                "[MEMORY] Flash: 32 KB | SRAM: 2048 B | EEPROM: 1024 B.",
                "[BUFFER] Command Buffer Capacity: 32 Bytes (Protected).",
                f"[STATE] Invalid Count: {self.invalid_count} | LED: {'ON' if self.led_on else 'OFF'}",
            ]
        else:
            # Unknown command
            self.invalid_count += 1
            if self.invalid_count >= self.max_invalid_attempts:
                self.brute_force_alerts += 1
                self.led_on = True
                self.buzzer_on = False
                self.lcd_line1 = "BRUTE FORCE     "
                self.lcd_line2 = "Alert Triggered "
                rx_lines = [
                    "SECURITY ALERT!",
                    "Repeated invalid command sequence detected.",
                    "Hardware lockout threshold reached (>=3 attempts).",
                ]
            else:
                self.lcd_line1 = "INVALID COMMAND "
                self.lcd_line2 = (payload[:16]).ljust(16)
                rx_lines = [
                    f"[MCU-WARN] Unknown command '{payload}'. Invalid count: {self.invalid_count}",
                ]

        for line in rx_lines:
            self._append_log("RX", line)

        return {
            "mode": "DIGITAL_TWIN_MIRROR",
            "port": "EMULATED_COM_PORT (ATmega328P)",
            "command": display_cmd,
            "rx_lines": rx_lines,
            "status": self.get_status(),
        }

    def _simulate_flood_burst(self) -> Dict[str, Any]:
        """Simulates rapid consecutive commands to verify rate-limiting defense."""
        for i in range(4):
            self.command_timestamps.append(time.time())
            self._append_log("TX", f"BURST_PING_{i+1}")
        return self._execute_digital_twin("BURST_PING_5", "FLOOD_BURST_STORM")

    def dispatch_ladder_stage(self, stage_identifier: str) -> None:
        """
        Synchronously communicates verification ladder transitions to the MCU:
        - Stage 1 Finding -> SCAN
        - Stage 2 Repro   -> THREAT
        - Stage 3 Patch   -> PATCH
        - Stage 5 Clean   -> OVERSIZED_TEST (verifies buffer limits)
        - Stage 7 Verdict -> PASS or FAIL
        """
        s = str(stage_identifier).upper()
        if "STAGE_1" in s or "FINDING" in s:
            self.send_command("SCAN", is_ladder_dispatch=True)
        elif "STAGE_2" in s or "REPRODUCED" in s:
            self.send_command("THREAT", is_ladder_dispatch=True)
        elif "STAGE_3" in s or "PATCH" in s:
            self.send_command("PATCH", is_ladder_dispatch=True)
        elif "STAGE_5" in s or "CRASH_INPUT_CLEAN" in s:
            # Stage 5 passes clean: demonstrate that the hardware buffer guard holds!
            self.send_command("OVERSIZED_TEST", is_ladder_dispatch=True)
        elif "VERIFIED" in s or "PASS" in s or "STAGE_7" in s:
            self.send_command("PASS", is_ladder_dispatch=True)
        elif "REJECTED" in s or "FAIL" in s:
            self.send_command("FAIL", is_ladder_dispatch=True)

    def get_status(self) -> Dict[str, Any]:
        """Returns the full runtime state of the physical / digital twin hardware node."""
        is_physical = bool(self.serial_conn and self.serial_conn.is_open)
        available_ports = self.list_ports()

        return {
            "connected": is_physical,
            "mode": "PHYSICAL_HARDWARE" if is_physical else "DIGITAL_TWIN_MIRROR",
            "port": self.active_port if is_physical else "EMULATED_COM_PORT (ATmega328P)",
            "available_ports": available_ports,
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
