# Raabta (رابطہ) · Community Emergency Action Network

> **Open-Source Civic Resilience Platform**  
> Turning official disaster warnings into grounded, verifiable, and measurable community action plans.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-Pytest%20Passing-success.svg)](backend/tests/)

---

## 1. The Core Idea & The Differentiator

When an official emergency warning is issued, the biggest failure point is often the **last mile** between the alert broadcast and organized, on-the-ground community response. Rather than competing with meteorological forecasting agencies or creating another passive incident map, **Raabta** centers on a **Community Action Completion Loop**:

$$\text{Official Warning} \longrightarrow \text{Evidence-Grounded Action Plan} \longrightarrow \text{Human Approval Gate} \longrightarrow \text{Volunteer Task Assignment} \longrightarrow \text{Status Verification} \longrightarrow \text{Unmet Need Escalation}$$

### Core Governance & Safety Guardrails
1. **No AI-Invented Emergency Instructions**: Emergency tasks are generated strictly from approved, vetted operational templates (`backend/app/templates.py`), parameterized by verified alert fields.
2. **Preserved Source Citations**: Every extracted parameter links back to an exact quotation from the official source bulletin (`EvidenceAnchor`).
3. **Human Approval Gate**: Action plans remain in `DRAFT_PENDING_APPROVAL` status until explicitly reviewed, signed, and published by an emergency coordinator. Tasks cannot be dispatched to volunteers before this gate.
4. **No False Safety Designations**: No location on the map is ever labeled "safe". All shelters and checkpoints are explicitly designated `"designated assembly point — verification required"` until physical clearance by designated authorities.
5. **Privacy by Design**: Sensitive vulnerable lists and private resident home coordinates are strictly masked from public manifests.
6. **Weak-Connectivity & Offline Resilience**: Local client-side caching (`localStorage`), printable emergency action cards, and downloadable task packs ensure field operations continue during comms blackouts.

---

## 2. Project Architecture

```
hacktoberXnstp/
├── .agents/                    # Agentic governance & rules
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI REST endpoints & lifecycle
│   │   ├── models.py           # Pydantic domain models & state machines
│   │   ├── database.py         # SQLite schema & persistence
│   │   ├── extractor.py        # Evidence-grounded alert parser
│   │   ├── templates.py        # Vetted emergency response templates
│   │   └── seed.py             # Seeded 2-minute flood scenario
│   ├── tests/
│   │   └── test_api.py         # Comprehensive pytest test suite
│   └── requirements.txt        # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx          # Operations bar & offline toggle
│   │   │   ├── MetricsBar.jsx      # Quantifiable action loop stats
│   │   │   ├── AlertExtractor.jsx  # Grounding & human approval gate
│   │   │   ├── TaskBoard.jsx       # Task lifecycle dispatch board
│   │   │   ├── MapView.jsx         # Leaflet operational spatial map
│   │   │   ├── IncidentFeed.jsx    # Unmet needs & verification feed
│   │   │   └── PrintableCards.jsx  # Formatted physical action cards
│   │   ├── api.js                  # Client with offline localStorage cache
│   │   ├── App.jsx                 # Main application dashboard
│   │   └── index.css               # Design system & print styling
│   └── package.json            # React + Vite configuration
├── PROJECT_GOVERNANCE.md       # Engineering governance rules & boundaries
├── LICENSE                     # MIT Open Source License
└── README.md                   # Complete documentation
```

---

## 3. Quickstart & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### Backend Setup
```bash
# 1. Install backend dependencies
python -m pip install -r backend/requirements.txt

# 2. Run backend tests
python -m pytest backend/tests -v

# 3. Start backend API server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The API is available at `http://127.0.0.1:8000` with Swagger documentation at `http://127.0.0.1:8000/docs`.

### Frontend Setup
```bash
# 1. Install frontend dependencies
npm install --prefix frontend

# 2. Start Vite development server
npm run dev --prefix frontend
```
Open `http://localhost:5173` in your browser.

---

## 4. The 2-Minute Judging Walkthrough

To experience the complete community action completion loop in 2 minutes:

1. **Observe the Pre-Seeded Scenario**:
   - The dashboard loads with the *"River Riverside Flash Flood Level 3"* scenario.
   - Look at the top metrics bar: shows quantifiable task completion metrics (e.g. 50% completed, 1 in-progress, 1 escalated need).
2. **Review Grounded Evidence**:
   - In the Alert panel, click **"View Source Citations"** to inspect exact excerpts preserved from the official NDMA bulletin.
3. **Inspect the Leaflet Map**:
   - Notice that assembly points are strictly designated `"designated assembly point — verification required"`.
   - Reported road obstructions are visible with explicit `UNVERIFIED` tags.
4. **Advance the Task State Machine**:
   - Find the pending task `[FLD-04]` ("Establish Local Emergency Comms & Radio Check").
   - Click **"Assign Volunteer"** and select a field responder.
   - Click **"Start Execution"**, then **"Mark Complete"** and observe the live completion rate metric update immediately.
5. **Handle Escalations**:
   - Notice `[FLD-03]` is marked **ESCALATED**: *"Depot stock depleted: 150 additional sandbags required at Sector 4 culvert immediately."*
   - Unmet needs are clearly highlighted for coordinator intervention rather than hidden.
6. **Verify Community Reports**:
   - In the Unmet Needs Feed, review an unverified report (*"Waterlogging on Canal Underpass"*).
   - Click **"Verify"** to transition it from `UNVERIFIED` to `VERIFIED`.
7. **Simulate Weak Connectivity**:
   - Click the **"Live Operations"** badge in the navbar to switch to **"Offline Field Cache"**.
   - Notice the amber notification bar: the entire checklist and plan remain fully interactive and persisted in browser storage without network access.
8. **Physical Field Cards**:
   - Click **"Print Cards"** (or press `Ctrl+P`) to see the auto-formatted emergency action cards ready for printing.

---

## 5. Automated Verification & Quality Checks

Run the automated test suite covering all core boundaries and acceptance criteria:
```bash
python -m pytest backend/tests -v
```

Verified checks:
* `test_health`: Service health and uptime.
* `test_alert_extraction_and_evidence_anchors`: Grounded extraction preserves official bulletin quotes.
* `test_human_approval_gate_blocks_execution_until_approved`: Blocks task dispatch until human coordinator signs off.
* `test_task_state_machine_escalation_requires_reason`: Enforces legal lifecycle transitions and requires explicit reasons for escalations.
* `test_location_verification_rule_prohibits_unverified_safe_label`: Prohibits claiming an unverified point is "safe".
* `test_community_incident_report_lifecycle`: Ensures community reports start unverified and tracks verification.
* `test_metrics_calculation`: Validates accurate measurable loop stats.
* `test_privacy_masking_in_volunteer_directory`: Verifies privacy masking of volunteer and resident details.
* `test_offline_export`: Confirms structured offline pack generation.

---

## 6. License & Open Source Commitment

Raabta is licensed under the [MIT License](LICENSE). Contributions, translations, and localized disaster preparedness templates are welcome.
