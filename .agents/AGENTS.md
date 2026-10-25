# Project-Specific Engineering Context

This file is for project-specific facts and constraints. Keep global engineering behavior in the global `AGENTS.md`; avoid duplicating it here.

Before changing code:
- Read `README.md` and `PROJECT_GOVERNANCE.md` if present.
- Identify the project's actual test, lint, type-check, and build commands.
- Follow existing architecture and naming conventions unless the task explicitly changes them.
- Update documentation when behavior, setup, configuration, or public interfaces change.
- For non-trivial work, use `/plan-implement-review`; use `/code-review` for a review-only pass.
- Do not assume the project uses a particular language or framework.
