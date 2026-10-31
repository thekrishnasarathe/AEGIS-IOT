import os, re, json, math
import numpy as np

# Labeled C/C++ Firmware Vulnerability Training & Validation Corpus (5 classes)
# Classes: CWE-121 (Stack Overflow), CWE-122 (Heap Overflow), CWE-476 (NULL Deref), CWE-416 (Use-After-Free), SAFE (Patched/Benign)
CORPUS = [
    # --- CWE-121: Stack-Based Buffer Overflow ---
    ("CWE-121", "void f(const char *in) { char buf[16]; strcpy(buf, in); }"),
    ("CWE-121", "int parse_uart(const char *raw) { char cmd[32]; strcat(cmd, raw); return 0; }"),
    ("CWE-121", "void handle_msg(char *src, int n) { char local[64]; memcpy(local, src, n); }"),
    ("CWE-121", "int format_tag(const char *user) { char tag[12]; sprintf(tag, \"ID:%s\", user); return 1; }"),
    ("CWE-121", "void read_line(char *input) { char stack_arr[24]; gets(stack_arr); strcpy(stack_arr, input); }"),
    ("CWE-121", "int copy_header(const char *hdr, size_t len) { char tmp[8]; memmove(tmp, hdr, len); return tmp[0]; }"),
    ("CWE-121", "void build_topic(const char *sub) { char topic[20]; sprintf(topic, \"sensors/%s/data\", sub); }"),
    ("CWE-121", "int spi_frame(const char *payload) { char frame[16]; strcpy(frame, payload); return strlen(frame); }"),
    ("CWE-121", "void parse_kv(const char *val) { char key[10]; sscanf(val, \"%s\", key); strcpy(key, val); }"),
    ("CWE-121", "int ble_packet(const uint8_t *p, int sz) { uint8_t buf[32]; memcpy(buf, p, sz); return buf[0]; }"),
    ("CWE-121", "void log_err(const char *msg) { char line[40]; strcat(line, msg); sprintf(line, \"%s\", msg); }"),
    ("CWE-121", "int can_frame(const char *d, int l) { char s_buf[8]; memcpy(s_buf, d, l); return 0; }"),

    # --- CWE-122: Heap-Based Buffer Overflow ---
    ("CWE-122", "int mqtt_copy(const char *pkt, size_t len) { char *h = (char *)malloc(16); memcpy(h, pkt, len); free(h); return 0; }"),
    ("CWE-122", "void *alloc_frame(const char *src, int n) { char *p = malloc(24); strcpy(p, src); memcpy(p, src, n); return p; }"),
    ("CWE-122", "int heap_write(const char *in, size_t sz) { char *buf = (char *)calloc(10, 1); memcpy(buf, in, sz); free(buf); return 1; }"),
    ("CWE-122", "void parse_tlv(const uint8_t *raw, int decl_len) { uint8_t *chunk = malloc(32); memmove(chunk, raw, decl_len); free(chunk); }"),
    ("CWE-122", "int CoAP_opt(const char *opt, size_t olen) { char *heap_b = (char *)malloc(12); strcpy(heap_b, opt); memcpy(heap_b, opt, olen); free(heap_b); return 0; }"),
    ("CWE-122", "char *dup_payload(const char *s, size_t n) { char *dst = malloc(8); memcpy(dst, s, n); return dst; }"),
    ("CWE-122", "int modbus_pdu(const char *pdu, int plen) { char *ptr = (char *)malloc(20); memcpy(ptr, pdu, plen); free(ptr); return 0; }"),
    ("CWE-122", "void store_cred(const char *pw) { char *h_pw = (char *)calloc(16, sizeof(char)); strcpy(h_pw, pw); sprintf(h_pw, \"%s\", pw); free(h_pw); }"),
    ("CWE-122", "int zigbee_attr(const char *a, size_t alen) { char *m = malloc(14); memcpy(m, a, alen); free(m); return 0; }"),
    ("CWE-122", "voidexpand_buf(const char *src, size_t count) { char *dyn = (char *)malloc(32); memmove(dyn, src, count); free(dyn); }"),
    ("CWE-122", "int http_hdr_heap(const char *v, size_t vlen) { char *hb = malloc(28); memcpy(hb, v, vlen); free(hb); return 0; }"),
    ("CWE-122", "void lora_pkt(const char *p, int len) { char *b = (char *)calloc(18, 1); memcpy(b, p, len); free(b); }"),

    # --- CWE-476: NULL Pointer Dereference ---
    ("CWE-476", "int ota_ver(const char *hdr) { const char *c = strchr(hdr, ':'); return *(c + 1); }"),
    ("CWE-476", "void parse_delim(const char *s) { char *p = strstr(s, \"=\"); char ch = *p; while (*p == ' ') p++; }"),
    ("CWE-476", "int token_len(char *buf) { char *tok = strtok(buf, \",\"); return strlen(tok); }"),
    ("CWE-476", "int cfg_lookup(const char *line) { const char *eq = strchr(line, '='); const char *v = eq + 1; return *v; }"),
    ("CWE-476", "void read_sensor_node(struct Node *n) { char *sep = strrchr(n->path, '/'); printf(\"%c\", *(sep + 1)); }"),
    ("CWE-476", "int find_marker(const char *stream) { const char *m = strstr(stream, \"SYNC\"); return m[4]; }"),
    ("CWE-476", "int parse_port(const char *host) { const char *col = strchr(host, ':'); int port = atoi(col + 1); return port; }"),
    ("CWE-476", "void strip_ext(char *fname) { char *dot = strrchr(fname, '.'); *dot = '\\0'; }"),
    ("CWE-476", "int extract_id(const char *uri) { const char *slash = strchr(uri, '/'); return *(slash + 2); }"),
    ("CWE-476", "int check_sub(const char *msg) { char *p = strstr(msg, \"CMD:\"); return p[0] + *(p + 4); }"),
    ("CWE-476", "void split_pair(const char *kv) { const char *c = strchr(kv, ':'); const char *val = c + 1; while(*val) val++; }"),
    ("CWE-476", "int header_val(const char *h) { char *pos = strchr(h, ':'); return pos[1]; }"),

    # --- CWE-416: Use-After-Free ---
    ("CWE-416", "int uaf_pkt(char *in) { char *b = (char *)malloc(32); strcpy(b, in); free(b); return b[0]; }"),
    ("CWE-416", "void close_session(char *s) { char *ctx = malloc(64); free(ctx); printf(\"%s\", ctx); }"),
    ("CWE-416", "int retry_send(const char *d) { char *pkt = (char *)malloc(24); memcpy(pkt, d, 16); free(pkt); return strlen(pkt); }"),
    ("CWE-416", "void cleanup_node(char *buf) { char *p = calloc(16, 1); free(p); p[0] = 'X'; }"),
    ("CWE-416", "int handle_err(int err) { char *msg = malloc(32); if (err) free(msg); snprintf(msg, 32, \"code:%d\", err); return 0; }"),
    ("CWE-416", "void release_frame(char *f) { char *ptr = (char *)malloc(40); free(ptr); memcpy(f, ptr, 8); }"),
    ("CWE-416", "int double_use(const char *in) { char *m = malloc(16); free(m); strcpy(m, in); return 0; }"),
    ("CWE-416", "void log_after_free(void) { char *logb = (char *)malloc(20); free(logb); puts(logb); }"),
    ("CWE-416", "int parse_and_drop(void) { char *q = calloc(12, 1); free(q); return q[2]; }"),
    ("CWE-416", "void reset_state(char *out) { char *st = malloc(16); free(st); strcat(out, st); }"),
    ("CWE-416", "int read_freed_flag(void) { int *fl = (int *)malloc(sizeof(int)); *fl = 1; free(fl); return *fl; }"),
    ("CWE-416", "void dispatch_uaf(void) { char *cmd = malloc(24); free(cmd); if (cmd[0] == 'A') return; }"),

    # --- SAFE: Bounds-Checked / Null-Checked / Safe Firmware Code ---
    ("SAFE", "int safe_uart(const char *raw, char *out, size_t cap) { char buf[16]; size_t n = strnlen(raw, sizeof(buf)); if (n >= sizeof(buf)) return -1; memcpy(buf, raw, n); buf[n] = '\\0'; snprintf(out, cap, \"%s\", buf); return 0; }"),
    ("SAFE", "int safe_mqtt(const char *pkt, size_t len, char *out, size_t cap) { if (len >= 20) return -1; char *h = (char *)malloc(20); if (!h) return -2; memcpy(h, pkt, len); h[len] = '\\0'; snprintf(out, cap, \"%s\", h); free(h); return 0; }"),
    ("SAFE", "int safe_ota(const char *hdr, char *out, size_t cap) { const char *c = strchr(hdr, ':'); if (c == NULL) return -1; snprintf(out, cap, \"%s\", c + 1); return 0; }"),
    ("SAFE", "int safe_copy(const char *src, char *dst, size_t dst_size) { if (!src || !dst || dst_size == 0) return -1; snprintf(dst, dst_size, \"%s\", src); return 0; }"),
    ("SAFE", "int safe_heap_alloc(const char *in, size_t len) { if (len > 31) return -1; char *p = (char *)calloc(32, 1); if (p == NULL) return -2; memcpy(p, in, len); free(p); p = NULL; return 0; }"),
    ("SAFE", "int safe_delim(const char *line, char *val, size_t cap) { const char *eq = strchr(line, '='); if (!eq) return -1; strncpy(val, eq + 1, cap - 1); val[cap - 1] = '\\0'; return 0; }"),
    ("SAFE", "int safe_token(char *s, char *out, size_t cap) { char *tok = strtok(s, \",\"); if (tok == NULL) return -1; snprintf(out, cap, \"%s\", tok); return 0; }"),
    ("SAFE", "int safe_stack_frame(const char *p, size_t plen) { char f[32]; if (plen >= sizeof(f)) return -1; memcpy(f, p, plen); f[plen] = '\\0'; return 0; }"),
    ("SAFE", "int safe_uaf_fixed(const char *in, char *out, size_t cap) { char *b = (char *)malloc(32); if (!b) return -1; snprintf(b, 32, \"%s\", in); snprintf(out, cap, \"%s\", b); free(b); b = NULL; return 0; }"),
    ("SAFE", "int safe_strstr(const char *msg) { const char *m = strstr(msg, \"SYNC\"); if (m == NULL) return -1; return m[0]; }"),
    ("SAFE", "int safe_port_parse(const char *h) { const char *c = strchr(h, ':'); if (c == NULL) return -1; return atoi(c + 1); }"),
    ("SAFE", "int safe_sensor_read(const char *id, char *dst, size_t cap) { size_t l = strnlen(id, 16); if (l >= 16) return -1; snprintf(dst, cap, \"ID:%s\", id); return 0; }"),
]

