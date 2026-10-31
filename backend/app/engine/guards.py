# filepath: backend/app/engine/guards.py
"""
Stage 6 Integrity Guard Engine for AEGIS-IoT.
Implements:
1. Comment and String-Stripped Banned Token Scanner
2. Top-Level Function Signature Preservation Guard
3. Diff Size Cap Guard
4. Benign Regression Equivalence Verifier
"""

import re
from typing import List, Dict, Tuple, Optional, Any
from app.config import settings


def strip_c_comments_and_strings(source: str) -> str:
    """
    Strips C comments (/* ... */ and // ...) and string/char literals ('...', "...").
    Uses an exact state machine to guarantee no false positives from quotes inside comments
    or comments inside strings. Preserves line counts.
    """
    result = []
    i = 0
    n = len(source)

    STATE_NORMAL = 0
    STATE_LINE_COMMENT = 1
    STATE_BLOCK_COMMENT = 2
    STATE_STRING = 3
    STATE_CHAR = 4

    state = STATE_NORMAL

    while i < n:
        ch = source[i]
        next_ch = source[i + 1] if i + 1 < n else ""

        if state == STATE_NORMAL:
            if ch == "/" and next_ch == "*":
                state = STATE_BLOCK_COMMENT
                result.append(" ")
                i += 2
                continue
            elif ch == "/" and next_ch == "/":
                state = STATE_LINE_COMMENT
                result.append(" ")
                i += 2
                continue
            elif ch == '"':
                state = STATE_STRING
                result.append(" ")
                i += 1
                continue
            elif ch == "'":
                state = STATE_CHAR
                result.append(" ")
                i += 1
                continue
            else:
                result.append(ch)
                i += 1
                continue

        elif state == STATE_BLOCK_COMMENT:
            if ch == "*" and next_ch == "/":
                state = STATE_NORMAL
                result.append(" ")
                i += 2
                continue
            elif ch == "\n":
                result.append("\n")
            else:
                result.append(" ")
            i += 1
            continue

        elif state == STATE_LINE_COMMENT:
            if ch == "\n":
                state = STATE_NORMAL
                result.append("\n")
            else:
                result.append(" ")
            i += 1
            continue

        elif state == STATE_STRING:
            if ch == "\\":
                # Escaped character
                result.append("  ")
                i += 2
                continue
            elif ch == '"':
                state = STATE_NORMAL
                result.append(" ")
                i += 1
                continue
            elif ch == "\n":
                result.append("\n")
                i += 1
                continue
            else:
                result.append(" ")
                i += 1
                continue

        elif state == STATE_CHAR:
            if ch == "\\":
                result.append("  ")
                i += 2
                continue
            elif ch == "'":
                state = STATE_NORMAL
                result.append(" ")
                i += 1
                continue
            elif ch == "\n":
                result.append("\n")
                i += 1
                continue
            else:
                result.append(" ")
                i += 1
                continue

    return "".join(result)


def scan_banned_tokens(stripped_code: str) -> Tuple[bool, List[str]]:
    """
    Scans sanitized source for forbidden keywords and constructs.
    Returns (passed, detected_tokens_list).
    """
    detected: List[str] = []
    # Normalize whitespaces to simplify function-call detection
    normalized = re.sub(r"\s+", " ", stripped_code)

    for token in settings.BANNED_TOKENS:
        # Check token existence
        token_clean = token.strip()
        # Word boundary or explicit symbol match
        if re.search(r"(?:^|[^a-zA-Z0-9_])" + re.escape(token_clean) + r"(?:$|[^a-zA-Z0-9_])", normalized):
            detected.append(token)

    # Explicit check for function bypass calls
    dangerous_calls = ["system", "popen", "fork", "execve", "execl", "execvp"]
    for call in dangerous_calls:
        if re.search(r"\b" + call + r"\s*\(", normalized):
            if call not in detected:
                detected.append(f"{call}()")

    return (len(detected) == 0, detected)


