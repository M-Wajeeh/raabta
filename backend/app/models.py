"""Domain models, validation schemas, and state machine definitions for Raabta."""

from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator


class ActionPlanStatus(str, Enum):
    DRAFT_PENDING_APPROVAL = "DRAFT_PENDING_APPROVAL"
    APPROVED_PUBLISHED = "APPROVED_PUBLISHED"
    ARCHIVED = "ARCHIVED"


class TaskStatus(str, Enum):
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ESCALATED = "ESCALATED"


class TaskPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class ReportStatus(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    VERIFIED = "VERIFIED"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


class LocationVerificationStatus(str, Enum):
    VERIFICATION_REQUIRED = "designated assembly point — verification required"
    CONFIRMED_BY_AUTHORITY = "confirmed by authority"
    INACCESSIBLE = "inaccessible / hazardous"


class EvidenceAnchor(BaseModel):
    """Citation linking extracted alerts back to official source text."""
    field_name: str
    extracted_value: str
    source_quote: str = Field(description="Exact excerpt from the official bulletin grounding this parameter.")


class AlertExtractionRequest(BaseModel):
    raw_text: str = Field(..., min_length=10, description="Raw official emergency bulletin text.")
    source_agency: str = Field(..., min_length=2, description="Issuing agency, e.g. National Disaster Management Authority.")
    source_url: str = Field(..., description="Link to the original bulletin.")


class AlertExtractedData(BaseModel):
    alert_id: str
    raw_text: str
    source_agency: str
    source_url: str
    hazard_type: str
    severity: str
    affected_zones: List[str]
    onset_time: str
    valid_until: str
    evidence_anchors: List[EvidenceAnchor]
    template_id: str


class Task(BaseModel):
    id: str
    plan_id: str
    task_code: str
    title: str
    description: str
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.PENDING
    assigned_to: Optional[str] = None
    volunteer_id: Optional[str] = None
    location_note: Optional[str] = None
    location_status: str = LocationVerificationStatus.VERIFICATION_REQUIRED.value
    escalation_reason: Optional[str] = None
    created_at: str
    updated_at: str

    @field_validator("location_status")
    @classmethod
    def validate_location_status(cls, v: str) -> str:
        # Prevent misleading "safe" claims
        v_lower = v.lower()
        if "safe" in v_lower and "verification" not in v_lower:
            raise ValueError("Locations cannot be labeled 'safe' without official authority confirmation.")
        return v


class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    volunteer_id: Optional[str] = None
    assigned_to: Optional[str] = None
    escalation_reason: Optional[str] = None
    location_status: Optional[str] = None

    @model_validator(mode="after")
    def check_escalation(self) -> "TaskUpdate":
        if self.status == TaskStatus.ESCALATED and not self.escalation_reason:
            raise ValueError("An escalation reason must be provided when escalating a task.")
        return self


class ActionPlan(BaseModel):
    id: str
    alert_id: str
    title: str
    hazard_type: str
    status: ActionPlanStatus = ActionPlanStatus.DRAFT_PENDING_APPROVAL
    template_id: str
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    source_agency: str
    source_url: str
    evidence_anchors: List[EvidenceAnchor]
    tasks: List[Task] = []


class ActionPlanApproveRequest(BaseModel):
    approved_by: str = Field(..., min_length=2, description="Coordinator name granting approval to publish.")
    notes: Optional[str] = None


class IncidentReportCreate(BaseModel):
    hazard_type: str
    title: str = Field(..., min_length=5)
    description: str = Field(..., min_length=5)
    location_zone: str


class IncidentReport(BaseModel):
    id: str
    hazard_type: str
    title: str
    description: str
    location_zone: str
    status: ReportStatus = ReportStatus.UNVERIFIED
    reported_at: str
    verified_by: Optional[str] = None
    notes: Optional[str] = None


class IncidentReportVerify(BaseModel):
    status: ReportStatus = Field(..., description="Target status: VERIFIED, RESOLVED, or REJECTED")
    verified_by: str = Field(..., min_length=2)
    notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def check_status_valid(cls, v: ReportStatus) -> ReportStatus:
        if v == ReportStatus.UNVERIFIED:
            raise ValueError("Cannot verify a report to UNVERIFIED state.")
        return v


class AssemblyPoint(BaseModel):
    id: str
    name: str
    zone: str
    lat: float
    lng: float
    status: str = LocationVerificationStatus.VERIFICATION_REQUIRED.value
    verified_by: Optional[str] = None
    capacity_estimate: int = 150


class Volunteer(BaseModel):
    id: str
    name: str
    role: str
    zone: str
    phone_masked: str
    is_available: bool = True
    active_tasks_count: int = 0


class MetricsResponse(BaseModel):
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    escalated_tasks: int
    pending_tasks: int
    unverified_reports_count: int
    verified_reports_count: int
    resolved_reports_count: int
    completion_percentage: float
