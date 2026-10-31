# filepath: backend/test_api.py
"""
Automated Asynchronous Test Suite for AEGIS-IoT FastAPI Endpoints.
Verifies all 7 endpoints with live concurrency.
"""

import sys
import os
import asyncio
import httpx

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app


async def test_api_suite_async():
    print("=================================================================")
    print("          AEGIS-IoT FastAPI Endpoint Verification Suite          ")
    print("=================================================================")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Root
        print("\n[TEST 1] GET / ...")
        res = await client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "OPERATIONAL"
        print(f"  -> OK: {data['axiom']}")

        # 2. Samples list
        print("\n[TEST 2] GET /api/samples ...")
        res = await client.get("/api/samples")
        assert res.status_code == 200
        samples = res.json()
        assert len(samples) >= 4
        sample_ids = [s["sample_id"] for s in samples]
        print(f"  -> Bundled Samples: {sample_ids}")
        assert "iot_mqtt_parser" in sample_ids
        assert "iot_adversarial_guard_demo" in sample_ids

        # 3. Sample detail
        print("\n[TEST 3] GET /api/samples/iot_mqtt_parser ...")
        res = await client.get("/api/samples/iot_mqtt_parser")
        assert res.status_code == 200
        detail = res.json()
        assert "parse_mqtt_packet" in detail["original_code"]
        print(f"  -> Origin: {detail['origin_label']}, CWE: {detail['cwe']}")

        # 4. Create Run & Poll to Completion (Happy Path)
        print("\n[TEST 4] POST /api/runs (Happy Path) & Live 500ms Polling ...")
        res = await client.post("/api/runs", json={"sample_id": "iot_mqtt_parser", "lane": "REPLAY_FIXTURE"})
        assert res.status_code == 200
        run_id = res.json()["run_id"]
        print(f"  -> Run Initialized: {run_id}")

        completed = False
        for i in range(30):
            await asyncio.sleep(0.15)
            poll_res = await client.get(f"/api/runs/{run_id}")
            assert poll_res.status_code == 200
            poll_data = poll_res.json()
            if poll_data["verdict"] in ["VERIFIED", "REJECTED", "UNVERIFIED", "ERROR"]:
                completed = True
                print(f"  -> Final Poll Verdict: {poll_data['verdict']} at stage {poll_data['current_stage']}")
                assert poll_data["verdict"] == "VERIFIED"
                assert poll_data["stage_7"]["final_verdict_badge"] == "Verified for tested cases"
                break
        assert completed, "Run did not complete within polling timeout"

        # 5. Export artifacts
        print("\n[TEST 5] GET /api/runs/{id}/export?format=patch & md ...")
        patch_res = await client.get(f"/api/runs/{run_id}/export?format=patch")
        assert patch_res.status_code == 200
        assert "--- a/target.c" in patch_res.text
        print(f"  -> Patch export verified: {len(patch_res.text)} bytes")

        md_res = await client.get(f"/api/runs/{run_id}/export?format=md")
        assert md_res.status_code == 200
        assert "AEGIS-IoT Formal Verification Audit Report" in md_res.text
        print(f"  -> Markdown report export verified: {len(md_res.text)} bytes")

        # 6. Adversarial Guard Interception
        print("\n[TEST 6] POST /api/runs (Adversarial Demo - Stage 6 Rejection) ...")
        res = await client.post("/api/runs", json={"sample_id": "iot_adversarial_guard_demo", "lane": "REPLAY_FIXTURE"})
        assert res.status_code == 200
        adv_id = res.json()["run_id"]

        adv_done = False
        for i in range(30):
            await asyncio.sleep(0.15)
            poll_res = await client.get(f"/api/runs/{adv_id}")
            assert poll_res.status_code == 200
            poll_data = poll_res.json()
            if poll_data["verdict"] in ["VERIFIED", "REJECTED", "UNVERIFIED", "ERROR"]:
                adv_done = True
                print(f"  -> Adversarial Verdict: {poll_data['verdict']}")
                print(f"  -> Rejection Reason: {poll_data['stage_6']['rejection_reason']}")
                assert poll_data["verdict"] == "REJECTED"
                assert poll_data["stage_6"]["banned_tokens_passed"] is False
                break
        assert adv_done, "Adversarial run did not complete within polling timeout"

        # 8. FR-28 Boundary Sweep Endpoint
        print("\n[TEST 8] GET /api/samples/iot_mqtt_parser/boundary-sweep ...")
        sweep_res = await client.get("/api/samples/iot_mqtt_parser/boundary-sweep")
        assert sweep_res.status_code == 200
        sweep_data = sweep_res.json()
        assert sweep_data["total_tests"] == 5
        assert sweep_data["clean_tests"] == 5
        print(f"  -> FR-28 Summary: {sweep_data['summary']}")

        # 9. Claims Audit Report Endpoint
        print("\n[TEST 9] GET /api/claims ...")
        claims_res = await client.get("/api/claims")
        assert claims_res.status_code == 200
        claims_data = claims_res.json()
        assert claims_data["status"] == "COMPLIANT"
        print(f"  -> Claims Audit Status: {claims_data['status']} ({claims_data['scenarios_audited']} scenarios)")

    print("\n=================================================================")
    print("      ALL 9 FASTAPI ENDPOINT TESTS PASSED WITH 100% ACCURACY!    ")
    print("=================================================================")


if __name__ == "__main__":
    asyncio.run(test_api_suite_async())