CLASSES = ["CWE-121", "CWE-122", "CWE-476", "CWE-416", "SAFE"]
FEATURE_NAMES = [
    "has_stack_array",
    "has_heap_alloc",
    "has_unbounded_str_copy",
    "has_raw_memcpy_memmove",
    "has_nullable_str_search",
    "has_missing_null_check",
    "has_free_call",
    "has_use_after_free_pattern",
    "has_bounds_guard_sizeof_strnlen",
    "has_snprintf_safe_format",
    "has_pointer_offset_deref",
    "has_null_reset_after_free"
]

def extract_ast_features(code: str) -> list:
    # Strip comments
    clean = re.sub(r"(/\*[\s\S]*?\*/|//.*$)", "", code, flags=re.MULTILINE)
    has_stack_array = 1.0 if re.search(r"\b(char|uint8_t|int)\s+\w+\s*\[\s*\d+\s*\]", clean) else 0.0
    has_heap_alloc = 1.0 if re.search(r"\b(malloc|calloc|realloc)\s*\(", clean) else 0.0
    has_unbounded_str = 1.0 if re.search(r"\b(strcpy|strcat|sprintf|gets|sscanf)\s*\(", clean) else 0.0
    has_raw_memcpy = 1.0 if re.search(r"\b(memcpy|memmove)\s*\(", clean) else 0.0
    has_nullable_search = 1.0 if re.search(r"\b(strchr|strrchr|strstr|strtok)\s*\(", clean) else 0.0

    # Check if strchr/strstr/strtok is used without an if (... == NULL) or if (!...) check
    m_search = re.search(r"\b(strchr|strrchr|strstr|strtok)\s*\(", clean)
    after_search = clean[m_search.start():] if m_search else ""
    has_null_check = bool(re.search(r"if\s*\([^)]*(==\s*NULL|!\s*\w+)", after_search))
    has_missing_null_check = 1.0 if (has_nullable_search > 0 and not has_null_check) else 0.0

    has_free = 1.0 if re.search(r"\bfree\s*\(\s*(\w+)\s*\)", clean) else 0.0
    # Check if variable passed to free(var) is used after free(var) without var = NULL
    uaf_detected = 0.0
    for m in re.finditer(r"\bfree\s*\(\s*(\w+)\s*\)\s*;", clean):
        var = m.group(1)
        after = clean[m.end():]
        # Remove `var = NULL` from `after`
        after_no_null = re.sub(rf"\b{re.escape(var)}\s*=\s*NULL\s*;", "", after)
        if re.search(rf"\b{re.escape(var)}\b", after_no_null):
            uaf_detected = 1.0

    has_bounds_guard = 1.0 if re.search(r"\b(strnlen|sizeof|strncpy)\b|if\s*\([^)]*(>=|>)\s*\w+", clean) else 0.0
    has_snprintf = 1.0 if re.search(r"\bsnprintf\s*\(", clean) else 0.0
    has_ptr_offset_deref = 1.0 if re.search(r"(\*\s*\(\s*\w+\s*\+|\b\w+\s*\+\s*\d+|\b\w+\s*\[\s*\d+\s*\])", clean) else 0.0
    has_null_reset = 1.0 if re.search(r"=\s*NULL\s*;", clean) else 0.0

    return [
        has_stack_array,
        has_heap_alloc,
        has_unbounded_str,
        has_raw_memcpy,
        has_nullable_search,
        has_missing_null_check,
        has_free,
        uaf_detected,
        has_bounds_guard,
        has_snprintf,
        has_ptr_offset_deref,
        has_null_reset
    ]

