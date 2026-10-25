"""Seeded test scenario and initial demo data for Raabta."""

import json
from datetime import datetime, timezone
from typing import Dict, Any
from .database import get_connection, reset_database
from .models import LocationVerificationStatus, ReportStatus, ActionPlanStatus, TaskStatus
from .extractor import extract_evidence_and_parameters, generate_draft_action_plan

SAMPLE_FLOOD_ALERT = (
    "URGENT DISASTER BULLETIN: The National Disaster Management Authority (NDMA) has issued a "
    "Level 3 Flash Flood Warning for District Riverside Lowlands and Sector 4 Canal Corridor. "
    "Heavy catchment rainfall upstream is expected to breach localized embankments within 4 hours. "
    "Residents in low-lying sectors are advised to prepare for precautionary relocation to designated assembly points. "
    "Emergency response units and volunteer groups must immediately inspect drainage culverts and assist registered vulnerable households."
)

SAMPLE_AGENCY = "National Disaster Management Authority (NDMA)"
SAMPLE_URL = "https://ndma.gov.pk/advisories"


def seed_demo_data(pre_approve_plan: bool = True) -> Dict[str, Any]:
    """Reset and seed the database with the Riverside Flood scenario."""
    reset_database()
    conn = get_connection()
    try:
        cursor = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()

        # 1. Seed Volunteers
        volunteers = [
            ("vol-01", "Amina Khan", "Medical Responder & First Aid", "Sector 3", "+92-300-***4521", 1, 1),
            ("vol-02", "Bilal Ahmed", "Logistics & Transport", "Sector 4", "+92-321-***9812", 1, 1),
            ("vol-03", "Zainab Tariq", "Community Coordinator", "Sector 2", "+92-333-***1178", 1, 1)
        ]
        cursor.executemany(
            "INSERT INTO volunteers VALUES (?, ?, ?, ?, ?, ?, ?)",
            volunteers
        )

        # 2. Seed Assembly Points (ALL strictly verification required)
        assembly_points = [
            ("pt-01", "Community High School Ground", "Sector 3", 31.5204, 74.3587, LocationVerificationStatus.VERIFICATION_REQUIRED.value, None, 200),
            ("pt-02", "Sector 4 Sports Complex", "Sector 4", 31.5110, 74.3450, LocationVerificationStatus.VERIFICATION_REQUIRED.value, None, 350),
            ("pt-03", "Central Relief Camp", "Sector 2", 31.5350, 74.3620, LocationVerificationStatus.VERIFICATION_REQUIRED.value, None, 150)
        ]
        cursor.executemany(
            "INSERT INTO assembly_points VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            assembly_points
        )

        # 3. Seed Incident Reports (Unverified community reports)
        reports = [
            (
                "rep-01",
                "FLOOD",
                "Runoff waterlogging and fallen tree on Canal Underpass",
                "Water levels approx 1.5 ft near Sector 4 underpass. Vehicles turning back.",
                "Sector 4 Canal Corridor",
                ReportStatus.UNVERIFIED.value,
                now_str,
                None,
                "Awaiting volunteer ground inspection."
            ),
            (
                "rep-02",
                "TRANSPORT",
                "Elderly resident requires wheelchair transport assistance",
                "Household opted into assisted transit. Need accessible vehicle before water rises.",
                "Sector 3 Lowlands",
                ReportStatus.UNVERIFIED.value,
                now_str,
                None,
                "Flagged to Community Care volunteer."
            )
        ]
        cursor.executemany(
            "INSERT INTO incident_reports VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            reports
        )

        # 4. Ingest and extract the official alert
        alert_data = extract_evidence_and_parameters(SAMPLE_FLOOD_ALERT, SAMPLE_AGENCY, SAMPLE_URL)

        cursor.execute("""
        INSERT INTO alerts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            alert_data.alert_id,
            alert_data.raw_text,
            alert_data.source_agency,
            alert_data.source_url,
            alert_data.hazard_type,
            alert_data.severity,
            json.dumps(alert_data.affected_zones),
            alert_data.onset_time,
            alert_data.valid_until,
            json.dumps([a.model_dump() for a in alert_data.evidence_anchors]),
            alert_data.template_id,
            now_str
        ))

        # 5. Generate action plan from template
        plan = generate_draft_action_plan(alert_data)

        if pre_approve_plan:
            plan.status = ActionPlanStatus.APPROVED_PUBLISHED
            plan.approved_by = "District Coordinator S. Malik"
            plan.approved_at = now_str

            # State machine assignments for demonstration:
            # Task 1: Completed
            plan.tasks[0].status = TaskStatus.COMPLETED
            plan.tasks[0].volunteer_id = "vol-02"
            plan.tasks[0].assigned_to = "Bilal Ahmed"

            # Task 2: In Progress
            plan.tasks[1].status = TaskStatus.IN_PROGRESS
            plan.tasks[1].volunteer_id = "vol-03"
            plan.tasks[1].assigned_to = "Zainab Tariq"

            # Task 3: Escalated (e.g. sandbag shortage)
            plan.tasks[2].status = TaskStatus.ESCALATED
            plan.tasks[2].volunteer_id = "vol-01"
            plan.tasks[2].assigned_to = "Amina Khan"
            plan.tasks[2].escalation_reason = "Depot stock depleted: 150 additional sandbags required at Sector 4 culvert immediately."

            # Task 4: Pending assignment
            plan.tasks[3].status = TaskStatus.PENDING

        plan_status_val = plan.status.value if hasattr(plan.status, "value") else str(plan.status)

        cursor.execute("""
        INSERT INTO action_plans VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            plan.id,
            plan.alert_id,
            plan.title,
            plan.hazard_type,
            plan_status_val,
            plan.template_id,
            plan.approved_by,
            plan.approved_at,
            plan.source_agency,
            plan.source_url,
            json.dumps([a.model_dump() for a in plan.evidence_anchors]),
            now_str
        ))

        for t in plan.tasks:
            priority_val = t.priority.value if hasattr(t.priority, "value") else str(t.priority)
            status_val = t.status.value if hasattr(t.status, "value") else str(t.status)
            cursor.execute("""
            INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                t.id,
                t.plan_id,
                t.task_code,
                t.title,
                t.description,
                priority_val,
                status_val,
                t.assigned_to,
                t.volunteer_id,
                t.location_note,
                t.location_status,
                t.escalation_reason,
                t.created_at,
                t.updated_at
            ))

        conn.commit()
        return {
            "status": "seeded",
            "plan_id": plan.id,
            "alert_id": alert_data.alert_id,
            "tasks_seeded": len(plan.tasks)
        }
    finally:
        conn.close()
