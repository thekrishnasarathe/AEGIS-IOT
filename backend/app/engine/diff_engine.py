# filepath: backend/app/engine/diff_engine.py
"""
Unified Diff & Source Metric Utility for AEGIS-IoT.
Computes Git-compatible unified diffs and enforces patch line metrics.
"""

import difflib
from typing import Tuple, Dict, Any


def compute_unified_diff(
    original_code: str,
    patched_code: str,
    filename: str = "target.c"
) -> str:
    """
    Generate clean, Git-compatible unified diff string.
    """
    orig_lines = original_code.replace("\r\n", "\n").splitlines(keepends=True)
    patch_lines = patched_code.replace("\r\n", "\n").splitlines(keepends=True)

    diff = difflib.unified_diff(
        orig_lines,
        patch_lines,
        fromfile=f"a/{filename}",
        tofile=f"b/{filename}",
        n=3
    )
    return "".join(diff)


def analyze_diff_metrics(diff_text: str) -> Dict[str, Any]:
    """
    Parses a unified diff to calculate line changes:
    - additions: lines starting with '+' (excluding +++ headers)
    - deletions: lines starting with '-' (excluding --- headers)
    - total_changed: additions + deletions
    """
    additions = 0
    deletions = 0

    for line in diff_text.splitlines():
        if line.startswith("+++") or line.startswith("---"):
            continue
        elif line.startswith("+"):
            additions += 1
        elif line.startswith("-"):
            deletions += 1

    return {
        "additions": additions,
        "deletions": deletions,
        "total_changed_lines": additions + deletions,
    }
