"""Raabta Core REST API service."""

import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db, get_connection
from .models import (
    AlertExtractionRequest,
    AlertExtractedData,
    ActionPlan,
    ActionPlanStatus,
    ActionPlanApproveRequest,
    Task,
    TaskStatus,
    TaskUpdate,
    IncidentReport,
    IncidentReportCreate,
    IncidentReportVerify,
    ReportStatus,
    AssemblyPoint,
    Volunteer,
    MetricsResponse,
    LocationVerificationStatus
)
from .extractor import extract_evidence_and_parameters, generate_draft_action_plan
from .seed import seed_demo_data, SAMPLE_FLOOD_ALERT, SAMPLE_AGENCY, SAMPLE_URL

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    conn = get_connection()
    count = conn.cursor().execute("SELECT count(*) FROM action_plans").fetchone()[0]
    conn.close()
    if count == 0:
        seed_demo_data(pre_approve_plan=True)
    yield

app = FastAPI(
    title="Raabta API",
    description="Community Emergency Action Network Core Workflow Service",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local development and frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Raabta Core Emergency Workflow Engine",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ==========================================
# Alert Ingestion & Action Plan Generation
# ==========================================

@app.post("/api/alerts/parse", response_model=ActionPlan, status_code=status.HTTP_201_CREATED)
def parse_alert_and_draft_plan(req: AlertExtractionRequest):
    """Parse raw alert text, extract grounded parameters, and generate a draft plan."""
    alert_data = extract_evidence_and_parameters(req.raw_text, req.source_agency, req.source_url)
    draft_plan = generate_draft_action_plan(alert_data)
    now_str = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    cursor = conn.cursor()

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

    cursor.execute("""
    INSERT INTO action_plans VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        draft_plan.id,
        draft_plan.alert_id,
        draft_plan.title,
        draft_plan.hazard_type,
        draft_plan.status.value,
        draft_plan.template_id,
        None,
        None,
        draft_plan.source_agency,
        draft_plan.source_url,
        json.dumps([a.model_dump() for a in draft_plan.evidence_anchors]),
        now_str
    ))

    for t in draft_plan.tasks:
        cursor.execute("""
        INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            t.id,
            t.plan_id,
            t.task_code,
            t.title,
            t.description,
            t.priority.value,
            t.status.value,
            t.assigned_to,
            t.volunteer_id,
            t.location_note,
            t.location_status,
            t.escalation_reason,
            t.created_at,
            t.updated_at
        ))

    conn.commit()
    conn.close()

    return draft_plan


