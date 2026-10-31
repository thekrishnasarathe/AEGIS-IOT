# AEGIS-IoT Backend-Only Package (For Coding Agent Handoff)

This directory contains **only the backend, trained CWE ML model, multi-cloud LLM orchestrator, and C split-harness verification engine** (no frontend clutter) so an AI coding agent (Cursor / Windsurf / Claude Code) can read the entire codebase in seconds and extend it.

## Directory Structure
- `app/train_cwe_classifier.py`: Trains our 5-class **Multinomial Softmax AST Neural Classifier** (`CWE-121`, `CWE-122`, `CWE-476`, `CWE-416`, `SAFE`) on 60 C functions using 12 AST features with Leave-One-Out Cross-Validation (**95.0% LOOCV accuracy**) and exports weights to `app/weights/cwe_classifier_weights.json`.
- `app/cwe_classifier.py`: Runs sub-millisecond CWE classification before and after patching (verifying that a vulnerable function transitions from e.g. `CWE-121 (99.4%)` to `SAFE (92.9%)`).
- `app/model_provider.py`: Multi-model orchestrator (`orchestrate_llm_repair`) supporting **Qwen 2.5 Coder 32B** (via Groq), **Gemini 2.5 Flash** (via Google AI Studio), **OpenRouter Free Router** (`openrouter/free`, `cohere/north-mini-code:free`, `google/gemma-4-31b-it:free`), **Local Ollama** (`qwen2.5-coder:7b`), and deterministic **Recorded Replay** fallback.
- `app/verifier.py`: Executes the 7-stage deterministic verification ladder (`gcc -fsanitize=address,undefined`, read-only `harness.c` separation, 5 anti-cheat guards, and `-O2` binary `size` / runtime profiling).
- `app/main.py`: FastAPI REST endpoints (`/api/health`, `/api/samples`, `/api/classify`, `/api/repair`, `/api/bench`).
- `cli_runner.py`: Standalone CLI verifier that runs all samples end-to-end and writes `bench/results.json`.

## Commands for the Coding Agent
```bash
# 1. Re-train the AST CWE Classifier (writes app/weights/cwe_classifier_weights.json)
python3 app/train_cwe_classifier.py

# 2. Run the full 7-stage CLI verification suite (writes bench/results.json)
python3 cli_runner.py

# 3. Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
