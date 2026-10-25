"""Approved standard emergency operational templates.

CRITICAL GOVERNANCE RULE:
Emergency instructions must NEVER be invented or hallucinated.
All tasks and public safety instructions MUST derive strictly from
these vetted and approved operational templates.
"""

from typing import Dict, Any, List

VERIFICATION_REQUIRED_LABEL = "designated assembly point — verification required"

APPROVED_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "FLOOD_PREPAREDNESS_V1": {
        "template_id": "FLOOD_PREPAREDNESS_V1",
        "hazard_type": "FLOOD",
        "version": "1.0-approved",
        "authorizing_body": "Community Resilience Standing Committee",
        "description": "Standard standard operating procedure for riverine and urban flash flood warnings.",
        "tasks": [
            {
                "task_code": "FLD-01",
                "title": "Verify Designated Assembly Point & Evacuation Route",
                "description_template": (
                    "Inspect access corridors leading to {primary_assembly_point}. "
                    "Confirm clearance of road culverts in {affected_zones}. "
                    "Note: Status remains '{verification_label}' until physical confirmation."
                ),
                "priority": "HIGH",
                "required_role": "Logistics & Transport",
                "estimated_minutes": 45,
                "verification_criteria": "Route passable by high-clearance vehicles; no downed power lines."
            },
            {
                "task_code": "FLD-02",
                "title": "Welfare Check for Opted-In Vulnerable Households",
                "description_template": (
                    "Contact the designated focal points for opted-in assistance households in {affected_zones}. "
                    "Privacy safeguard: Do not publish public names, exact street addresses, or medical conditions. "
                    "Confirm mobility status and verify whether assisted transport is needed prior to {onset_time}."
                ),
                "priority": "URGENT",
                "required_role": "Community Coordinator / Care",
                "estimated_minutes": 60,
                "verification_criteria": "All registered households in zone contacted; transport needs logged."
            },
            {
                "task_code": "FLD-03",
                "title": "Deploy Sandbag Barriers & Protect Drainage Inlets",
                "description_template": (
                    "Distribute pre-staged sandbags to ground-floor perimeter and critical substations in {affected_zones}. "
                    "Clear surface storm drains before anticipated onset at {onset_time}."
                ),
                "priority": "MEDIUM",
                "required_role": "Ground Logistics",
                "estimated_minutes": 90,
                "verification_criteria": "Barrier placed at perimeter; storm drain grates free of debris."
            },
            {
                "task_code": "FLD-04",
                "title": "Establish Local Emergency Comms & Radio Check",
                "description_template": (
                    "Verify backup VHF radio channels and satellite or mesh battery banks at {command_post}. "
                    "Distribute printed action cards to field volunteers before anticipated connectivity drop."
                ),
                "priority": "HIGH",
                "required_role": "Communications Lead",
                "estimated_minutes": 30,
                "verification_criteria": "Two-way radio communication confirmed between command post and assembly points."
            }
        ],
        "mandatory_precautions": [
            "Never attempt to drive or walk through moving floodwater.",
            "Treat all fallen electrical cables as energized and hazardous.",
            "Keep emergency battery radios tuned to official regional broadcast stations."
        ]
    },
    "GENERAL_PREPAREDNESS_V1": {
        "template_id": "GENERAL_PREPAREDNESS_V1",
        "hazard_type": "GENERAL",
        "version": "1.0-approved",
        "authorizing_body": "Community Resilience Standing Committee",
        "description": "Baseline multi-hazard community preparedness protocol.",
        "tasks": [
            {
                "task_code": "GEN-01",
                "title": "Confirm Assembly Point Accessibility",
                "description_template": (
                    "Inspect {primary_assembly_point}. Verify perimeter safety and confirm accessibility. "
                    "Status designation: '{verification_label}'."
                ),
                "priority": "HIGH",
                "required_role": "Volunteer Lead",
                "estimated_minutes": 30,
                "verification_criteria": "Gate unlocked, shelter clear, water supply verified."
            },
            {
                "task_code": "GEN-02",
                "title": "Community Check-In and Needs Triage",
                "description_template": (
                    "Perform welfare verification for opted-in assistance households across {affected_zones}. "
                    "Ensure privacy protocols are strictly observed."
                ),
                "priority": "HIGH",
                "required_role": "Community Care",
                "estimated_minutes": 60,
                "verification_criteria": "Households checked; escalations raised for unmet needs."
            }
        ],
        "mandatory_precautions": [
            "Stay tuned to official disaster authority bulletins.",
            "Keep emergency grab-bags packed with water, medicines, and essential identification."
        ]
    }
}


def get_template_for_hazard(hazard_type: str) -> Dict[str, Any]:
    """Retrieve the authorized template for a given hazard, falling back to general."""
    clean_hazard = hazard_type.strip().upper()
    if clean_hazard in ["FLOOD", "FLASH_FLOOD", "RIVERINE_FLOOD"]:
        return APPROVED_TEMPLATES["FLOOD_PREPAREDNESS_V1"]
    return APPROVED_TEMPLATES["GENERAL_PREPAREDNESS_V1"]
