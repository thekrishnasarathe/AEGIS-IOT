# filepath: backend/app/engine/verification_ladder.py
"""
Deterministic 7-Stage Verification Ladder with 3-Attempt Self-Healing Loop for AEGIS-IoT.
Executes the state machine:
  Stage 1: Finding (cppcheck)
  Stage 2: Bug Reproduced (ASan on --crash) -> Halt UNVERIFIED if clean
  [Self-Healing Loop - Attempts 1 to 3]:
    Stage 3: Patch Synthesis (Multi-provider LLM router with feedback)
    Stage 4: Compiles (-Wall -Wextra -fsanitize) -> Feed errors to next attempt
    Stage 5: Crash Input Clean (Patched ASan --crash) -> Feed trace to next attempt
  Stage 6: Guards & Behavioral Equivalence -> Halt REJECTED on violation
  Stage 7: Verified (Evidence Audit & Resource Telemetry)
"""

import time
import asyncio
from typing import Optional, Callable, Awaitable
from app.config import settings
from app.schemas.run import (
    RunState,
    LadderStage,
    StageStatus,
    RunVerdict,
    ExecutionLane,
    Provenance,
)
from app.fixtures.replay_data import get_replay_sample
from app.engine.diff_engine import compute_unified_diff
from app.engine.guards import evaluate_stage_6_guards
from app.engine.sandbox_executor import sandbox_executor
from app.engine.llm_router import llm_router
from app.engine.cwe_classifier import predict_cwe
from app.engine.hardware_bridge import hardware_bridge
from app.engine.result_cards import (
    generate_security_score_card,
    generate_hacker_impact_card,
    generate_time_saved_card,
    generate_firmware_budget_guard,
)


