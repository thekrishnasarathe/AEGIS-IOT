import os, json
from app.verifier import execute_repair_pipeline
from app.main import SAMPLES_META

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def main():
    results = []
    for sid, meta in SAMPLES_META.items():
        sdir = os.path.join(BASE_DIR, "samples", sid)
        vuln = open(os.path.join(sdir, "target.c")).read()
        harn = open(os.path.join(sdir, "harness.c")).read()
        patched = open(os.path.join(sdir, "target_patched.c")).read()
        res = execute_repair_pipeline(
            sample_id=sid,
            title=meta["title"],
            vuln_code=vuln,
            harness_code=harn,
            expected_fn_name=meta["fn_name"],
            provider="auto",
            fallback_patched_code=patched,
            run_label="verified"
        )
        results.append(res)
        print(
            f"[{sid}] Pre-ML: {res['cwe_ml_prediction']['predicted_class']} ({res['cwe_ml_prediction']['confidence']*100:.1f}%) "
            f"-> Post-ML: {res['post_patch_ml_prediction']['predicted_class']} ({res['post_patch_ml_prediction']['probabilities']['SAFE']*100:.1f}% SAFE) "
            f"| Verdict: {res['verdict']} | .text delta: {res['resources']['text_delta_bytes']}B"
        )

    # Also run the intentional anti-cheat guard rejection test on S1
    s1_dir = os.path.join(BASE_DIR, "samples", "s1_serial_overflow")
    res_reject = execute_repair_pipeline(
        sample_id="s1_serial_overflow",
        title="S1 [ANTI-CHEAT GUARD TEST]: Trivial Function-Deletion Patch",
        vuln_code=open(os.path.join(s1_dir, "target.c")).read(),
        harness_code=open(os.path.join(s1_dir, "harness.c")).read(),
        expected_fn_name="parse_uart_command",
        provider="replay",
        fallback_patched_code=open(os.path.join(s1_dir, "target_cheating.c")).read(),
        run_label="rejected_guard"
    )
    results.append(res_reject)
    print(f"[s1_anti_cheat] Verdict: {res_reject['verdict']}")

    os.makedirs(os.path.join(BASE_DIR, "bench"), exist_ok=True)
    with open(os.path.join(BASE_DIR, "bench", "results.json"), "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()
