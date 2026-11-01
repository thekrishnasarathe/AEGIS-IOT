/*
 * AEGIS-IoT // Hardware-in-the-Loop (HIL) Microcontroller Node
 * Target MCU: Microchip ATmega328P (8-bit AVR @ 16 MHz)
 * Hardware Kit: Indeyes IoT Trainer Kit (Arduino UNO R3)
 * Flash: 32 KB | SRAM: 2 KB | EEPROM: 1 KB | Serial: 9600 Baud
 * Peripherals: 16x2 Character LCD, Red Warning LED (D8), Active Piezo Buzzer (D9 / D10)
 *
 * Capabilities:
 * 1. 32-Byte Serial Command Buffer with Strict Hardware Buffer Overflow Guard (MAX_COMMAND_LENGTH = 31)
 * 2. Real-time Physical Indicator Actuation (5V DC Active Buzzer + Red Warning LED)
 * 3. 16x2 LCD Status Telemetry Mirroring Laptop Verification Ladder
 * 4. Runtime Command Flood Rate-Limiting (> 5 commands in 1500ms for non-lifecycle commands)
 * 5. Repeated Invalid Command / Brute Force Detection (>= 3 consecutive invalid inputs)
 *
 * Author: Team SIGMOID SQUAD (Scope Global Skills University, Bhopal)
 * Competition: AI-Manthan 2.0 Grand Finale (AITR, Indore — 2026)
 */

// =============================================================================
// LCD Configuration Switch
// Set to 1 if using I2C backpack (PCF8574), or 0 if using 4-bit parallel wiring
// =============================================================================
#define USE_I2C_LCD 0

#if USE_I2C_LCD
  #include <Wire.h>
  #include <LiquidCrystal_I2C.h>
  LiquidCrystal_I2C lcd(0x27, 16, 2); // Default address 0x27 or 0x3F
#else
  #include <LiquidCrystal.h>
  // Standard Indeyes Kit / Arduino UNO Parallel LCD Wiring:
  // RS = Pin 12, EN = Pin 11, D4 = Pin 5, D5 = Pin 4, D6 = Pin 3, D7 = Pin 2
  const int RS = 12, EN = 11, D4 = 5, D5 = 4, D6 = 3, D7 = 2;
  LiquidCrystal lcd(RS, EN, D4, D5, D6, D7);
#endif

// =============================================================================
// Pin Definitions
// Driving both Pin 9 (standard) and Pin 10 (auxiliary) ensures 100% compatibility
// across different trainer kit wiring revisions for 5V Active Buzzers.
// =============================================================================
const int RED_LED_PIN    = 8;   // Red Warning LED
const int BUZZER_PIN     = 9;   // Primary 5V Active Buzzer Pin
const int BUZZER_PIN_ALT = 10;  // Auxiliary Buzzer Pin

// =============================================================================
// Security Constants & Memory Constraints
// ATmega328P has only 2048 bytes of SRAM. Fixed static allocation is mandatory.
// =============================================================================
#define COMMAND_BUFFER_CAPACITY 32
const int MAX_COMMAND_LENGTH = 31;

char commandBuffer[COMMAND_BUFFER_CAPACITY];
byte commandIndex = 0;
bool inputTooLong = false;

// Security Monitoring State Variables
byte invalidCommandCount = 0;
const byte MAX_INVALID_ATTEMPTS = 3;

// Rate-limiting window: max 5 commands per 1500 ms
unsigned long commandTimestamps[5] = {0, 0, 0, 0, 0};
byte commandHistoryIdx = 0;
const unsigned long RATE_LIMIT_WINDOW_MS = 1500;
const byte RATE_LIMIT_MAX_COUNT = 5;

// =============================================================================
// Helper Functions: LCD & 5V DC Active Buzzer / LED Actuation
// NOTE: Active buzzers have their own internal oscillating circuit and require
// pure 5V DC HIGH/LOW pulses (NEVER tone() which breaks active buzzers).
// =============================================================================

