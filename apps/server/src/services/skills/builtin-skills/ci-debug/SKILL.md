---
name: ci-debug
description: Use when GitHub checks fail on a PR and you need a diagnose-then-fix loop.
---

# CI Debug

1. List failing checks:

```sh
bb github checks [pr] --json
```

2. Open the failing job logs (via the check URL or `gh run view` when available).

3. Reproduce locally with the smallest command from the failure.

4. Fix with a minimal diff; re-run focused tests.

5. Re-check:

```sh
bb github checks [pr]
```

Prefer `bb impact` / `bb graphify affected` when the failure touches shared modules.
