"""Comprehensive automated tests for Raabta core workflow and governance boundaries."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.seed import seed_demo_data
from backend.app.templates import VERIFICATION_REQUIRED_LABEL

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db_before_test():
    """Ensure clean seeded state before each test."""
    seed_demo_data(pre_approve_plan=True)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_alert_extraction_and_evidence_anchors():
    raw_alert = (
        "URGENT FLASH FLOOD BULLETIN: River Indus breach expected near Sector 4 and Riverside Lowlands "
        "within 3 hours. Critical evacuation preparedness recommended by Provincial Disaster Management Authority."
    )
    payload = {
        "raw_text": raw_alert,
        "source_agency": "Provincial Disaster Management Authority (PDMA)",
        "source_url": "https://pdma.gov.pk/bulletins/2026/alert-12"
    }

    res = client.post("/api/alerts/parse", json=payload)
    assert res.status_code == 201
    data = res.json()

    # Core extraction assertions
    assert data["hazard_type"] == "FLOOD"
    assert data["status"] == "DRAFT_PENDING_APPROVAL"
    assert data["source_agency"] == "Provincial Disaster Management Authority (PDMA)"
    assert len(data["tasks"]) == 4

    # Verify evidence anchors preserve actual text excerpts
    anchors = {a["field_name"]: a["source_quote"] for a in data["evidence_anchors"]}
    assert "hazard_type" in anchors
    assert "flood" in anchors["hazard_type"].lower()
    assert "onset_time" in anchors
    assert "3 hours" in anchors["onset_time"].lower()

    # Verify location status defaults strictly to verification required
    for task in data["tasks"]:
        assert task["location_status"] == VERIFICATION_REQUIRED_LABEL
        assert "safe" not in task["location_status"].lower() or "verification" in task["location_status"].lower()


def test_human_approval_gate_blocks_execution_until_approved():
    # 1. Parse a new alert which produces a DRAFT plan
    payload = {
        "raw_text": "EMERGENCY ADVISORY: Flash flood watch for Sector 3 lowlands within 6 hours.",
        "source_agency": "NDMA",
        "source_url": "https://ndma.gov.pk/watch"
    }
    create_res = client.post("/api/alerts/parse", json=payload)
    assert create_res.status_code == 201
    draft_plan = create_res.json()
    plan_id = draft_plan["id"]
    task_id = draft_plan["tasks"][0]["id"]

    # 2. Attempt to assign or start task while in DRAFT status -> MUST FAIL
    forbidden_update = {
        "status": "ASSIGNED",
        "assigned_to": "Bilal Ahmed",
        "volunteer_id": "vol-02"
    }
    fail_res = client.patch(f"/api/tasks/{task_id}", json=forbidden_update)
    assert fail_res.status_code == 400
    assert "approval is required" in fail_res.json()["detail"].lower()

    # 3. Coordinator explicitly approves the plan
    approve_res = client.post(f"/api/action-plans/{plan_id}/approve", json={
        "approved_by": "Coordinator Sarah Khan",
        "notes": "Reviewed and confirmed with district civil defense."
    })
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED_PUBLISHED"
    assert approve_res.json()["approved_by"] == "Coordinator Sarah Khan"

    # 4. Now updating task succeeds
    success_res = client.patch(f"/api/tasks/{task_id}", json=forbidden_update)
    assert success_res.status_code == 200
    assert success_res.json()["status"] == "ASSIGNED"
    assert success_res.json()["assigned_to"] == "Bilal Ahmed"


def test_task_state_machine_escalation_requires_reason():
    # Seeded scenario has pre-approved plan
    curr_plan = client.get("/api/action-plans/current").json()
    pending_task = next(t for t in curr_plan["tasks"] if t["status"] == "PENDING")

    # 1. Assign to volunteer
    assign_res = client.patch(f"/api/tasks/{pending_task['id']}", json={
        "status": "ASSIGNED",
        "assigned_to": "Amina Khan",
        "volunteer_id": "vol-01"
    })
    assert assign_res.status_code == 200
    assert assign_res.json()["status"] == "ASSIGNED"

    # 2. Advance to IN_PROGRESS
    prog_res = client.patch(f"/api/tasks/{pending_task['id']}", json={
        "status": "IN_PROGRESS"
    })
    assert prog_res.status_code == 200
    assert prog_res.json()["status"] == "IN_PROGRESS"

    # 3. Attempt to escalate WITHOUT reason -> MUST FAIL with 422 validation error
    fail_esc = client.patch(f"/api/tasks/{pending_task['id']}", json={
        "status": "ESCALATED"
    })
    assert fail_esc.status_code == 422

    # 4. Escalate WITH explicit reason -> SUCCEEDS
    esc_res = client.patch(f"/api/tasks/{pending_task['id']}", json={
        "status": "ESCALATED",
        "escalation_reason": "Culvert blocked by structural debris; excavator support needed."
    })
    assert esc_res.status_code == 200
    assert esc_res.json()["status"] == "ESCALATED"
    assert "excavator" in esc_res.json()["escalation_reason"]


def test_location_status_rule_prohibits_unverified_safe_label():
    locations = client.get("/api/locations").json()
    assert len(locations) >= 3

    # All seeded assembly points must state verification required
    for loc in locations:
        assert loc["status"] == VERIFICATION_REQUIRED_LABEL

    # Attempt to set label to misleading 'safe' should fail
    loc_id = locations[0]["id"]
    bad_res = client.patch(f"/api/locations/{loc_id}/status?status_val=Safe&verified_by=Anonymous")
    assert bad_res.status_code == 400


def test_community_incident_report_lifecycle():
    # 1. Resident reports road obstruction
    new_rep = client.post("/api/reports", json={
        "hazard_type": "OBSTRUCTION",
        "title": "Submerged bridge on Sector 4 link road",
        "description": "Approx 2 feet of water flowing over bridge.",
        "location_zone": "Sector 4 Canal Corridor"
    })
    assert new_rep.status_code == 201
    rep_data = new_rep.json()
    assert rep_data["status"] == "UNVERIFIED"

    # 2. Coordinator verifies report
    verify_res = client.patch(f"/api/reports/{rep_data['id']}/verify", json={
        "status": "VERIFIED",
        "verified_by": "Coordinator S. Malik",
        "notes": "Confirmed via police patrol. Route flagged as impassable."
    })
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "VERIFIED"
    assert verify_res.json()["verified_by"] == "Coordinator S. Malik"


def test_metrics_calculation():
    res = client.get("/api/metrics")
    assert res.status_code == 200
    metrics = res.json()

    assert metrics["total_tasks"] == 4
    assert metrics["completed_tasks"] >= 1
    assert metrics["escalated_tasks"] >= 1
    assert metrics["unverified_reports_count"] >= 1
    assert 0.0 <= metrics["completion_percentage"] <= 100.0


def test_privacy_masking_in_volunteer_directory():
    volunteers = client.get("/api/volunteers").json()
    assert len(volunteers) >= 3
    for v in volunteers:
        # Phone numbers must be masked
        assert "***" in v["phone_masked"]
        # Must not contain unmasked personal identifying leaks
        assert not v["phone_masked"].endswith("452100000")


def test_offline_export():
    res = client.get("/api/scenario/export")
    assert res.status_code == 200
    payload = res.json()

    assert "action_plan" in payload
    assert "assembly_points" in payload
    assert "volunteers_directory" in payload
    assert "offline_instructions" in payload
    assert len(payload["offline_instructions"]) >= 3