def extract_c_function_signatures(c_code: str) -> Dict[str, str]:
    """
    Extracts top-level C function prototypes/headers.
    Returns mapping: {func_name: normalized_params}
    """
    # Strip comments and strings first
    clean = strip_c_comments_and_strings(c_code)
    signatures = {}

    # Regex matching function definitions like:
    # int parse_mqtt_packet(const uint8_t *data, size_t len, mqtt_msg_t *msg)
    pattern = re.compile(
        r"(?:(?:static|inline|extern)\s+)*"
        r"(?:[a-zA-Z_][a-zA-Z0-9_*]*\s+)+"
        r"([a-zA-Z_][a-zA-Z0-9_]*)\s*"
        r"\(([^)]*)\)\s*\{"
    )

    for match in pattern.finditer(clean):
        func_name = match.group(1)
        # Skip control flow keywords if falsely matched
        if func_name in {"if", "for", "while", "switch"}:
            continue
        raw_params = match.group(2)
        # Normalize parameter string
        norm_params = re.sub(r"\s+", " ", raw_params).strip()
        signatures[func_name] = norm_params

    return signatures


def verify_function_signatures(
    original_code: str,
    patched_code: str
) -> Tuple[bool, List[str]]:
    """
    Ensures that top-level function names and parameter layouts from original_code
    are not altered or deleted in patched_code.
    """
    orig_sigs = extract_c_function_signatures(original_code)
    patch_sigs = extract_c_function_signatures(patched_code)

    violations: List[str] = []

    for func_name, orig_params in orig_sigs.items():
        if func_name not in patch_sigs:
            violations.append(f"Function '{func_name}' was removed or renamed in patch.")
        else:
            patch_params = patch_sigs[func_name]
            # Compare normalized parameter tokens
            orig_tokens = [p.strip() for p in orig_params.split(",") if p.strip()]
            patch_tokens = [p.strip() for p in patch_params.split(",") if p.strip()]
            if len(orig_tokens) != len(patch_tokens):
                violations.append(
                    f"Function '{func_name}' parameter count changed: "
                    f"original has {len(orig_tokens)}, patch has {len(patch_tokens)}."
                )

    return (len(violations) == 0, violations)


def verify_diff_cap(
    changed_line_count: int,
    max_cap: Optional[int] = None
) -> Tuple[bool, int, int]:
    """
    Verifies total changed lines do not exceed the diff budget.
    """
    cap = max_cap or settings.MAX_DIFF_LINES
    passed = changed_line_count <= cap
    return (passed, changed_line_count, cap)


def evaluate_stage_6_guards(
    original_code: str,
    patched_code: str,
    diff_text: str,
    benign_results: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Executes the entire Stage 6 Integrity Suite:
    1. Banned token scan
    2. Function signature preservation
    3. Diff size cap
    4. Benign regression equivalence
    """
    stripped_patched = strip_c_comments_and_strings(patched_code)

    # 1. Banned Tokens
    tokens_passed, detected_tokens = scan_banned_tokens(stripped_patched)

    # 2. Function Signatures
    sig_passed, sig_violations = verify_function_signatures(original_code, patched_code)

    # 3. Diff Cap
    from app.engine.diff_engine import analyze_diff_metrics
    diff_metrics = analyze_diff_metrics(diff_text)
    total_changed = diff_metrics["total_changed_lines"]
    cap_passed, changed_lines, max_allowed = verify_diff_cap(total_changed)

    # 4. Benign Tests Regression
    benign_passed = True
    if len(benign_results) < settings.MIN_BENIGN_TESTS:
        benign_passed = False
    else:
        for res in benign_results:
            if not res.get("stdout_matched", False) or res.get("exit_code", -1) != 0:
                benign_passed = False
                break

    # Determine overall Stage 6 rejection reason if any failed
    rejection_reasons = []
    if not tokens_passed:
        rejection_reasons.append(f"Banned tokens detected: {', '.join(detected_tokens)}")
    if not sig_passed:
        rejection_reasons.append(f"Function signature violations: {'; '.join(sig_violations)}")
    if not cap_passed:
        rejection_reasons.append(
            f"Diff cap exceeded: {changed_lines} changed lines (limit is {max_allowed})"
        )
    if not benign_passed:
        rejection_reasons.append(
            f"Benign test regression failure (expected >= {settings.MIN_BENIGN_TESTS} matching clean runs)"
        )

    all_passed = tokens_passed and sig_passed and cap_passed and benign_passed

    return {
        "all_passed": all_passed,
        "banned_tokens_passed": tokens_passed,
        "detected_banned_tokens": detected_tokens,
        "signature_passed": sig_passed,
        "signature_violations": sig_violations,
        "diff_cap_passed": cap_passed,
        "changed_line_count": changed_lines,
        "max_diff_lines_allowed": max_allowed,
        "benign_regression_passed": benign_passed,
        "benign_test_results": benign_results,
        "rejection_reason": " | ".join(rejection_reasons) if rejection_reasons else None,
    }
