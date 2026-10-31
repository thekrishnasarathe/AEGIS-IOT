import os, json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import RepairRequest
from .cwe_classifier import predict_cwe
from .verifier import execute_repair_pipeline

app = FastAPI(
    title="AEGIS-IoT Backend Engine (Trained AST Classifier + Multi-Cloud LLM + GCC ASan)",
    version="2.0.0"
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SAMPLES_META = {
    "s1_serial_overflow": {
        "title": "S1: UART Command Frame Parser (CWE-121 Stack Overflow)",
        "fn_name": "parse_uart_command"
    },
    "s2_mqtt_heap": {
        "title": "S2: MQTT Telemetry Topic Extractor (CWE-122 Heap Overflow)",
        "fn_name": "extract_mqtt_topic"
    },
    "s3_ota_null": {
        "title": "S3: OTA Firmware Header Parser (CWE-476 NULL Dereference)",
        "fn_name": "parse_ota_version"
    }
}

@app.get("/api/health")
def health():
    return {"status": "ok", "ml_classifier": "Multinomial_Softmax_AST_Classifier_v1 (95.0% LOOCV)", "compiler": "gcc -fsanitize=address,undefined"}

@app.get("/api/samples")
def list_samples():
    return SAMPLES_META

@app.post("/api/classify")
def classify_code(payload: dict):
    code = payload.get("code", "")
    return predict_cwe(code)

@app.post("/api/repair")
def repair_sample(req: RepairRequest):
    if req.sample_id not in SAMPLES_META:
        raise HTTPException(404, f"Unknown sample_id: {req.sample_id}")
    meta = SAMPLES_META[req.sample_id]
    sdir = os.path.join(BASE_DIR, "samples", req.sample_id)
    vuln = open(os.path.join(sdir, "target.c")).read()
    harn = open(os.path.join(sdir, "harness.c")).read()
    fallback = open(os.path.join(sdir, "target_patched.c")).read()
    return execute_repair_pipeline(
        sample_id=req.sample_id,
        title=meta["title"],
        vuln_code=vuln,
        harness_code=harn,
        expected_fn_name=meta["fn_name"],
        provider=req.provider,
        model=req.model,
        max_retries=req.max_retries,
        fallback_patched_code=fallback
    )

@app.get("/api/bench")
def get_bench():
    p = os.path.join(BASE_DIR, "bench", "results.json")
    if not os.path.exists(p):
        raise HTTPException(404, "Run cli_runner.py first to generate bench/results.json")
    return json.load(open(p))
