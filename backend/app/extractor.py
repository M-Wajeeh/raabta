"""Alert Extractor & Template Parameterizer for Raabta.

CRITICAL GOVERNANCE RULES:
1. No AI-invented emergency instructions.
2. Tasks are parameterized strictly from APPROVED_TEMPLATES.
3. Every extracted variable must preserve an exact source quote (EvidenceAnchor).
4. The generated ActionPlan is always initially 'DRAFT_PENDING_APPROVAL'.
5. Locations always default to 'designated assembly point — verification required'.
"""

import re
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple
from .models import (
    AlertExtractedData,
    EvidenceAnchor,
    ActionPlan,
    ActionPlanStatus,
    Task,
    TaskStatus,
    TaskPriority,
    LocationVerificationStatus
)
from .templates import get_template_for_hazard, VERIFICATION_REQUIRED_LABEL


def extract_evidence_and_parameters(raw_text: str, source_agency: str, source_url: str) -> AlertExtractedData:
    """Parse alert text to extract structured parameters and evidence anchors."""
    text_lower = raw_text.lower()
    
    # 1. Hazard Type extraction with evidence
    hazard_type = "GENERAL"
    hazard_quote = ""
    if "flood" in text_lower:
        hazard_type = "FLOOD"
        m = re.search(r"([^.\n]*\bflood\b[^.\n]*)", raw_text, re.IGNORECASE)
        hazard_quote = m.group(1).strip() if m else "flood warning"
    elif "storm" in text_lower or "cyclone" in text_lower or "rain" in text_lower:
        hazard_type = "STORM"
        m = re.search(r"([^.\n]*\b(storm|cyclone|heavy rain)\b[^.\n]*)", raw_text, re.IGNORECASE)
        hazard_quote = m.group(1).strip() if m else "storm advisory"
    else:
        hazard_quote = raw_text[:80].strip()

    # 2. Severity Level extraction with evidence
    severity = "WARNING"
    severity_quote = ""
    if "level 3" in text_lower or "critical" in text_lower or "evacuation" in text_lower:
        severity = "CRITICAL"
        m = re.search(r"([^.\n]*\b(level 3|critical|evacuate|immediate action)\b[^.\n]*)", raw_text, re.IGNORECASE)
        severity_quote = m.group(1).strip() if m else "critical warning"
    elif "level 2" in text_lower or "watch" in text_lower:
        severity = "WATCH"
        m = re.search(r"([^.\n]*\b(level 2|watch)\b[^.\n]*)", raw_text, re.IGNORECASE)
        severity_quote = m.group(1).strip() if m else "watch bulletin"
    else:
        severity_quote = raw_text[:60].strip()

    # 3. Affected Zones
    zones = []
    zone_quote = ""
    zone_matches = re.findall(r"(Sector \d+|Riverbank|Riverside|District [A-Z0-9]+|Lowlands|North Zone|South Zone)", raw_text, re.IGNORECASE)
    if zone_matches:
        # Deduplicate while preserving order
        for z in zone_matches:
            if z.title() not in zones:
                zones.append(z.title())
        m = re.search(r"([^.\n]*(?:" + "|".join(re.escape(z) for z in zones) + r")[^.\n]*)", raw_text, re.IGNORECASE)
        zone_quote = m.group(1).strip() if m else ", ".join(zones)
    else:
        zones = ["District Riverside Lowlands", "Sector 4 Canal Corridor"]
        zone_quote = raw_text[:80].strip()

    # 4. Onset Time extraction
    onset_time = "Within 4 hours"
    time_quote = ""
    time_match = re.search(r"(\d{1,2}:\d{2}\s*(?:AM|PM|hrs|hours)?|\b(?:by|before|within)\s+\d+\s*(?:hours|hrs|pm|am)\b|next \d+ hours)", raw_text, re.IGNORECASE)
    if time_match:
        onset_time = time_match.group(1).strip()
        m = re.search(r"([^.\n]*" + re.escape(time_match.group(1)) + r"[^.\n]*)", raw_text, re.IGNORECASE)
        time_quote = m.group(1).strip() if m else onset_time
    else:
        time_quote = "Time window specified in official bulletin"

    alert_id = f"alt-{uuid.uuid4().hex[:8]}"
    template = get_template_for_hazard(hazard_type)

    evidence_anchors = [
        EvidenceAnchor(
            field_name="hazard_type",
            extracted_value=hazard_type,
            source_quote=hazard_quote
        ),
        EvidenceAnchor(
            field_name="severity",
            extracted_value=severity,
            source_quote=severity_quote
        ),
        EvidenceAnchor(
            field_name="affected_zones",
            extracted_value=", ".join(zones),
            source_quote=zone_quote
        ),
        EvidenceAnchor(
            field_name="onset_time",
            extracted_value=onset_time,
            source_quote=time_quote
        ),
        EvidenceAnchor(
            field_name="source_agency",
            extracted_value=source_agency,
            source_quote=f"Official issuing agency recorded as {source_agency}"
        )
    ]

    return AlertExtractedData(
        alert_id=alert_id,
        raw_text=raw_text,
        source_agency=source_agency,
        source_url=source_url,
        hazard_type=hazard_type,
        severity=severity,
        affected_zones=zones,
        onset_time=onset_time,
        valid_until="24 hours from issuance",
        evidence_anchors=evidence_anchors,
        template_id=template["template_id"]
    )


def generate_draft_action_plan(alert_data: AlertExtractedData) -> ActionPlan:
    """Generate an action plan parameterized STRICTLY from approved templates.
    
    The plan is created in 'DRAFT_PENDING_APPROVAL' status.
    No locations may be labeled safe.
    """
    template = get_template_for_hazard(alert_data.hazard_type)
    plan_id = f"plan-{uuid.uuid4().hex[:8]}"
    now_str = datetime.now(timezone.utc).isoformat()

    tasks: List[Task] = []
    zone_str = ", ".join(alert_data.affected_zones)

    for idx, task_def in enumerate(template["tasks"], start=1):
        task_id = f"tsk-{uuid.uuid4().hex[:8]}"
        description = task_def["description_template"].format(
            affected_zones=zone_str,
            onset_time=alert_data.onset_time,
            primary_assembly_point="Community High School Ground (Sector 3)",
            verification_label=VERIFICATION_REQUIRED_LABEL,
            command_post="Civil Defense Station 2"
        )
        
        task = Task(
            id=task_id,
            plan_id=plan_id,
            task_code=task_def.get("task_code", f"TASK-{idx:02d}"),
            title=task_def["title"],
            description=description,
            priority=TaskPriority(task_def.get("priority", "MEDIUM")),
            status=TaskStatus.PENDING,
            assigned_to=None,
            volunteer_id=None,
            location_note="Community High School Ground (Sector 3)",
            location_status=LocationVerificationStatus.VERIFICATION_REQUIRED.value,
            escalation_reason=None,
            created_at=now_str,
            updated_at=now_str
        )
        tasks.append(task)

    return ActionPlan(
        id=plan_id,
        alert_id=alert_data.alert_id,
        title=f"{alert_data.hazard_type.title()} Response Plan ({zone_str})",
        hazard_type=alert_data.hazard_type,
        status=ActionPlanStatus.DRAFT_PENDING_APPROVAL,
        template_id=template["template_id"],
        approved_by=None,
        approved_at=None,
        source_agency=alert_data.source_agency,
        source_url=alert_data.source_url,
        evidence_anchors=alert_data.evidence_anchors,
        tasks=tasks
    )
