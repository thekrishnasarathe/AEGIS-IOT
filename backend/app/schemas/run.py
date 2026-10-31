# filepath: backend/app/schemas/run.py
"""
Data schemas for the AEGIS-IoT 7-Stage Deterministic Verification Ladder.
Fully typed with Pydantic v2.
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class LadderStage(str, Enum):
    STAGE_1_FINDING = "STAGE_1_FINDING"
    STAGE_2_BUG_REPRODUCED = "STAGE_2_BUG_REPRODUCED"
    STAGE_3_PATCH_PROPOSED = "STAGE_3_PATCH_PROPOSED"
    STAGE_4_COMPILES = "STAGE_4_COMPILES"
    STAGE_5_CRASH_INPUT_CLEAN = "STAGE_5_CRASH_INPUT_CLEAN"
    STAGE_6_GUARDS_AND_BEHAVIOR = "STAGE_6_GUARDS_AND_BEHAVIOR"
    STAGE_7_VERIFIED = "STAGE_7_VERIFIED"


class StageStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    PASSED = "PASSED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class RunVerdict(str, Enum):
    INITIALIZING = "INITIALIZING"
    RUNNING = "RUNNING"
    VERIFIED = "VERIFIED"
    UNVERIFIED = "UNVERIFIED"
    REJECTED = "REJECTED"
    ERROR = "ERROR"


class ExecutionLane(str, Enum):
    CLOUD_LLM = "CLOUD_LLM"
    LOCAL_OLLAMA = "LOCAL_OLLAMA"
    REPLAY_FIXTURE = "REPLAY_FIXTURE"


class Provenance(str, Enum):
    DOCKER_SANDBOX = "DOCKER_SANDBOX"
    LOCAL_SUBPROCESS = "LOCAL_SUBPROCESS"
    FIXTURE_FALLBACK = "FIXTURE_FALLBACK"
    SIMULATED_STAGE_INSURANCE = "SIMULATED_STAGE_INSURANCE"


# Stage 1: Static Finding
class Stage1FindingData(BaseModel):
    tool: str = "cppcheck"
    has_warning: bool = False
    findings: List[Dict[str, Any]] = Field(default_factory=list)
    raw_output: str = ""
    cwe_ml_prediction: Optional[Dict[str, Any]] = None
    status: StageStatus = StageStatus.PENDING
    duration_ms: float = 0.0


# Stage 2: Dynamic Bug Reproduction
class Stage2ReproData(BaseModel):
    crashed: bool = False
    exit_code: int = 0
    crash_type: str = "none"
    asan_trace: str = ""
    sanitizer_flags: List[str] = Field(default_factory=lambda: ["-fsanitize=address,undefined"])
    raw_output: str = ""
    status: StageStatus = StageStatus.PENDING
    duration_ms: float = 0.0


# Stage 3: Patch Synthesis
class Stage3PatchData(BaseModel):
    attempt: int = 1
    model_id: str = "unknown"
    provider_used: Optional[str] = None
    model_used: Optional[str] = None
    latency_ms: Optional[float] = None
    fallback_trace: List[str] = Field(default_factory=list)
    patch_unified_diff: str = ""
    patched_source: str = ""
    explanation: str = ""
    status: StageStatus = StageStatus.PENDING
    duration_ms: float = 0.0


# Stage 4: Compiler Gate
class Stage4CompileData(BaseModel):
    compiled: bool = False
    gcc_command: str = "gcc -Wall -Wextra -fsanitize=address,undefined target.c harness.c"
    exit_code: int = 0
    warnings: List[str] = Field(default_factory=list)
    compiler_errors: str = ""
    status: StageStatus = StageStatus.PENDING
    duration_ms: float = 0.0


# Stage 5: Crash Input Clean Replay
class Stage5CleanCrashData(BaseModel):
    crash_vector_clean: bool = False
    exit_code: int = 0
    asan_detected: bool = False
    stderr: str = ""
    stdout: str = ""
    status: StageStatus = StageStatus.PENDING
    duration_ms: float = 0.0


# Stage 6: Guards and Behavioral Equivalence
class BenignTestResult(BaseModel):
    input_name: str
    exit_code: int
    stdout_matched: bool
    baseline_stdout: str
    patched_stdout: str


class Stage6GuardsData(BaseModel):
    banned_tokens_passed: bool = False
    detected_banned_tokens: List[str] = Field(default_factory=list)
    signature_passed: bool = False
    signature_violations: List[str] = Field(default_factory=list)
    diff_cap_passed: bool = False
    changed_line_count: int = 0
    max_diff_lines_allowed: int = 35
    benign_regression_passed: bool = False
    benign_test_results: List[BenignTestResult] = Field(default_factory=list)
    post_patch_ml_prediction: Optional[Dict[str, Any]] = None
    rejection_reason: Optional[str] = None
    status: StageStatus = StageStatus.PENDING
    duration_ms: float = 0.0


# Stage 7: Telemetry & Evidence Audit
class Stage7VerifiedData(BaseModel):
    final_verdict_badge: str = "Verified for tested cases"
    resource_delta: Dict[str, Any] = Field(default_factory=dict)
    runtime_telemetry: Dict[str, Any] = Field(default_factory=dict)
    boundary_sweep: Optional[Dict[str, Any]] = None
    patch_export: str = ""
    audit_report_markdown: str = ""
    status: StageStatus = StageStatus.PENDING
    duration_ms: float = 0.0


# Complete Run State Document
class RunState(BaseModel):
    run_id: str
    sample_id: str
    sample_name: str
    lane: ExecutionLane
    provenance: Provenance
    verdict: RunVerdict = RunVerdict.INITIALIZING
    current_stage: LadderStage = LadderStage.STAGE_1_FINDING
    retry_count: int = 0
    max_retries: int = 3

    stage_1: Stage1FindingData = Field(default_factory=Stage1FindingData)
    stage_2: Stage2ReproData = Field(default_factory=Stage2ReproData)
    stage_3: Stage3PatchData = Field(default_factory=Stage3PatchData)
    stage_4: Stage4CompileData = Field(default_factory=Stage4CompileData)
    stage_5: Stage5CleanCrashData = Field(default_factory=Stage5CleanCrashData)
    stage_6: Stage6GuardsData = Field(default_factory=Stage6GuardsData)
    stage_7: Stage7VerifiedData = Field(default_factory=Stage7VerifiedData)

    raw_logs: Dict[str, str] = Field(default_factory=dict)
    pre_patch_ml: Optional[Dict[str, Any]] = None
    post_patch_ml: Optional[Dict[str, Any]] = None
    attempts_history: List[Dict[str, Any]] = Field(default_factory=list)
    security_score_card: Optional[Dict[str, Any]] = None
    hacker_impact_card: Optional[Dict[str, Any]] = None
    time_saved_card: Optional[Dict[str, Any]] = None
    firmware_budget_guard: Optional[Dict[str, Any]] = None
    created_at: float
    updated_at: float


class RunCreateRequest(BaseModel):
    sample_id: str
    lane: ExecutionLane = ExecutionLane.REPLAY_FIXTURE
    model_name: Optional[str] = "qwen3.5:4b"
    ollama_model: Optional[str] = "qwen3.5:4b"
    provider: Optional[str] = "auto"
    custom_c_code: Optional[str] = None
