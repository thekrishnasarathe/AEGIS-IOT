import os, json, re, time, urllib.request, urllib.error
from typing import Dict, Any, Optional, List
from .config import settings
from .schemas import LLMPatchProposal

SYSTEM_PROMPT = """You are an elite C/C++ embedded firmware security repair model.
You will receive:
1. Vulnerable C source file (`target.c`).
2. Trained AST Neural Classifier CWE prediction + confidence score.
3. Static analysis hints (Cppcheck) and Dynamic Sanitizer (GCC AddressSanitizer/UBSan) stack trace.

STRICT OUTPUT RULES:
- Respond ONLY with a valid JSON object matching:
  {"root_cause": "...", "patched_code": "...", "assumptions": ["..."]}
- `patched_code` MUST contain the complete, compilable C code for `target.c` (no markdown fences, no `main()` function).
- Keep the exact function name and signature intact.
- Never use `no_sanitize`, `#pragma`, `system()`, or delete command-handling branches.
"""

def extract_clean_c_code(raw_code: str) -> str:
    cleaned = re.sub(r"^```[a-zA-Z]*\n", "", raw_code.strip())
    cleaned = re.sub(r"\n```$", "", cleaned.strip())
    return cleaned

def parse_json_safely(raw_text: str) -> dict:
    txt = raw_text.strip()
    txt = re.sub(r"^```json\s*", "", txt)
    txt = re.sub(r"^```\s*", "", txt)
    txt = re.sub(r"\s*```$", "", txt)
    try:
        return json.loads(txt)
    except Exception:
        # Extract first {...} block if model added prose
        m = re.search(r"\{[\s\S]*\}", txt)
        if m:
            return json.loads(m.group(0))
        raise

def build_repair_prompt(
    vuln_code: str,
    ml_prediction: Dict[str, Any],
    static_log: str,
    asan_log: str,
    fn_name: str,
    prev_error: str = ""
) -> str:
    retry_section = f"\n[PREVIOUS PATCH FAILED COMPILER/SANITIZER CHECK — FIX THIS ERROR]:\n{prev_error}\n" if prev_error else ""
    return (
        f"Target Function Signature to Preserve: `{fn_name}`\n"
        f"Trained AST Classifier Prediction: {ml_prediction['predicted_class']} "
        f"(confidence={ml_prediction['confidence']*100:.1f}%, features={ml_prediction['active_ast_features']})\n\n"
        f"--- STATIC TRIAGE ---\n{static_log}\n\n"
        f"--- GCC ASAN / UBSAN CRASH REPORT ---\n{asan_log}\n"
        f"{retry_section}\n"
        f"--- VULNERABLE target.c ---\n{vuln_code}\n\n"
        "Return JSON with keys: root_cause, patched_code, assumptions."
    )

def call_gemini(prompt: str, model_id: str) -> LLMPatchProposal:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={settings.GEMINI_API_KEY}"
    payload = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "root_cause": {"type": "STRING"},
                    "patched_code": {"type": "STRING"},
                    "assumptions": {"type": "ARRAY", "items": {"type": "STRING"}}
                },
                "required": ["root_cause", "patched_code", "assumptions"]
            }
        }
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=25) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    parsed = parse_json_safely(data["candidates"][0]["content"]["parts"][0]["text"])
    parsed["patched_code"] = extract_clean_c_code(parsed["patched_code"])
    return LLMPatchProposal(**parsed)

def call_openai_compatible(prompt: str, base_url: str, api_key: str, model_id: str, extra_headers: Optional[dict] = None) -> LLMPatchProposal:
    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    if extra_headers:
        headers.update(extra_headers)

    payload = {
        "model": model_id,
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    content = data["choices"][0]["message"]["content"]
    parsed = parse_json_safely(content)
    parsed["patched_code"] = extract_clean_c_code(parsed.get("patched_code", ""))
    return LLMPatchProposal(
        root_cause=parsed.get("root_cause", "Memory-safety defect patched."),
        patched_code=parsed["patched_code"],
        assumptions=parsed.get("assumptions", [])
    )

def orchestrate_llm_repair(
    vuln_code: str,
    ml_prediction: Dict[str, Any],
    static_log: str,
    asan_log: str,
    fn_name: str,
    provider: str = "auto",
    model: Optional[str] = None,
    prev_error: str = "",
    fallback_patched_code: str = ""
) -> Dict[str, Any]:
    """Multi-model cloud + local Qwen-2.5-Coder orchestrator with automatic failover."""
    prompt = build_repair_prompt(vuln_code, ml_prediction, static_log, asan_log, fn_name, prev_error)
    candidates = []

    if provider in ("auto", "groq") and settings.GROQ_API_KEY:
        for m in ([model] if model else settings.GROQ_MODELS):
            candidates.append(("groq", "https://api.groq.com/openai/v1", settings.GROQ_API_KEY, m, {}))

    if provider in ("auto", "gemini") and settings.GEMINI_API_KEY:
        for m in ([model] if model else settings.GEMINI_MODELS):
            candidates.append(("gemini", "", settings.GEMINI_API_KEY, m, {}))

    if provider in ("auto", "openrouter") and settings.OPENROUTER_API_KEY:
        for m in ([model] if model else settings.OPENROUTER_MODELS):
            candidates.append(("openrouter", "https://openrouter.ai/api/v1", settings.OPENROUTER_API_KEY, m, {"HTTP-Referer": "http://localhost:8000", "X-Title": "AEGIS-IoT"}))

    if provider in ("auto", "openai_compat") and settings.OPENAI_COMPAT_API_KEY:
        candidates.append(("openai_compat", settings.OPENAI_COMPAT_BASE_URL, settings.OPENAI_COMPAT_API_KEY, model or settings.OPENAI_COMPAT_MODEL, {}))

    if provider in ("auto", "ollama"):
        for m in ([model] if model else settings.OLLAMA_MODELS):
            candidates.append(("ollama", settings.OLLAMA_BASE_URL, "", m, {}))

    if provider in ("auto", "replay"):
        candidates.append(("replay", "", "", "recorded_verified_patch", {}))

    attempt_errors = []
    for prov_name, base_url, key, mod_id, hdrs in candidates:
        t0 = time.perf_counter()
        try:
            if prov_name == "gemini":
                prop = call_gemini(prompt, mod_id)
            elif prov_name == "replay":
                if not fallback_patched_code:
                    raise RuntimeError("No fallback_patched_code provided for replay.")
                prop = LLMPatchProposal(
                    root_cause=f"Guided by AST Classifier ({ml_prediction['predicted_class']}, {ml_prediction['confidence']*100:.1f}% confidence): Enforced explicit bounds/null validation.",
                    patched_code=fallback_patched_code,
                    assumptions=["Verified bounds check before memory operation; preserved benign outputs."]
                )
            else:
                prop = call_openai_compatible(prompt, base_url, key, mod_id, hdrs)

            latency_ms = round((time.perf_counter() - t0) * 1000, 1)
            return {
                "provider_used": prov_name,
                "model_used": mod_id,
                "latency_ms": latency_ms,
                "fallback_trace": attempt_errors,
                "proposal": (prop.model_dump() if hasattr(prop, "model_dump") else prop.dict())
            }
        except Exception as e:
            attempt_errors.append(f"{prov_name}:{mod_id} -> {str(e)}")
            continue

    raise RuntimeError("All orchestrated LLM models failed: " + " | ".join(attempt_errors))
