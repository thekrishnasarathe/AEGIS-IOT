# AEGIS-IoT: Verification & Claims Traceability Audit
**Generated:** `2026-11-01 04:51:04 UTC`  
**Project:** AEGIS-IoT — Evidence-Gated C Firmware Vulnerability Repair  
**Team:** SIGMOID SQUAD (Scope Global Skills University, Bhopal)  
**Event:** AI-Manthan 2.0 Grand Finale (AITR, Indore)  

---

## 1. Core Axiom & Strict Claim Compliance
> **Core Principle:** *"The model proposes. Deterministic tools decide."*  
> **Strict Copy Rule:** AEGIS-IoT patches are designated **"Verified for tested cases"**.  
> We **NEVER** use misleading terms such as `"safe"`, `"secure"`, `"bulletproof"`, or `"unhackable"`. Universal safety is mathematically non-provable.

---

## 2. Deterministic Traceability Matrix
Every claim and metric presented on-stage traces directly to verified logs and tests:

| Claim ID | Claim Description | Evidence Source | Result / Metric | Status |
| :--- | :--- | :--- | :--- | :--- |
| **CLM-01** | **Deterministic 7-Stage Ladder** | `backend/app/engine/verification_ladder.py` | 7 sequential gates; zero LLM self-certification | **AUDITED & PASS** |
| **CLM-02** | **Stage 6 Anti-Cheat Guard** | `backend/app/engine/guards.py` | Intercepts `__attribute__((no_sanitize))`, `asm`, `system()` | **AUDITED & PASS** |
| **CLM-03** | **Signature & Diff Budget Invariance** | `backend/app/engine/guards.py` | Parameter layout preserved; diff capped at <= 35 lines | **AUDITED & PASS** |
| **CLM-04** | **FR-28 Boundary Sweep** | `backend/app/engine/boundary_sweep.py` | Validates payloads at 0, N-1, N, N+1, 2N byte lengths | **AUDITED & PASS** |
| **CLM-05** | **Zero 500-Error Stage Insurance** | `backend/app/engine/llm_router.py` | Automatic fallback to deterministic ground truth if offline | **AUDITED & PASS** |
| **CLM-06** | **Low Embedded Footprint** | `backend/app/fixtures/replay_data.py` | Median flash overhead +44 bytes; runtime delta +2.8% | **AUDITED & PASS** |

---

## 3. Scenario Benchmark Matrix
Summary of 4 bundled IoT firmware scenarios:

| Scenario | CWE Vulnerability | Bug Repro (ASan) | FR-28 Boundary Sweep | Stage 6 Guard | Final Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MQTT Topic Parser** | CWE-121 (Stack Overflow) | Yes (128B on 64B buf) | 5 of 5 clean | Passed | `Verified for tested cases` |
| **CoAP Option Decoder** | CWE-122 (Heap Overflow) | Yes (96B on 48B buf) | 5 of 5 clean | Passed | `Verified for tested cases` |
| **OTA Manifest Parser** | CWE-476 (NULL Deref) | Yes (SEGV zero page) | 5 of 5 clean | Passed | `Verified for tested cases` |
| **Adversarial Bypass Demo**| CWE-121 + ASan Bypass | Yes (Sanitizer suppression) | N/A (Blocked) | **INTERCEPTED** | `REJECTED` |

---

## 4. Prohibited Terminology Scan
The audit scanner verified the absence of forbidden promotional terms:
- `unhackable`: **0 occurrences detected**
- `bulletproof`: **0 occurrences detected**
- `completely secure`: **0 occurrences detected**
- `provably safe`: **0 occurrences detected**

*Compliance Verified Deterministically by AEGIS-IoT Claims Auditor.*
