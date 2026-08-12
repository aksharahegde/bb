---
name: change-impact
description: Use before risky edits to assess blast radius from dirty files and Graphify affected nodes.
---

# Change Impact

Before large refactors or edits in shared modules, assess risk:

```sh
bb impact --self --json
# or
bb impact --environment <environment-id> --json
```

Then deepen with Graphify:

```sh
bb graphify affected "<symbol-or-file>"
bb graphify query "what depends on <module>"
```

## Rules

1. Prefer `bb impact` once when starting work on a dirty tree.
2. Use `bb graphify affected` on the exact file or symbol you will change.
3. Treat `package.json`, lockfiles, auth, schema, and `.github/` as high sensitivity.
4. Run the suggested focused tests before declaring done.
