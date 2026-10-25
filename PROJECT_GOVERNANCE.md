# Project Governance: Raabta

## Purpose
- **Problem this project solves**: Bridges the critical "last mile" gap between official disaster warnings and organized community action.
- **Intended users**: Community emergency coordinators, volunteer group leaders, and local residents during hazard preparedness and response.
- **Out of scope**: Competing with national meteorological or forecasting agencies; automated live SMS/WhatsApp broadcast delivery; real-time dynamic vehicular road routing in MVP.

## Architecture
- **Main entry points**:
  - Backend API: `backend/app/main.py` (FastAPI)
  - Frontend SPA: `frontend/src/main.jsx` (React + Vite + Leaflet)
- **Main modules/services**:
  - `backend/app/templates.py`: Approved standard emergency operational templates.
  - `backend/app/extractor.py`: Evidence-grounded alert parser (no fabricated precautions, quotes source text).
  - `backend/app/models.py`: Pydantic models & state machine transitions (`DRAFT` -> `PUBLISHED` -> `ASSIGNED` -> `COMPLETED`/`ESCALATED`).
  - `backend/app/database.py`: SQLite datastore.
  - `backend/app/seed.py`: Seeded Riverside flood scenario for reproducible evaluation.
  - `frontend/src/components/`: Interactive Map, Action Plan Board, Unmet Needs Feed, Printable Cards.
- **Data stores and external services**:
  - Embedded SQLite database. Zero external paid dependencies required for core demo/tests.
- **Important constraints & Core Rules**:
  - **No AI-invented instructions**: Tasks must be derived from vetted emergency templates and parameterized by verified alert fields.
  - **Evidence Anchoring**: Source alert text citations must accompany all extracted precautions.
  - **Human Approval Gate**: Action plans remain in `DRAFT_PENDING_APPROVAL` until explicitly approved and published by a coordinator.
  - **No False Safety Labels**: Locations on maps must never be labeled "safe". Use `"designated assembly point — verification required"` until official confirmation is recorded.
  - **Privacy by Design**: Sensitive vulnerable resident details and exact private home coordinates are never exposed publicly.
  - **Offline Usability**: Client-side localStorage persistence and printable emergency action cards.

## Development commands
- Install/setup:
  - Backend: `python -m pip install -r backend/requirements.txt`
  - Frontend: `npm install --prefix frontend`
- Run locally:
  - Backend: `python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload`
  - Frontend: `npm run dev --prefix frontend`
- Tests:
  - Backend: `pytest backend/tests -v`
- Lint/format:
  - Backend: `flake8 backend` / `ruff check backend`
  - Frontend: `npm run lint --prefix frontend`
- Build/package:
  - Frontend: `npm run build --prefix frontend`

## Acceptance criteria
1. **Official Alert Ingestion**: Correctly extracts hazard, severity, zone, timeline, and preserves source evidence quotes.
2. **Template-Driven Task Plan**: Generates actionable tasks strictly from approved templates without hallucinated instructions.
3. **Approval Gate**: Prohibits assigning or publicizing tasks before human coordinator approval.
4. **Action Completion Loop**: Volunteer assignment, progress reporting, and escalation of unresolvable needs.
5. **Report Verification**: Community reports start as `unverified`; only marked `verified` upon coordinator review.
6. **Zero-API-Key Offline Guarantee**: 100% runnable offline and during judging walkthrough.

## Human approval boundaries
- Modifying standard approved emergency templates (`templates.py`).
- Public dispatch or external broadcasting of emergency action plans.
- Transitioning incident reports or assembly points to verified/authoritative status.
- Destructive database resets outside test fixture environments.

## Known limitations and technical debt
- MVP uses localized SQLite rather than multi-tenant PostgreSQL.
- Initial mapping displays seeded coordinate zones and mock GIS boundaries.
