# filepath: backend/app/engine/llm_router.py
"""
Multi-Provider LLM Synthesis Router with Fail-Safe Stage Insurance.
Supports:
1. MULTI-CLOUD FAST LANE (Groq qwen-2.5-coder-32b -> Gemini 2.5 Flash -> OpenRouter Free)
2. LOCAL OLLAMA (qwen3.5:4b air-gapped on-premises)
3. STAGE INSURANCE FIXTURE (Deterministic ground-truth fallback)
"""

import os
import re
import time
import hashlib
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, Tuple, Optional, List
import httpx

from app.schemas.run import ExecutionLane, Provenance, RunState
from app.fixtures.replay_data import get_replay_sample

logger = logging.getLogger("aegis.llm_router")

# Auto-load root .env if present
_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))
if os.path.exists(_env_path):
    try:
        with open(_env_path, "r", encoding="utf-8") as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    _k, _v = _k.strip(), _v.strip().strip('"').strip("'")
                    if _k and _k not in os.environ:
                        os.environ[_k] = _v
    except Exception:
        pass


class LLMRouter:
    def __init__(self):
        # Cloud API Settings
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        self.groq_model = os.getenv("GROQ_MODEL", "qwen-2.5-coder-32b")

        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.openrouter_model = os.getenv("OPENROUTER_MODEL", "openrouter/free")

        # Generic OpenAI-compatible Cloud
        self.cloud_api_key = os.getenv("AEGIS_LLM_API_KEY", "")
        self.cloud_base_url = os.getenv("AEGIS_LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        self.cloud_model = os.getenv("AEGIS_LLM_MODEL", "gpt-4o-mini")

        # Local Ollama Settings
        self.ollama_url = os.getenv("AEGIS_OLLAMA_URL", os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434/api/generate"))
        if not self.ollama_url.endswith("/api/generate"):
            self.ollama_url = self.ollama_url.rstrip("/") + "/api/generate"
        self.ollama_model = os.getenv("AEGIS_OLLAMA_MODEL", os.getenv("OLLAMA_MODEL", "qwen3.5:4b"))
        self.ollama_timeout = float(os.getenv("AEGIS_OLLAMA_TIMEOUT", "45.0"))

    def _sync_post_json(self, url: str, data: Dict[str, Any], headers: Dict[str, str], timeout: float) -> Tuple[int, Dict[str, Any]]:
        """Makes synchronous JSON POST request using standard library urllib."""
        payload_bytes = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(url, data=payload_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = resp.status
            body = resp.read().decode("utf-8")
            return status, json.loads(body)

    def build_prompt(
        self,
        original_c: str,
        cppcheck_hint: str,
        asan_trace: str,
        error_feedback: Optional[str] = None,
        attempt: int = 1,
        cwe_hint: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Builds the grounded system + user prompt with few-shot CVEfixes repair pattern and computes a SHA-256 prompt hash.
        """
        feedback_section = ""
        if error_feedback and attempt > 1:
            feedback_section = f"""
CRITICAL FEEDBACK FROM ATTEMPT {attempt - 1}:
Your previous patch failed deterministic verification with the following error:
---
{error_feedback}
---
Analyze the exact compiler or sanitizer failure above. Correct this specific defect in your new patch!
"""

        few_shot_section = ""
        if cwe_hint:
            try:
                from app.engine.cwe_classifier import retrieve_cvefixes_example
                example = retrieve_cvefixes_example(cwe_hint)
                if example:
                    few_shot_section = f"""
=== VERIFIED FEW-SHOT CVE REPAIR PATTERN ({example['cve_id']} for {example['cwe']}) ===
// Vulnerable Pattern:
{example['vulnerable_c']}

// Verified Repair Pattern:
{example['fixed_c']}
"""
            except Exception:
                pass

        prompt = f"""You are the AEGIS-IoT Automated Firmware Repair Agent.
Your task is to repair a memory-safety vulnerability in embedded C firmware.
{few_shot_section}
=== ORIGINAL VULNERABLE SOURCE (target.c) ===
{original_c}

=== STATIC ANALYSIS EVIDENCE (Stage 1 - cppcheck) ===
{cppcheck_hint}

=== DYNAMIC CRASH EVIDENCE (Stage 2 - AddressSanitizer) ===
{asan_trace}
{feedback_section}
=== STRICT COMPLIANCE & INTEGRITY GUARD RULES ===
1. Return the COMPLETE, compilable patched 'target.c' inside a single ```c ... ``` code fence.
2. PRESERVE FUNCTION SIGNATURES: Do NOT change function names, return types, or parameter signatures.
3. FORBIDDEN BYPASS CONSTRUCTS: You MUST NEVER use:
   - 'no_sanitize', '-fno-sanitize', '__asan', 'ASAN_'
   - '#pragma', '__attribute__'
   - inline assembly ('asm', '__asm__')
   - process execution calls ('system', 'exec', 'popen', 'fork')
   Doing so will result in immediate REJECTED verdict by the Stage 6 integrity guards.
4. Keep modifications minimal, surgical, and idiomatic C (target <= 35 changed lines).
5. Ensure all benign inputs continue to function identically (preserve protocol behavior).

Provide your complete patched 'target.c' inside ```c ... ```:
"""
        prompt_hash = hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:16]
        return prompt, prompt_hash

    @staticmethod
    def extract_c_code(response_text: str) -> str:
        """Extracts C code from markdown code block if present."""
        code_block = re.search(r"```(?:c|cpp)?\s*([\s\S]*?)```", response_text, re.IGNORECASE)
        if code_block:
            return code_block.group(1).strip()
        return response_text.strip()

    async def propose_patch(
        self,
        run_state: RunState,
        sample_id: str,
        attempt: int = 1,
        error_feedback: Optional[str] = None,
        provider_preference: str = "auto",
    ) -> Dict[str, Any]:
        """
        Routes patch synthesis across Multi-Cloud -> Local Ollama (qwen3.5:4b) -> Stage Insurance.
        Returns provider_used, model_used, latency_ms, fallback_trace.
        """
        start_time = time.time()
        sample = get_replay_sample(sample_id) or get_replay_sample("iot_mqtt_parser")
        orig_c = sample["original_code"]
        cppcheck_hint = run_state.raw_logs.get("stage_1_cppcheck", "Static hint: buffer boundary unchecked")
        asan_trace = run_state.raw_logs.get("stage_2_asan_repro", "ASan crash trace")

        cwe_hint = (
            run_state.pre_patch_ml.get("predicted_class")
            if (run_state and run_state.pre_patch_ml)
            else sample.get("cwe", "CWE-121")
        )

        prompt, prompt_hash = self.build_prompt(
            original_c=orig_c,
            cppcheck_hint=cppcheck_hint,
            asan_trace=asan_trace,
            error_feedback=error_feedback,
            attempt=attempt,
            cwe_hint=cwe_hint,
        )

        lane = run_state.lane
        fallback_trace: List[str] = []

        # ----------------------------------------------------------------------
        # FAST LANE: MULTI-CLOUD APIS (Groq -> Gemini -> OpenRouter)
        # ----------------------------------------------------------------------
        should_try_cloud = (
            lane == ExecutionLane.CLOUD_LLM or
            provider_preference in ["auto", "cloud"]
        ) and (lane != ExecutionLane.REPLAY_FIXTURE)

        if should_try_cloud:
            # 1. Try Groq (qwen-2.5-coder-32b)
            if self.groq_api_key:
                try:
                    t0 = time.time()
                    payload = {
                        "model": self.groq_model,
                        "messages": [
                            {"role": "system", "content": "You are AEGIS-IoT, an expert embedded C firmware security repair engine. Output only C code inside ```c ... ```."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.1,
                        "max_tokens": 1500,
                    }
                    headers = {
                        "Authorization": f"Bearer {self.groq_api_key}",
                        "Content-Type": "application/json",
                    }
                    status, data = self._sync_post_json(
                        "https://api.groq.com/openai/v1/chat/completions",
                        payload,
                        headers,
                        timeout=2.5
                    )
                    if status == 200:
                        raw_c = data["choices"][0]["message"]["content"]
                        patched_c = self.extract_c_code(raw_c)
                        elapsed_ms = round((time.time() - t0) * 1000.0, 2)
                        fallback_trace.append(f"groq: success ({self.groq_model}, {elapsed_ms}ms)")
                        return {
                            "patched_c": patched_c,
                            "model_id": f"groq:{self.groq_model}",
                            "provider_used": "groq",
                            "model_used": self.groq_model,
                            "latency_ms": elapsed_ms,
                            "fallback_trace": fallback_trace,
                            "explanation": f"Synthesized via Groq {self.groq_model} (attempt {attempt}).",
                            "prompt_hash": prompt_hash,
                            "provenance": Provenance.LOCAL_SUBPROCESS,
                        }
                except Exception as e:
                    fallback_trace.append(f"groq: failed ({e})")
            else:
                fallback_trace.append("groq: skipped (no GROQ_API_KEY)")

            # 2. Try Google Gemini (gemini-2.5-flash)
            if self.gemini_api_key:
                try:
                    t0 = time.time()
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_api_key}"
                    payload = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1500},
                    }
                    headers = {"Content-Type": "application/json"}
                    status, data = self._sync_post_json(url, payload, headers, timeout=2.5)
                    if status == 200:
                        raw_c = data["candidates"][0]["content"]["parts"][0]["text"]
                        patched_c = self.extract_c_code(raw_c)
                        elapsed_ms = round((time.time() - t0) * 1000.0, 2)
                        fallback_trace.append(f"gemini: success ({self.gemini_model}, {elapsed_ms}ms)")
                        return {
                            "patched_c": patched_c,
                            "model_id": f"gemini:{self.gemini_model}",
                            "provider_used": "gemini",
                            "model_used": self.gemini_model,
                            "latency_ms": elapsed_ms,
                            "fallback_trace": fallback_trace,
                            "explanation": f"Synthesized via Google Gemini {self.gemini_model} (attempt {attempt}).",
                            "prompt_hash": prompt_hash,
                            "provenance": Provenance.LOCAL_SUBPROCESS,
                        }
                except Exception as e:
                    fallback_trace.append(f"gemini: failed ({e})")
            else:
                fallback_trace.append("gemini: skipped (no GEMINI_API_KEY)")

            # 3. Try OpenRouter Free Router (openrouter/free)
            if self.openrouter_api_key:
                try:
                    t0 = time.time()
                    payload = {
                        "model": self.openrouter_model,
                        "messages": [
                            {"role": "system", "content": "You are AEGIS-IoT, an expert embedded C firmware security repair engine. Output only C code inside ```c ... ```."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.1,
                        "max_tokens": 1500,
                    }
                    headers = {
                        "Authorization": f"Bearer {self.openrouter_api_key}",
                        "Content-Type": "application/json",
                    }
                    status, data = self._sync_post_json(
                        "https://openrouter.ai/api/v1/chat/completions",
                        payload,
                        headers,
                        timeout=2.5
                    )
                    if status == 200:
                        raw_c = data["choices"][0]["message"]["content"]
                        patched_c = self.extract_c_code(raw_c)
                        elapsed_ms = round((time.time() - t0) * 1000.0, 2)
                        fallback_trace.append(f"openrouter: success ({self.openrouter_model}, {elapsed_ms}ms)")
                        return {
                            "patched_c": patched_c,
                            "model_id": f"openrouter:{self.openrouter_model}",
                            "provider_used": "openrouter",
                            "model_used": self.openrouter_model,
                            "latency_ms": elapsed_ms,
                            "fallback_trace": fallback_trace,
                            "explanation": f"Synthesized via OpenRouter {self.openrouter_model} (attempt {attempt}).",
                            "prompt_hash": prompt_hash,
                            "provenance": Provenance.LOCAL_SUBPROCESS,
                        }
                except Exception as e:
                    fallback_trace.append(f"openrouter: failed ({e})")
            else:
                fallback_trace.append("openrouter: skipped (no OPENROUTER_API_KEY)")

            # 4. Try Generic Cloud LLM (AEGIS_LLM_API_KEY)
            if self.cloud_api_key:
                try:
                    t0 = time.time()
                    headers = {
                        "Authorization": f"Bearer {self.cloud_api_key}",
                        "Content-Type": "application/json",
                    }
                    payload = {
                        "model": self.cloud_model,
                        "messages": [
                            {"role": "system", "content": "You are AEGIS-IoT, an expert embedded C firmware security repair engine. Output only C code inside ```c ... ```."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.1,
                        "max_tokens": 1500,
                    }
                    async with httpx.AsyncClient(timeout=2.5) as client:
                        resp = await client.post(f"{self.cloud_base_url}/chat/completions", headers=headers, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            raw_content = data["choices"][0]["message"]["content"]
                            patched_c = self.extract_c_code(raw_content)
                            elapsed_ms = round((time.time() - t0) * 1000.0, 2)
                            fallback_trace.append(f"cloud: success ({self.cloud_model}, {elapsed_ms}ms)")
                            return {
                                "patched_c": patched_c,
                                "model_id": f"cloud:{self.cloud_model}",
                                "provider_used": "cloud",
                                "model_used": self.cloud_model,
                                "latency_ms": elapsed_ms,
                                "fallback_trace": fallback_trace,
                                "explanation": f"Synthesized via {self.cloud_model} (attempt {attempt}).",
                                "prompt_hash": prompt_hash,
                                "provenance": Provenance.LOCAL_SUBPROCESS,
                            }
                except Exception as e:
                    fallback_trace.append(f"cloud: failed ({e})")

        # ----------------------------------------------------------------------
        # AIR-GAPPED ON-PREMISES: LOCAL OLLAMA (qwen3.5:4b)
        # ----------------------------------------------------------------------
        should_try_ollama = (
            lane == ExecutionLane.LOCAL_OLLAMA or
            provider_preference in ["auto", "ollama", "ollama_deep"] or
            should_try_cloud
        ) and (lane != ExecutionLane.REPLAY_FIXTURE)

        if should_try_ollama:
            is_deep = (provider_preference == "ollama_deep")
            ollama_active = False

            # Fast 0.3s health ping check to avoid stalling if Ollama daemon is offline or cold
            try:
                base_health_url = self.ollama_url.replace("/api/generate", "/api/tags")
                async with httpx.AsyncClient(timeout=0.3) as health_client:
                    h_res = await health_client.get(base_health_url)
                    if h_res.status_code == 200:
                        ollama_active = True
            except Exception:
                ollama_active = False
                fallback_trace.append("ollama: offline or slow response (>0.3s health ping)")

            if ollama_active or is_deep:
                gen_timeout = self.ollama_timeout if is_deep else 3.0
                try:
                    t0 = time.time()
                    payload = {
                        "model": self.ollama_model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {"temperature": 0.1, "num_predict": 1200},
                    }
                    async with httpx.AsyncClient(timeout=gen_timeout) as client:
                        resp = await client.post(self.ollama_url, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            raw_content = data.get("response", "")
                            patched_c = self.extract_c_code(raw_content)
                            if patched_c and len(patched_c) > 20:
                                elapsed_ms = round((time.time() - t0) * 1000.0, 2)
                                fallback_trace.append(f"ollama: success ({self.ollama_model}, {elapsed_ms}ms)")
                                return {
                                    "patched_c": patched_c,
                                    "model_id": f"ollama:{self.ollama_model}",
                                    "provider_used": "ollama",
                                    "model_used": self.ollama_model,
                                    "latency_ms": elapsed_ms,
                                    "fallback_trace": fallback_trace,
                                    "explanation": f"Synthesized locally via Ollama {self.ollama_model} (attempt {attempt}).",
                                    "prompt_hash": prompt_hash,
                                    "provenance": Provenance.LOCAL_SUBPROCESS,
                                }
                except Exception as e:
                    fallback_trace.append(f"ollama: failed ({e})")

        # ----------------------------------------------------------------------
        # STAGE INSURANCE DETERMINISTIC FALLBACK (REPLAY_FIXTURE)
        # ----------------------------------------------------------------------
        elapsed_total_ms = round((time.time() - start_time) * 1000.0, 2)
        fallback_trace.append(f"stage_insurance: engaged ground-truth fixture ({elapsed_total_ms}ms)")

        if sample_id == "iot_adversarial_guard_demo":
            chosen_patch = sample.get("bypassing_patch", sample["original_code"])
            expl = "Simulated adversarial synthesis attempt with __attribute__((no_sanitize('address')))."
        else:
            chosen_patch = sample.get("verified_patch", sample["original_code"])
            expl = "Synthesized boundary validation checking lengths before copy (ground-truth fixture fallback)."

        run_state.provenance = Provenance.FIXTURE_FALLBACK

        return {
            "patched_c": chosen_patch,
            "model_id": "aegis-stage-insurance-fixture",
            "provider_used": "stage_insurance",
            "model_used": "aegis-stage-insurance-fixture",
            "latency_ms": elapsed_total_ms,
            "fallback_trace": fallback_trace,
            "explanation": expl,
            "prompt_hash": prompt_hash,
            "provenance": Provenance.FIXTURE_FALLBACK,
        }


llm_router = LLMRouter()