# Build dataset matrices
X = np.array([extract_ast_features(c) for _, c in CORPUS], dtype=np.float64)
y_idx = np.array([CLASSES.index(lbl) for lbl, _ in CORPUS], dtype=np.int64)
N, D = X.shape
K = len(CLASSES)
Y_onehot = np.eye(K)[y_idx]

# Train Multinomial Logistic Regression (Softmax Neural Classifier) via Gradient Descent with L2 Regularization
np.random.seed(42)
W = np.zeros((D, K), dtype=np.float64)
b = np.zeros((1, K), dtype=np.float64)

lr = 0.45
reg = 0.002
epochs = 1200
loss_history = []

for ep in range(epochs):
    logits = X @ W + b
    logits -= np.max(logits, axis=1, keepdims=True)
    exp_l = np.exp(logits)
    probs = exp_l / np.sum(exp_l, axis=1, keepdims=True)

    ce_loss = -np.mean(np.sum(Y_onehot * np.log(probs + 1e-12), axis=1)) + 0.5 * reg * np.sum(W * W)
    if ep % 200 == 0 or ep == epochs - 1:
        loss_history.append({"epoch": ep, "loss": round(float(ce_loss), 5)})

    dlogits = (probs - Y_onehot) / N
    dW = X.T @ dlogits + reg * W
    db = np.sum(dlogits, axis=0, keepdims=True)
    W -= lr * dW
    b -= lr * db

