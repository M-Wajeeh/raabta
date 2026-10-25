---
trigger: model_decision
description: Apply when writing tests, changing application behavior, debugging, or reviewing code.
---

# Testing and Review Protocol

- Discover existing test tooling and conventions before adding a new framework.
- Cover normal behavior, boundary conditions, and important failure paths.
- Prefer meaningful assertions over tests that merely execute code.
- Avoid brittle tests coupled to implementation details unless necessary.
- Run focused checks after each meaningful change, then broader checks appropriate to risk.
- Review the entire diff for regressions, security/privacy issues, performance, complexity, and unrelated edits.
- Separate pre-existing failures from failures introduced by the current change when evidence allows.
- If checks cannot run, explain the blocker and do not imply they passed.