class VerificationLadder:
    """
    Orchestrates the 7-stage deterministic verification state machine.
    Enforces the core rule: Deterministic tools decide; models only propose.
    """

    def __init__(self):
        self.executor = sandbox_executor

    def _populate_cards(self, run_state: RunState, sample: dict, orig_c: str, patched_c: str):
        actual_time = max(0.5, time.time() - run_state.created_at)
        cwe_key = run_state.pre_patch_ml.get("predicted_class") if run_state.pre_patch_ml else sample.get("cwe", "CWE-121")
        if not run_state.security_score_card:
            run_state.security_score_card = generate_security_score_card(
                sample_id=run_state.sample_id,
                orig_c=orig_c,
                patched_c=patched_c,
                pre_ml=run_state.pre_patch_ml,
                post_ml=run_state.post_patch_ml,
                stage_1_findings=run_state.stage_1.findings,
            )
        if not run_state.hacker_impact_card:
            run_state.hacker_impact_card = generate_hacker_impact_card(
                sample_id=run_state.sample_id,
                sample_name=sample.get("name", "Firmware Target"),
                cwe_id=cwe_key,
                orig_c=orig_c,
            )
        if not run_state.time_saved_card:
            run_state.time_saved_card = generate_time_saved_card(
                cwe_id=cwe_key,
                actual_seconds=actual_time,
                retry_count=run_state.retry_count,
            )
        if not run_state.firmware_budget_guard:
            run_state.firmware_budget_guard = generate_firmware_budget_guard(
                sample_id=run_state.sample_id,
                orig_c=orig_c,
                patched_c=patched_c,
                stage_7_data=run_state.stage_7,
            )

    async def execute_run(
        self,
        run_state: RunState,
        candidate_patch_c: Optional[str] = None,
        state_callback: Optional[Callable[[RunState], Awaitable[None]]] = None,
    ) -> RunState:
        sample_id = run_state.sample_id
        sample = get_replay_sample(sample_id) or get_replay_sample("iot_mqtt_parser")
        orig_c = sample["original_code"]
        harness_c = sample["harness_code"]

        async def checkpoint(stage: LadderStage, verdict: RunVerdict = RunVerdict.RUNNING):
            run_state.current_stage = stage
            run_state.verdict = verdict
            run_state.updated_at = time.time()
            if verdict == RunVerdict.REJECTED:
                try:
                    hardware_bridge.dispatch_ladder_stage("REJECTED")
                except Exception:
                    pass
            elif verdict == RunVerdict.VERIFIED:
                try:
                    hardware_bridge.dispatch_ladder_stage("STAGE_7_VERIFIED")
                except Exception:
                    pass
            try:
                run_state.hardware_state = hardware_bridge.get_status()
            except Exception:
                pass
            if state_callback:
                await state_callback(run_state)
            await asyncio.sleep(0.20)

        # =====================================================================
        # STAGE 1: Finding & Static Triage (cppcheck + Dual AST Neural Audit)
        # =====================================================================
        run_state.stage_1.status = StageStatus.RUNNING
        try:
            hardware_bridge.dispatch_ladder_stage("STAGE_1_FINDING")
        except Exception:
            pass
        await checkpoint(LadderStage.STAGE_1_FINDING)
        run_state.stage_1 = self.executor.run_stage_1_cppcheck(orig_c, sample_id)

        # Pre-Patch AST Neural Audit (12 AST features, 95.0% LOOCV)
        try:
            pre_patch_ml = predict_cwe(orig_c)
            run_state.pre_patch_ml = pre_patch_ml
            run_state.stage_1.cwe_ml_prediction = pre_patch_ml
            audit_log = (
                f"[Pre-Patch AST Neural Audit] Predicted: {pre_patch_ml['predicted_class']} ({pre_patch_ml['confidence']*100:.1f}%) "
                f"| Risk Severity: {pre_patch_ml['risk_severity_score']}/10 ({pre_patch_ml['severity_label']}) "
                f"| Sinks: {pre_patch_ml['sink_count']} | Guards: {pre_patch_ml['guard_count']} | LOC: {pre_patch_ml['loc']}"
            )
            run_state.stage_1.raw_output += f"\n{audit_log}\n  Active Features: {', '.join(pre_patch_ml['active_ast_features'])}\n  Distribution: {pre_patch_ml['probabilities']}"
            run_state.raw_logs["stage_1_cwe_classifier"] = audit_log
        except Exception:
            pass

        run_state.raw_logs["stage_1_cppcheck"] = run_state.stage_1.raw_output
        await checkpoint(LadderStage.STAGE_1_FINDING)

        # =====================================================================
        # STAGE 2: Dynamic Bug Reproduction (ASan on original --crash)
        # =====================================================================
        run_state.stage_2.status = StageStatus.RUNNING
        try:
            hardware_bridge.dispatch_ladder_stage("STAGE_2_BUG_REPRODUCED")
        except Exception:
            pass
        await checkpoint(LadderStage.STAGE_2_BUG_REPRODUCED)
        run_state.stage_2 = self.executor.run_stage_2_bug_reproduce(orig_c, harness_c, sample_id)
        run_state.raw_logs["stage_2_asan_repro"] = run_state.stage_2.raw_output

        # Axiom: If original does not crash under ASan, halt immediately as UNVERIFIED
        if not run_state.stage_2.crashed:
            run_state.stage_2.status = StageStatus.FAILED
            run_state.verdict = RunVerdict.UNVERIFIED
            await checkpoint(LadderStage.STAGE_2_BUG_REPRODUCED, RunVerdict.UNVERIFIED)
            return run_state

        run_state.stage_2.status = StageStatus.PASSED
        await checkpoint(LadderStage.STAGE_2_BUG_REPRODUCED)

        # =====================================================================
        # SELF-HEALING SYNTHESIS & COMPILATION LOOP (STAGES 3, 4, 5)
        # =====================================================================
        error_feedback: Optional[str] = None
        patched_c: str = ""
        unified_diff: str = ""
        loop_passed = False

        max_attempts = 1 if candidate_patch_c else run_state.max_retries

        for attempt in range(1, max_attempts + 1):
            run_state.stage_3.attempt = attempt
            run_state.retry_count = attempt - 1

            # --- STAGE 3: Patch Synthesis ---
            run_state.stage_3.status = StageStatus.RUNNING
            try:
                hardware_bridge.dispatch_ladder_stage("STAGE_3_PATCH_PROPOSED")
            except Exception:
                pass
            await checkpoint(LadderStage.STAGE_3_PATCH_PROPOSED)

            if candidate_patch_c:
                patched_c = candidate_patch_c
                model_id = "manual-candidate"
                explanation = "Candidate patch supplied directly."
                provider_used = "manual"
                model_used = "manual-candidate"
                latency_ms = 0.0
                fallback_trace = ["manual candidate provided"]
            else:
                proposal = await llm_router.propose_patch(
                    run_state=run_state,
                    sample_id=sample_id,
                    attempt=attempt,
                    error_feedback=error_feedback,
                )
                patched_c = proposal["patched_c"]
                model_id = proposal["model_id"]
                explanation = proposal["explanation"]
                provider_used = proposal.get("provider_used", "stage_insurance")
                model_used = proposal.get("model_used", model_id)
                latency_ms = proposal.get("latency_ms", 180.0)
                fallback_trace = proposal.get("fallback_trace", [])

            unified_diff = compute_unified_diff(orig_c, patched_c)
            run_state.stage_3.patched_source = patched_c
            run_state.stage_3.patch_unified_diff = unified_diff
            run_state.stage_3.model_id = model_id
            run_state.stage_3.explanation = explanation
            run_state.stage_3.provider_used = provider_used
            run_state.stage_3.model_used = model_used
            run_state.stage_3.latency_ms = latency_ms
            run_state.stage_3.fallback_trace = fallback_trace
            run_state.stage_3.status = StageStatus.PASSED
            run_state.stage_3.duration_ms = latency_ms
            run_state.raw_logs[f"attempt_{attempt}_patch"] = unified_diff
            run_state.raw_logs["stage_3_patch_diff"] = unified_diff
            await checkpoint(LadderStage.STAGE_3_PATCH_PROPOSED)

            # --- STAGE 4: Compiler Gate ---
            run_state.stage_4.status = StageStatus.RUNNING
            try:
                hardware_bridge.dispatch_ladder_stage("STAGE_4_COMPILES")
            except Exception:
                pass
            await checkpoint(LadderStage.STAGE_4_COMPILES)

            compile_result = self.executor.run_stage_4_compile(patched_c, harness_c, sample_id)
            run_state.stage_4 = compile_result
            run_state.raw_logs["stage_4_gcc"] = (
                compile_result.compiler_errors or "Compilation succeeded cleanly with 0 errors."
            )

            if not compile_result.compiled:
                run_state.attempts_history.append({
                    "attempt": attempt,
                    "model_id": model_id,
                    "provider_used": provider_used,
                    "latency_ms": latency_ms,
                    "stage_4_compiled": False,
                    "stage_5_clean": False,
                    "error_feedback": compile_result.compiler_errors,
                })
                if attempt < max_attempts:
                    error_feedback = f"Stage 4 Compilation Failure:\n{compile_result.compiler_errors}"
                    run_state.raw_logs[f"attempt_{attempt}_feedback"] = error_feedback
                    continue
                else:
                    run_state.verdict = RunVerdict.REJECTED
                    await checkpoint(LadderStage.STAGE_4_COMPILES, RunVerdict.REJECTED)
                    return run_state

            await checkpoint(LadderStage.STAGE_4_COMPILES)

            # --- STAGE 5: Crash Input Clean Replay ---
            run_state.stage_5.status = StageStatus.RUNNING
            await checkpoint(LadderStage.STAGE_5_CRASH_INPUT_CLEAN)

            crash_result = self.executor.run_stage_5_crash_replay(patched_c, harness_c, sample_id)
            run_state.stage_5 = crash_result
            run_state.raw_logs["stage_5_crash_replay"] = (
                crash_result.stderr or crash_result.stdout
            )

            run_state.attempts_history.append({
                "attempt": attempt,
                "model_id": model_id,
                "provider_used": provider_used,
                "latency_ms": latency_ms,
                "stage_4_compiled": True,
                "stage_5_clean": crash_result.crash_vector_clean,
                "error_feedback": crash_result.stderr if not crash_result.crash_vector_clean else None,
            })

            if not crash_result.crash_vector_clean:
                if attempt < max_attempts:
                    error_feedback = f"Stage 5 Sanitizer Crash Triggered:\n{crash_result.stderr or crash_result.stdout}"
                    run_state.raw_logs[f"attempt_{attempt}_feedback"] = error_feedback
                    continue
                else:
                    run_state.verdict = RunVerdict.REJECTED
                    self._populate_cards(run_state, sample, orig_c, patched_c)
                    await checkpoint(LadderStage.STAGE_5_CRASH_INPUT_CLEAN, RunVerdict.REJECTED)
                    return run_state

            await checkpoint(LadderStage.STAGE_5_CRASH_INPUT_CLEAN)
            try:
                hardware_bridge.dispatch_ladder_stage("STAGE_5_CRASH_INPUT_CLEAN")
            except Exception:
                pass
            loop_passed = True
            break

        if not loop_passed:
            run_state.verdict = RunVerdict.REJECTED
            self._populate_cards(run_state, sample, orig_c, patched_c)
            return run_state

        # =====================================================================
        # STAGE 6: Integrity Guards & Behavioral Equivalence
        # =====================================================================
        run_state.stage_6.status = StageStatus.RUNNING
        try:
            hardware_bridge.dispatch_ladder_stage("STAGE_6_GUARDS")
        except Exception:
            pass
        await checkpoint(LadderStage.STAGE_6_GUARDS_AND_BEHAVIOR)

        benign_results = self.executor.run_benign_suite(patched_c, harness_c, sample_id)
        guard_eval = evaluate_stage_6_guards(
            original_code=orig_c,
            patched_code=patched_c,
            diff_text=unified_diff,
            benign_results=benign_results,
        )

        run_state.stage_6.banned_tokens_passed = guard_eval["banned_tokens_passed"]
        run_state.stage_6.detected_banned_tokens = guard_eval["detected_banned_tokens"]
        run_state.stage_6.signature_passed = guard_eval["signature_passed"]
        run_state.stage_6.signature_violations = guard_eval["signature_violations"]
        run_state.stage_6.diff_cap_passed = guard_eval["diff_cap_passed"]
        run_state.stage_6.changed_line_count = guard_eval["changed_line_count"]
        run_state.stage_6.max_diff_lines_allowed = guard_eval["max_diff_lines_allowed"]
        run_state.stage_6.benign_regression_passed = guard_eval["benign_regression_passed"]
        from app.schemas.run import BenignTestResult
        run_state.stage_6.benign_test_results = [
            BenignTestResult(**r) if isinstance(r, dict) else r for r in benign_results
        ]
        run_state.stage_6.rejection_reason = guard_eval["rejection_reason"]

        guard_log = (
            f"[Stage 6 Integrity Audit]\n"
            f"- Banned Tokens: {'PASS' if guard_eval['banned_tokens_passed'] else 'FAIL: ' + str(guard_eval['detected_banned_tokens'])}\n"
            f"- Signatures: {'PASS' if guard_eval['signature_passed'] else 'FAIL: ' + str(guard_eval['signature_violations'])}\n"
            f"- Diff Cap: {'PASS' if guard_eval['diff_cap_passed'] else 'FAIL: ' + str(guard_eval['changed_line_count']) + ' lines'}\n"
            f"- Benign Regression: {'PASS' if guard_eval['benign_regression_passed'] else 'FAIL'}\n"
        )

        # Post-Patch AST Neural Audit
        try:
            post_patch_ml = predict_cwe(patched_c)
            run_state.post_patch_ml = post_patch_ml
            run_state.stage_6.post_patch_ml_prediction = post_patch_ml

            pre_ml = run_state.pre_patch_ml or {}
            pre_class = pre_ml.get("predicted_class", "VULNERABLE")
            pre_risk = pre_ml.get("risk_severity_score", 10.0)
            pre_guards = pre_ml.get("guard_count", 0)

            post_class = post_patch_ml.get("predicted_class", "SAFE")
            post_risk = post_patch_ml.get("risk_severity_score", 0.0)
            post_guards = post_patch_ml.get("guard_count", 0)
            post_safe_prob = post_patch_ml.get("probabilities", {}).get("SAFE", 0.0)

            post_ml_log = (
                f"\n[Post-Patch AST Neural Audit] {pre_class} ({pre_risk}/10) -> {post_class} ({post_risk}/10) "
                f"| Defensive Guards: {pre_guards} -> {post_guards} | SAFE Probability: {post_safe_prob*100:.1f}%\n"
                f"  Active Risk Features: {', '.join(post_patch_ml['active_ast_features']) if post_patch_ml['active_ast_features'] else 'None (Clean)'}\n"
            )
            guard_log += post_ml_log
            run_state.raw_logs["stage_6_post_patch_ml"] = post_ml_log
        except Exception:
            pass

        run_state.raw_logs["stage_6_guards"] = guard_log

        # Guards are strict and zero-tolerance: Halt immediately with REJECTED
        if not guard_eval["all_passed"]:
            run_state.stage_6.status = StageStatus.FAILED
            run_state.verdict = RunVerdict.REJECTED
            try:
                hardware_bridge.dispatch_ladder_stage("REJECTED")
            except Exception:
                pass
            self._populate_cards(run_state, sample, orig_c, patched_c)
            await checkpoint(LadderStage.STAGE_6_GUARDS_AND_BEHAVIOR, RunVerdict.REJECTED)
            return run_state

        run_state.stage_6.status = StageStatus.PASSED
        await checkpoint(LadderStage.STAGE_6_GUARDS_AND_BEHAVIOR)

        # =====================================================================
        # STAGE 7: Telemetry & Evidence Auditor
        # =====================================================================
        run_state.stage_7.status = StageStatus.RUNNING
        await checkpoint(LadderStage.STAGE_7_VERIFIED)

        stage_7_data = self.executor.run_stage_7_audit(
            original_c=orig_c,
            patched_c=patched_c,
            diff_text=unified_diff,
            sample_id=sample_id,
        )
        run_state.stage_7 = stage_7_data
        run_state.raw_logs["stage_7_audit_md"] = stage_7_data.audit_report_markdown

        # Verdict issued: strictly "Verified for tested cases"
        run_state.verdict = RunVerdict.VERIFIED
        run_state.current_stage = LadderStage.STAGE_7_VERIFIED
        run_state.updated_at = time.time()
        try:
            hardware_bridge.dispatch_ladder_stage("STAGE_7_VERIFIED")
        except Exception:
            pass

        # Generate Executive Result Cards (Heuristic Score, Threat Impact, Time Saved, Budget Guard)
        self._populate_cards(run_state, sample, orig_c, patched_c)

        await checkpoint(LadderStage.STAGE_7_VERIFIED, RunVerdict.VERIFIED)

        return run_state


verification_ladder = VerificationLadder()