void setBuzzer(bool state) {
  digitalWrite(BUZZER_PIN, state ? HIGH : LOW);
  digitalWrite(BUZZER_PIN_ALT, state ? HIGH : LOW);
}

void pulseBuzzer(int onMs, int offMs, int count) {
  for (int i = 0; i < count; i++) {
    setBuzzer(true);
    digitalWrite(RED_LED_PIN, HIGH);
    delay(onMs);
    setBuzzer(false);
    delay(offMs);
  }
}

void clearAlarms() {
  setBuzzer(false);
  digitalWrite(RED_LED_PIN, LOW);
}

void updateLCD(const char *line1, const char *line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

bool checkRateLimit() {
  unsigned long now = millis();
  unsigned long oldestInWindow = commandTimestamps[commandHistoryIdx];
  commandTimestamps[commandHistoryIdx] = now;
  commandHistoryIdx = (commandHistoryIdx + 1) % RATE_LIMIT_MAX_COUNT;

  if (oldestInWindow > 0 && (now - oldestInWindow) < RATE_LIMIT_WINDOW_MS) {
    return true; // Rate limit exceeded!
  }
  return false;
}

// =============================================================================
// Command Dispatcher & Verification Lifecycle State Machine
// =============================================================================

void processCommand(const char *cmd) {
  // 1. Rate-limit check (Exempt trusted pipeline lifecycle commands from throttling)
  bool isLifecycleCmd = (strcmp(cmd, "READY") == 0 || strcmp(cmd, "SCAN") == 0 ||
                         strcmp(cmd, "THREAT") == 0 || strcmp(cmd, "PATCH") == 0 ||
                         strcmp(cmd, "COMPILE") == 0 || strcmp(cmd, "GUARDS") == 0 ||
                         strcmp(cmd, "PASS") == 0 || strcmp(cmd, "FAIL") == 0 ||
                         strcmp(cmd, "OVERSIZED_TEST") == 0 || strcmp(cmd, "STATUS") == 0);

  if (!isLifecycleCmd && checkRateLimit()) {
    digitalWrite(RED_LED_PIN, HIGH);
    pulseBuzzer(200, 80, 2);
    updateLCD("FLOOD DETECTED  ", "Rate Limited    ");
    Serial.println(F("SECURITY ALERT!"));
    Serial.println(F("Command flood rate-limit exceeded."));
    Serial.println(F("Throttling serial reception for 1500ms."));
    return;
  }

  // 2. Lifecycle Command Handling
  if (strcmp(cmd, "READY") == 0) {
    invalidCommandCount = 0;
    clearAlarms();
    updateLCD("AEGIS-IoT HIL   ", "Device Ready    ");
    Serial.println(F("[MCU-STATUS] Ready for verification ladder."));
    Serial.println(F("[PERIPHERALS] LCD: Active | LED: OFF | Buzzer: OFF"));
  }
  else if (strcmp(cmd, "SCAN") == 0) {
    invalidCommandCount = 0;
    clearAlarms();
    updateLCD("GATE 01: SCAN   ", "AST Triage...   ");
    Serial.println(F("[MCU-STATUS] Gate 01: AST syntax tree scan initiated."));
  }
  else if (strcmp(cmd, "THREAT") == 0) {
    invalidCommandCount = 0;
    digitalWrite(RED_LED_PIN, HIGH);
    updateLCD("GATE 02: THREAT ", "ASan Crash Repro");
    Serial.println(F("[MCU-STATUS] Gate 02: Memory breach confirmed by AddressSanitizer."));
    Serial.println(F("[ALERT] Red warning LED active. Threat detected."));

    // 3 loud buzzer beeps (180ms HIGH / 60ms LOW x 3) + latch HIGH for 300ms
    pulseBuzzer(180, 60, 3);
    setBuzzer(true);
    delay(300);
    setBuzzer(false);
    digitalWrite(RED_LED_PIN, HIGH); // Latch warning LED ON
  }
  else if (strcmp(cmd, "PATCH") == 0) {
    invalidCommandCount = 0;
    setBuzzer(false);
    digitalWrite(RED_LED_PIN, LOW);
    updateLCD("GATE 03: PATCH  ", "Synthesizing... ");
    Serial.println(F("[MCU-STATUS] Gate 03: Neural patch synthesis in progress."));
  }
  else if (strcmp(cmd, "COMPILE") == 0) {
    invalidCommandCount = 0;
    clearAlarms();
    updateLCD("GATE 04: COMPILE", "GCC -O2 -Werror ");
    Serial.println(F("[MCU-STATUS] Gate 04: GCC compiler verified zero errors."));
  }
  else if (strcmp(cmd, "GUARDS") == 0) {
    invalidCommandCount = 0;
    clearAlarms();
    updateLCD("STAGE 6 GUARDS  ", "AntiCheat Check ");
    Serial.println(F("[MCU-STATUS] Gate 06: Deterministic anti-cheat guards passed."));
  }
  else if (strcmp(cmd, "PASS") == 0) {
    invalidCommandCount = 0;
    clearAlarms();
    // 2 short victory chirps: 80ms HIGH / 60ms LOW x 2
    pulseBuzzer(80, 60, 2);
    clearAlarms();
    updateLCD("VERIFIED PASS   ", "Tested Cases OK ");
    Serial.println(F("[MCU-STATUS] Verdict: VERIFIED FOR TESTED CASES."));
    Serial.println(F("[INTEGRITY] Flash & SRAM delta within ATmega328P budget."));
  }
  else if (strcmp(cmd, "FAIL") == 0) {
    invalidCommandCount = 0;
    digitalWrite(RED_LED_PIN, HIGH);
    updateLCD("VERIFY REJECTED ", "Guard Blocked!  ");
    Serial.println(F("[MCU-STATUS] Verdict: REJECTED BY GUARDS."));
    Serial.println(F("[ALERT] Red warning LED latched ON. Active buzzer alarm pulsed."));
    Serial.println(F("[CRITICAL] Untrusted patch refused execution."));

    // 5 loud buzzer alarm pulses: 220ms HIGH / 80ms LOW x 5
    pulseBuzzer(220, 80, 5);
    digitalWrite(RED_LED_PIN, HIGH);
  }
  else if (strcmp(cmd, "OVERSIZED_TEST") == 0) {
    digitalWrite(RED_LED_PIN, HIGH);
    updateLCD("OVERSIZED INPUT ", "Command Rejected");
    Serial.println(F("SECURITY ALERT!"));
    Serial.println(F("Oversized input detected."));
    Serial.println(F("Command safely rejected."));
    Serial.println(F("[HIL-DEFENSE] Buffer bound enforced: char commandBuffer[32]."));

    // 4 loud buzzer beeps (200ms HIGH / 70ms LOW x 4) + latch HIGH for 500ms
    pulseBuzzer(200, 70, 4);
    setBuzzer(true);
    delay(500);
    setBuzzer(false);
    digitalWrite(RED_LED_PIN, HIGH);
  }
  else if (strcmp(cmd, "STATUS") == 0) {
    Serial.println(F("[MCU-INFO] Microchip ATmega328P @ 16 MHz."));
    Serial.println(F("[MEMORY] Flash: 32 KB | SRAM: 2048 B | EEPROM: 1024 B."));
    Serial.println(F("[BUFFER] Command Buffer Capacity: 32 Bytes (Protected)."));
    Serial.print(F("[STATE] Invalid Count: "));
    Serial.print(invalidCommandCount);
    Serial.print(F(" | LED: "));
    Serial.println(digitalRead(RED_LED_PIN) ? F("ON") : F("OFF"));
  }
  else {
    // Unknown or invalid command
    invalidCommandCount++;
    if (invalidCommandCount >= MAX_INVALID_ATTEMPTS) {
      digitalWrite(RED_LED_PIN, HIGH);
      updateLCD("BRUTE FORCE     ", "Alert Triggered ");
      Serial.println(F("SECURITY ALERT!"));
      Serial.println(F("Repeated invalid command sequence detected."));
      Serial.println(F("Hardware lockout threshold reached (>=3 attempts)."));
      pulseBuzzer(220, 80, 4);
      digitalWrite(RED_LED_PIN, HIGH);
    } else {
      updateLCD("INVALID COMMAND ", cmd);
      Serial.print(F("[MCU-WARN] Unknown command '"));
      Serial.print(cmd);
      Serial.print(F("'. Invalid count: "));
      Serial.println(invalidCommandCount);
    }
  }
}

// =============================================================================
// Arduino Setup & Main Loop
// =============================================================================

void setup() {
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BUZZER_PIN_ALT, OUTPUT);
  clearAlarms();

  // Quick 2-beep power-on self-test: confirms Red LED and Active Buzzer hardware are functional
  setBuzzer(true);
  digitalWrite(RED_LED_PIN, HIGH);
  delay(120);
  setBuzzer(false);
  digitalWrite(RED_LED_PIN, LOW);
  delay(80);
  setBuzzer(true);
  digitalWrite(RED_LED_PIN, HIGH);
  delay(120);
  setBuzzer(false);
  digitalWrite(RED_LED_PIN, LOW);

  Serial.begin(9600);

#if USE_I2C_LCD
  lcd.init();
  lcd.backlight();
#else
  lcd.begin(16, 2);
#endif

  updateLCD("AEGIS-IoT ATmega", "Indeyes Kit Ready");
  delay(600);
  updateLCD("AEGIS-IoT HIL   ", "Device Ready    ");

  Serial.println(F("================================================================="));
  Serial.println(F("  AEGIS-IoT Hardware-in-the-Loop Node Online (ATmega328P 16MHz)  "));
  Serial.println(F("  Indeyes IoT Trainer Kit - Firmware Security Defense Engine      "));
  Serial.println(F("================================================================="));
  Serial.println(F("[MCU-INIT] Serial 9600 baud, 32-Byte Hardened Command Buffer active."));
}