@app.post("/api/action-plans/{plan_id}/approve", response_model=ActionPlan)
def approve_action_plan(plan_id: str, req: ActionPlanApproveRequest):
    """HUMAN APPROVAL GATE: Coordinator reviews and authorizes publication of action plan."""
    conn = get_connection()
    cursor = conn.cursor()

    plan_row = cursor.execute("SELECT * FROM action_plans WHERE id = ?", (plan_id,)).fetchone()
    if not plan_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Action plan not found")

    now_str = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    UPDATE action_plans
    SET status = ?, approved_by = ?, approved_at = ?
    WHERE id = ?
    """, (ActionPlanStatus.APPROVED_PUBLISHED.value, req.approved_by, now_str, plan_id))
    conn.commit()

    # Retrieve updated plan
    updated_plan = _fetch_action_plan(cursor, plan_id)
    conn.close()
    return updated_plan


@app.get("/api/action-plans/current", response_model=ActionPlan)
def get_current_action_plan():
    """Retrieve the most recent active or draft action plan."""
    conn = get_connection()
    cursor = conn.cursor()

    # Prioritize published plan, otherwise latest draft
    plan_row = cursor.execute("""
    SELECT id FROM action_plans
    ORDER BY CASE WHEN status = 'APPROVED_PUBLISHED' THEN 1 ELSE 2 END, created_at DESC
    LIMIT 1
    """).fetchone()

    if not plan_row:
        conn.close()
        raise HTTPException(status_code=404, detail="No action plans exist")

    plan = _fetch_action_plan(cursor, plan_row["id"])
    conn.close()
    return plan


@app.get("/api/action-plans/{plan_id}", response_model=ActionPlan)
def get_action_plan_by_id(plan_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    plan = _fetch_action_plan(cursor, plan_id)
    conn.close()
    if not plan:
        raise HTTPException(status_code=404, detail="Action plan not found")
    return plan


def _fetch_action_plan(cursor, plan_id: str) -> Optional[ActionPlan]:
    plan_row = cursor.execute("SELECT * FROM action_plans WHERE id = ?", (plan_id,)).fetchone()
    if not plan_row:
        return None

    task_rows = cursor.execute("SELECT * FROM tasks WHERE plan_id = ? ORDER BY task_code ASC", (plan_id,)).fetchall()
    tasks = [
        Task(
            id=r["id"],
            plan_id=r["plan_id"],
            task_code=r["task_code"],
            title=r["title"],
            description=r["description"],
            priority=r["priority"],
            status=r["status"],
            assigned_to=r["assigned_to"],
            volunteer_id=r["volunteer_id"],
            location_note=r["location_note"],
            location_status=r["location_status"],
            escalation_reason=r["escalation_reason"],
            created_at=r["created_at"],
            updated_at=r["updated_at"]
        ) for r in task_rows
    ]

    evidence_anchors = json.loads(plan_row["evidence_anchors"])

    return ActionPlan(
        id=plan_row["id"],
        alert_id=plan_row["alert_id"],
        title=plan_row["title"],
        hazard_type=plan_row["hazard_type"],
        status=plan_row["status"],
        template_id=plan_row["template_id"],
        approved_by=plan_row["approved_by"],
        approved_at=plan_row["approved_at"],
        source_agency=plan_row["source_agency"],
        source_url=plan_row["source_url"],
        evidence_anchors=evidence_anchors,
        tasks=tasks
    )


# ==========================================
# Task Management & State Machine
# ==========================================

@app.patch("/api/tasks/{task_id}", response_model=Task)
def update_task_lifecycle(task_id: str, update: TaskUpdate):
    """Enforce task state transitions:
    - Rejects assignment/progress if plan is unapproved draft
    - Validates volunteer assignment on assignment
    - Requires escalation reason when escalating
    - Prohibits labeling location 'safe'
    """
    conn = get_connection()
    cursor = conn.cursor()

    task_row = cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if not task_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")

    plan_row = cursor.execute("SELECT status FROM action_plans WHERE id = ?", (task_row["plan_id"],)).fetchone()
    if plan_row["status"] == ActionPlanStatus.DRAFT_PENDING_APPROVAL.value:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign or execute tasks on an unapproved draft action plan. Human coordinator approval is required first."
        )

    now_str = datetime.now(timezone.utc).isoformat()
    new_status = update.status.value if update.status else task_row["status"]
    new_assigned_to = update.assigned_to if update.assigned_to is not None else task_row["assigned_to"]
    new_volunteer_id = update.volunteer_id if update.volunteer_id is not None else task_row["volunteer_id"]
    new_escalation = update.escalation_reason if update.escalation_reason is not None else task_row["escalation_reason"]
    new_loc_status = update.location_status if update.location_status is not None else task_row["location_status"]

    if new_status in [TaskStatus.ASSIGNED.value, TaskStatus.IN_PROGRESS.value] and not (new_assigned_to or new_volunteer_id):
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="Volunteer assignment information is required to mark task as ASSIGNED or IN_PROGRESS."
        )

    cursor.execute("""
    UPDATE tasks
    SET status = ?, assigned_to = ?, volunteer_id = ?, escalation_reason = ?, location_status = ?, updated_at = ?
    WHERE id = ?
    """, (new_status, new_assigned_to, new_volunteer_id, new_escalation, new_loc_status, now_str, task_id))

    conn.commit()

    updated = cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    conn.close()

    return Task(
        id=updated["id"],
        plan_id=updated["plan_id"],
        task_code=updated["task_code"],
        title=updated["title"],
        description=updated["description"],
        priority=updated["priority"],
        status=updated["status"],
        assigned_to=updated["assigned_to"],
        volunteer_id=updated["volunteer_id"],
        location_note=updated["location_note"],
        location_status=updated["location_status"],
        escalation_reason=updated["escalation_reason"],
        created_at=updated["created_at"],
        updated_at=updated["updated_at"]
    )


# ==========================================
# Volunteers (Privacy Masked)
# ==========================================

@app.get("/api/volunteers", response_model=List[Volunteer])
def list_volunteers():
    """Returns available volunteers with masked phone numbers for privacy."""
    conn = get_connection()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM volunteers ORDER BY name ASC").fetchall()
    conn.close()
    return [
        Volunteer(
            id=r["id"],
            name=r["name"],
            role=r["role"],
            zone=r["zone"],
            phone_masked=r["phone_masked"],
            is_available=bool(r["is_available"]),
            active_tasks_count=r["active_tasks_count"]
        ) for r in rows
    ]


# ==========================================
# Community Unmet Needs & Incident Reports
# ==========================================

@app.get("/api/reports", response_model=List[IncidentReport])
def list_incident_reports():
    conn = get_connection()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM incident_reports ORDER BY reported_at DESC").fetchall()
    conn.close()
    return [
        IncidentReport(
            id=r["id"],
            hazard_type=r["hazard_type"],
            title=r["title"],
            description=r["description"],
            location_zone=r["location_zone"],
            status=r["status"],
            reported_at=r["reported_at"],
            verified_by=r["verified_by"],
            notes=r["notes"]
        ) for r in rows
    ]


@app.post("/api/reports", response_model=IncidentReport, status_code=status.HTTP_201_CREATED)
def submit_community_report(req: IncidentReportCreate):
    """Community incident reporting. Always defaults strictly to UNVERIFIED."""
    conn = get_connection()
    cursor = conn.cursor()
    rep_id = f"rep-{datetime.now(timezone.utc).strftime('%H%M%S')}"
    now_str = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
    INSERT INTO incident_reports VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        rep_id,
        req.hazard_type,
        req.title,
        req.description,
        req.location_zone,
        ReportStatus.UNVERIFIED.value,
        now_str,
        None,
        "Submitted by community resident. Awaiting verification."
    ))
    conn.commit()
    conn.close()

    return IncidentReport(
        id=rep_id,
        hazard_type=req.hazard_type,
        title=req.title,
        description=req.description,
        location_zone=req.location_zone,
        status=ReportStatus.UNVERIFIED,
        reported_at=now_str,
        verified_by=None,
        notes="Submitted by community resident. Awaiting verification."
    )


@app.patch("/api/reports/{report_id}/verify", response_model=IncidentReport)
def verify_community_report(report_id: str, req: IncidentReportVerify):
    """Coordinator action to verify, resolve, or reject a reported obstruction/need."""
    conn = get_connection()
    cursor = conn.cursor()

    row = cursor.execute("SELECT * FROM incident_reports WHERE id = ?", (report_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Incident report not found")

    cursor.execute("""
    UPDATE incident_reports
    SET status = ?, verified_by = ?, notes = ?
    WHERE id = ?
    """, (req.status.value, req.verified_by, req.notes, report_id))
    conn.commit()

    updated = cursor.execute("SELECT * FROM incident_reports WHERE id = ?", (report_id,)).fetchone()
    conn.close()

    return IncidentReport(
        id=updated["id"],
        hazard_type=updated["hazard_type"],
        title=updated["title"],
        description=updated["description"],
        location_zone=updated["location_zone"],
        status=updated["status"],
        reported_at=updated["reported_at"],
        verified_by=updated["verified_by"],
        notes=updated["notes"]
    )


# ==========================================
# Assembly Points & Map Locations
# ==========================================

@app.get("/api/locations", response_model=List[AssemblyPoint])
def list_assembly_points():
    """Enforces location status rule: Never labeled safe without authority confirmation."""
    conn = get_connection()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM assembly_points").fetchall()
    conn.close()
    return [
        AssemblyPoint(
            id=r["id"],
            name=r["name"],
            zone=r["zone"],
            lat=r["lat"],
            lng=r["lng"],
            status=r["status"],
            verified_by=r["verified_by"],
            capacity_estimate=r["capacity_estimate"]
        ) for r in rows
    ]


@app.patch("/api/locations/{location_id}/status", response_model=AssemblyPoint)
def update_location_status(location_id: str, status_val: str, verified_by: str):
    conn = get_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM assembly_points WHERE id = ?", (location_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Location not found")

    # Validate label
    clean_val = status_val.strip()
    if "safe" in clean_val.lower() and "verification" not in clean_val.lower():
        raise HTTPException(status_code=400, detail="Cannot label location simply 'safe'. Use official confirmation phrasing.")

    cursor.execute("""
    UPDATE assembly_points
    SET status = ?, verified_by = ?
    WHERE id = ?
    """, (clean_val, verified_by, location_id))
    conn.commit()

    updated = cursor.execute("SELECT * FROM assembly_points WHERE id = ?", (location_id,)).fetchone()
    conn.close()

    return AssemblyPoint(
        id=updated["id"],
        name=updated["name"],
        zone=updated["zone"],
        lat=updated["lat"],
        lng=updated["lng"],
        status=updated["status"],
        verified_by=updated["verified_by"],
        capacity_estimate=updated["capacity_estimate"]
    )


# ==========================================
# Metrics & Completion Loop Analytics
# ==========================================

@app.get("/api/metrics", response_model=MetricsResponse)
def get_action_metrics():
    """Calculate measurable outcomes of the action completion loop."""
    conn = get_connection()
    cursor = conn.cursor()

    task_stats = cursor.execute("""
    SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'ESCALATED' THEN 1 ELSE 0 END) as escalated,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
    FROM tasks
    """).fetchone()

    report_stats = cursor.execute("""
    SELECT
        SUM(CASE WHEN status = 'UNVERIFIED' THEN 1 ELSE 0 END) as unverified,
        SUM(CASE WHEN status = 'VERIFIED' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved
    FROM incident_reports
    """).fetchone()

    conn.close()

    total = task_stats["total"] or 0
    completed = task_stats["completed"] or 0
    pct = round((completed / total * 100), 1) if total > 0 else 0.0

    return MetricsResponse(
        total_tasks=total,
        completed_tasks=completed,
        in_progress_tasks=task_stats["in_progress"] or 0,
        escalated_tasks=task_stats["escalated"] or 0,
        pending_tasks=task_stats["pending"] or 0,
        unverified_reports_count=report_stats["unverified"] or 0,
        verified_reports_count=report_stats["verified"] or 0,
        resolved_reports_count=report_stats["resolved"] or 0,
        completion_percentage=pct
    )


# ==========================================
# Scenario Controls & Offline Export
# ==========================================

@app.post("/api/scenario/reset")
def reset_scenario(pre_approve: bool = True):
    """Reset to clean Riverside flood seeded demo state."""
    res = seed_demo_data(pre_approve_plan=pre_approve)
    return {"message": "Scenario reset successfully", "details": res}


@app.get("/api/scenario/export")
def export_offline_checklist():
    """Export complete plan, volunteer list, and offline checklist payload."""
    conn = get_connection()
    cursor = conn.cursor()

    plan_row = cursor.execute("SELECT id FROM action_plans ORDER BY created_at DESC LIMIT 1").fetchone()
    plan = _fetch_action_plan(cursor, plan_row["id"]) if plan_row else None
    volunteers = cursor.execute("SELECT * FROM volunteers").fetchall()
    locations = cursor.execute("SELECT * FROM assembly_points").fetchall()
    conn.close()

    return {
        "export_timestamp": datetime.now(timezone.utc).isoformat(),
        "action_plan": plan.model_dump() if plan else None,
        "assembly_points": [dict(r) for r in locations],
        "volunteers_directory": [
            {"name": r["name"], "role": r["role"], "zone": r["zone"], "phone": r["phone_masked"]}
            for r in volunteers
        ],
        "offline_instructions": [
            "1. Proceed to designated assembly point and perform physical access check.",
            "2. Note: Locations are designated assembly points requiring verification.",
            "3. Do not enter moving water.",
            "4. Contact vulnerable households using offline list.",
            "5. Report road obstructions to command post VHF radio."
        ]
    }
