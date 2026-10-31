import os, re, json
import numpy as np
from typing import Dict, Any

WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "weights", "cwe_classifier_weights.json")

def extract_ast_features(code: str) -> list:
    clean = re.sub(r"(/\*[\s\S]*?\*/|//.*$)", "", code, flags=re.MULTILINE)
    has_stack_array = 1.0 if re.search(r"\b(char|uint8_t|int)\s+\w+\s*\[\s*\d+\s*\]", clean) else 0.0
    has_heap_alloc = 1.0 if re.search(r"\b(malloc|calloc|realloc)\s*\(", clean) else 0.0
    has_unbounded_str = 1.0 if re.search(r"\b(strcpy|strcat|sprintf|gets|sscanf)\s*\(", clean) else 0.0
    has_raw_memcpy = 1.0 if re.search(r"\b(memcpy|memmove)\s*\(", clean) else 0.0
    has_nullable_search = 1.0 if re.search(r"\b(strchr|strrchr|strstr|strtok)\s*\(", clean) else 0.0
    m_search = re.search(r"\b(strchr|strrchr|strstr|strtok)\s*\(", clean)
    after_search = clean[m_search.start():] if m_search else ""
    has_null_check = bool(re.search(r"if\s*\([^)]*(==\s*NULL|!\s*\w+)", after_search))
    has_missing_null_check = 1.0 if (has_nullable_search > 0 and not has_null_check) else 0.0
    has_free = 1.0 if re.search(r"\bfree\s*\(\s*(\w+)\s*\)", clean) else 0.0

    uaf_detected = 0.0
    for m in re.finditer(r"\bfree\s*\(\s*(\w+)\s*\)\s*;", clean):
        var = m.group(1)
        after = clean[m.end():]
        after_no_null = re.sub(rf"\b{re.escape(var)}\s*=\s*NULL\s*;", "", after)
        if re.search(rf"\b{re.escape(var)}\b", after_no_null):
            uaf_detected = 1.0

    has_bounds_guard = 1.0 if re.search(r"\b(strnlen|sizeof|strncpy)\b|if\s*\([^)]*(>=|>)\s*\w+", clean) else 0.0
    has_snprintf = 1.0 if re.search(r"\bsnprintf\s*\(", clean) else 0.0
    has_ptr_offset_deref = 1.0 if re.search(r"(\*\s*\(\s*\w+\s*\+|\b\w+\s*\+\s*\d+|\b\w+\s*\[\s*\d+\s*\])", clean) else 0.0
    has_null_reset = 1.0 if re.search(r"=\s*NULL\s*;", clean) else 0.0

    return [
        has_stack_array, has_heap_alloc, has_unbounded_str, has_raw_memcpy,
        has_nullable_search, has_missing_null_check, has_free, uaf_detected,
        has_bounds_guard, has_snprintf, has_ptr_offset_deref, has_null_reset
    ]

def predict_cwe(code: str) -> Dict[str, Any]:
    with open(WEIGHTS_PATH, "r") as f:
        model = json.load(f)
    feats = np.array(extract_ast_features(code), dtype=np.float64)
    W = np.array(model["W"], dtype=np.float64)
    b = np.array(model["b"], dtype=np.float64)
    logits = feats @ W + b
    logits -= np.max(logits)
    probs = np.exp(logits) / np.sum(np.exp(logits))
    classes = model["classes"]
    top_idx = int(np.argmax(probs))
    prob_map = {classes[i]: round(float(probs[i]), 4) for i in range(len(classes))}
    active_features = [model["feature_names"][i] for i, v in enumerate(feats) if v > 0]
    return {
        "predicted_class": classes[top_idx],
        "confidence": round(float(probs[top_idx]), 4),
        "probabilities": prob_map,
        "active_ast_features": active_features,
        "model_loocv_accuracy": model["loocv_accuracy"]
    }
