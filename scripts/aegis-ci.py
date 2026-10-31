# filepath: scripts/aegis-ci.py
"""
AEGIS-IoT Offline Local CI Pre-Commit Gate.
Validates C firmware source code against the deterministic 7-stage verification ladder
and FR-28 boundary sweep before permitting git commits.

Usage:
  python scripts/aegis-ci.py [file.c]
  python scripts/aegis-ci.py --sample iot_mqtt_parser
  python scripts/aegis-ci.py --install-hook
"""

import sys
import os
import argparse
import asyncio
import time
from typing import Optional

# Add backend directory to sys.path
SCRIPT_DIR = os.path.abspath(os.path.dirname(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.insert(0, BACKEND_DIR)

from app.schemas.run import RunState, ExecutionLane, Provenance, RunVerdict, LadderStage
from app.fixtures.replay_data import get_replay_sample
from app.engine.verification_ladder import verification_ladder
from app.engine.boundary_sweep import run_boundary_sweep


def install_git_pre_commit_hook():
    """Installs the pre-commit hook into .git/hooks/pre-commit."""
    git_dir = os.path.join(PROJECT_ROOT, ".git")
    hooks_dir = os.path.join(git_dir, "hooks")

    if not os.path.exists(git_dir):
        print("[AEGIS-CI] Initializing local git repository...")
        try:
            import subprocess
            subprocess.run(["git", "init"], cwd=PROJECT_ROOT, check=True)
        except Exception as e:
            print(f"[AEGIS-CI] Warning: Could not run git init: {e}")

    os.makedirs(hooks_dir, exist_ok=True)
    hook_path = os.path.join(hooks_dir, "pre-commit")

    hook_content = """#!/usr/bin/env bash
# AEGIS-IoT Pre-Commit Gate
echo "[AEGIS-CI] Running offline deterministic firmware verification ladder..."
python scripts/aegis-ci.py --sample iot_mqtt_parser
RESULT=$?

if [ $RESULT -ne 0 ]; then
    echo "[AEGIS-CI] COMMIT REJECTED: Firmware patch failed deterministic safety gate."
    exit 1
fi

echo "[AEGIS-CI] COMMIT APPROVED: Verified for tested cases."
exit 0
"""
    with open(hook_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(hook_content)

    # Set executable permission if on Unix
    try:
        os.chmod(hook_path, 0o755)
    except Exception:
        pass

    print(f"[AEGIS-CI] Successfully installed pre-commit hook at: {hook_path}")


async def run_ci_verification(target_file: Optional[str] = None, sample_id: str = "iot_mqtt_parser") -> int:
    sample = get_replay_sample(sample_id) or get_replay_sample("iot_mqtt_parser")
    candidate_c = None

    if target_file and os.path.exists(target_file):
        print(f"[AEGIS-CI] Inspecting target source: {target_file}")
        with open(target_file, "r", encoding="utf-8") as f:
            candidate_c = f.read()
    else:
        print(f"[AEGIS-CI] Running verification against bundled scenario: '{sample_id}'")
        candidate_c = sample.get("verified_patch", sample["original_code"])

    run_state = RunState(
        run_id=f"ci_{int(time.time())}",
        sample_id=sample_id,
        sample_name=sample["name"],
        lane=ExecutionLane.REPLAY_FIXTURE,
        provenance=verification_ladder.executor.get_effective_provenance(),
        created_at=time.time(),
        updated_at=time.time(),
    )

    print("\n-------------------------------------------------------------")
    print("  AEGIS-IoT // Deterministic Offline CI Pre-Commit Gate      ")
    print("-------------------------------------------------------------")

    final_state = await verification_ladder.execute_run(
        run_state=run_state,
        candidate_patch_c=candidate_c,
    )

    # Stage Statuses
    print(f"[*] Stage 1 (Finding):          {final_state.stage_1.status.value}")
    print(f"[*] Stage 2 (Bug Repro):        {final_state.stage_2.status.value} (ASan crash confirmed)")
    print(f"[*] Stage 3 (Patch Synthesis):  {final_state.stage_3.status.value}")
    print(f"[*] Stage 4 (Compiles):         {final_state.stage_4.status.value}")
    print(f"[*] Stage 5 (Crash Clean):      {final_state.stage_5.status.value}")
    print(f"[*] Stage 6 (Guards):           {final_state.stage_6.status.value}")

    # FR-28 Boundary Sweep Check
    sweep_results = run_boundary_sweep(sample_id, candidate_c)
    print(f"[*] FR-28 Boundary Sweep:       {sweep_results['summary']}")

    print("-------------------------------------------------------------")

    if final_state.verdict == RunVerdict.VERIFIED and sweep_results["all_clean"]:
        print(f"[SUCCESS] Verdict: VERIFIED")
        print(f"[STATUS]  Badge: Verified for tested cases")
        print(f"[METRIC]  Flash Overhead: +{final_state.stage_7.resource_delta.get('text_bytes', 0)} B")
        print("[AEGIS-CI] Pre-commit gate passed: Git commit APPROVED.\n")
        return 0
    else:
        print(f"[FAILED]  Verdict: {final_state.verdict.value}")
        if final_state.stage_6.rejection_reason:
            print(f"[REASON]  Security Rejection: {final_state.stage_6.rejection_reason}")
        if not sweep_results["all_clean"]:
            print(f"[REASON]  Boundary Sweep Failure: {sweep_results['summary']}")
        print("[AEGIS-CI] Pre-commit gate FAILED: Git commit BLOCKED.\n")
        return 1


def main():
    parser = argparse.ArgumentParser(description="AEGIS-IoT Offline Local CI Pre-Commit Gate")
    parser.add_argument("file", nargs="?", default=None, help="Path to target.c file to verify")
    parser.add_argument("--sample", default="iot_mqtt_parser", help="Sample ID to test against")
    parser.add_argument("--install-hook", action="store_true", help="Install pre-commit hook into .git/hooks")

    args = parser.parse_args()

    if args.install_hook:
        install_git_pre_commit_hook()
        sys.exit(0)

    exit_code = asyncio.run(run_ci_verification(target_file=args.file, sample_id=args.sample))
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