# Evaluate training accuracy and Leave-One-Out Cross-Validation (LOOCV) accuracy
logits_final = X @ W + b
preds = np.argmax(logits_final, axis=1)
train_acc = float(np.mean(preds == y_idx))

loocv_correct = 0
confusion = [[0]*K for _ in range(K)]
for i in range(N):
    X_tr = np.delete(X, i, axis=0)
    Y_tr = np.delete(Y_onehot, i, axis=0)
    W_cv = np.zeros((D, K), dtype=np.float64)
    b_cv = np.zeros((1, K), dtype=np.float64)
    for _ in range(600):
        lg = X_tr @ W_cv + b_cv
        lg -= np.max(lg, axis=1, keepdims=True)
        pr = np.exp(lg) / np.sum(np.exp(lg), axis=1, keepdims=True)
        dl = (pr - Y_tr) / (N - 1)
        W_cv -= 0.45 * (X_tr.T @ dl + reg * W_cv)
        b_cv -= 0.45 * np.sum(dl, axis=0, keepdims=True)
    lg_test = X[i:i+1] @ W_cv + b_cv
    pred_i = int(np.argmax(lg_test))
    confusion[int(y_idx[i])][pred_i] += 1
    if pred_i == y_idx[i]:
        loocv_correct += 1

loocv_acc = round(loocv_correct / N, 4)
print(f"Trained CWE Neural Softmax Classifier on {N} C functions ({D} AST features, {K} classes)")
print(f"Final Loss: {loss_history[-1]['loss']} | Train Accuracy: {train_acc*100:.1f}% | LOOCV Accuracy: {loocv_acc*100:.1f}%")
print("LOOCV Confusion Matrix (rows=true, cols=pred):", confusion)

weights_artifact = {
    "model_type": "Multinomial_Softmax_AST_Classifier_v1",
    "classes": CLASSES,
    "feature_names": FEATURE_NAMES,
    "num_samples": N,
    "train_accuracy": round(train_acc, 4),
    "loocv_accuracy": loocv_acc,
    "confusion_matrix": confusion,
    "loss_history": loss_history,
    "W": W.tolist(),
    "b": b[0].tolist()
}

os.makedirs("artifacts/file_generation/ttl=63d/intermediate/aegis-backend-only/app/weights", exist_ok=True)
with open("artifacts/file_generation/ttl=63d/intermediate/aegis-backend-only/app/weights/cwe_classifier_weights.json", "w") as f:
    json.dump(weights_artifact, f, indent=2)