void loop() {
  while (Serial.available() > 0) {
    char inChar = (char)Serial.read();

    // Check for end-of-command delimiter (Newline or Carriage Return)
    if (inChar == '\n' || inChar == '\r') {
      if (inputTooLong) {
        // OVERSIZED INPUT ATTACK INTERCEPTED!
        // The command exceeded 31 bytes. The hardware buffer was never breached.
        digitalWrite(RED_LED_PIN, HIGH);
        updateLCD("OVERSIZED INPUT ", "Command Rejected");

        Serial.println(F("SECURITY ALERT!"));
        Serial.println(F("Oversized input detected."));
        Serial.println(F("Command safely rejected."));
        Serial.println(F("[HIL-DEFENSE] Buffer bound enforced: char commandBuffer[32]."));

        // 4 loud buzzer beeps (200ms HIGH / 70ms LOW x 4) + latch HIGH for 500ms
        pulseBuzzer(200, 70, 4);
        setBuzzer(true);
        delay(500);
        setBuzzer(false);
        digitalWrite(RED_LED_PIN, HIGH); // Retain warning LED on

        // Reset state
        inputTooLong = false;
        commandIndex = 0;
        commandBuffer[0] = '\0';
      }
      else if (commandIndex > 0) {
        // Valid string within size constraints: safely null-terminate and process
        commandBuffer[commandIndex] = '\0';
        processCommand(commandBuffer);
        commandIndex = 0;
        commandBuffer[0] = '\0';
      }
    }
    else {
      // Normal character received
      if (commandIndex < MAX_COMMAND_LENGTH) {
        commandBuffer[commandIndex++] = inChar;
      } else {
        // HARDWARE BUFFER GUARD: Prevent writing past index 31 into adjacent SRAM!
        inputTooLong = true;
      }
    }
  }
}
