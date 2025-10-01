"""Bradley–Terry aggregation tests for persona ranking."""

import pytest
from orchestration import state
from orchestration.app import create_app
from fastapi.testclient import TestClient

@pytest.fixture(autouse=True)
def clear_state_fixture():
    state.clear_state()
    yield
    state.clear_state()

def test_bradley_terry_aggregation_basic():
    app = create_app()
    client = TestClient(app)

    response_a = state.record_evaluation_response(
        run_id="run-a",
        persona_id="cooperative_planner",
        target_id="solitaire-practice",
        target_kind="scenario",
        adapter="solitaire",
        status="completed",
        summary={"score": 1},
        steps=[],
        trace=[],
        metadata={"target_title": "Solitaire"},
    )
    response_b = state.record_evaluation_response(
        run_id="run-b",
        persona_id="ruthless_optimizer",
        target_id="solitaire-practice",
        target_kind="scenario",
        adapter="solitaire",
        status="completed",
        summary={"score": 0},
        steps=[],
        trace=[],
        metadata={"target_title": "Solitaire"},
    )

    pair_payload = state.create_comparison_pair(target_id="solitaire-practice")
    pair_id = pair_payload["id"]
    slot_by_response = {entry["response_id"]: entry["slot"] for entry in pair_payload["responses"]}
    slot_coop = slot_by_response[response_a["id"]]
    slot_ruthless = slot_by_response[response_b["id"]]

    state.record_comparison_vote(pair_id=pair_id, winner_slot=slot_coop)
    state.record_comparison_vote(pair_id=pair_id, winner_slot=slot_coop)
    state.record_comparison_vote(pair_id=pair_id, winner_slot=slot_ruthless)

    agg_resp = client.get("/api/admin/evaluations/aggregate", params={"target": "solitaire-practice"})
    assert agg_resp.status_code == 200, agg_resp.text
    result = agg_resp.json()
    rankings = result["rankings"]
    assert set(rankings.keys()) == {"cooperative_planner", "ruthless_optimizer"}
    assert rankings["cooperative_planner"] > rankings["ruthless_optimizer"]
    assert pytest.approx(sum(rankings.values()), rel=1e-6) == 1.0
    summary = result["summary"]
    assert summary["total_votes"] == 3
    assert summary["pair_count"] == 1
    assert summary["persona_count"] == 2
    assert summary["target_id"] == "solitaire-practice"
    assert summary["converged"] is True

def test_bradley_terry_aggregation_empty():
    app = create_app()
    client = TestClient(app)
    agg_resp = client.get("/api/admin/evaluations/aggregate", params={"target": "solitaire-practice"})
    assert agg_resp.status_code == 200, agg_resp.text
    result = agg_resp.json()
    assert result["rankings"] == {}
    assert result["summary"]["total_votes"] == 0
