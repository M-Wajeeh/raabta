---
trigger: always_on
description: Baseline engineering quality requirements for all project files.
---

# Engineering Quality

- Optimize for correctness, clarity, maintainability, and fit to requirements, not minimum line count or maximum abstraction.
- Prefer the smallest complete change. Avoid unrelated refactors and speculative features.
- Keep functions and modules cohesive; split only when it improves comprehension, testing, or reuse.
- Validate untrusted inputs at system boundaries and handle expected failures explicitly.
- Do not suppress errors or loosen checks without explaining why and obtaining approval when risk is material.
- Add or update tests for behavior changes and bug fixes.
- Inspect the final diff and report exactly which checks were run.
- Never invent test results, benchmarks, API behavior, or repository facts.
