---
name: git-pr
description: Use when reviewing, updating checks, or merging a pull request with bb + GitHub.
---

# Git / PR Checklist

1. Confirm the thread environment and branch:

```sh
bb thread show <thread-id> --json
```

2. Review the diff:

```sh
bb thread show <thread-id> --git-diff
```

3. Check CI:

```sh
bb github checks [pr] --json
```

4. Address failing checks (`ci-debug` skill) before merge.

5. Merge only when checks are green and review policy is satisfied (use the
   thread PR controls or `gh pr merge` as appropriate).

Do not force-push protected branches unless the user explicitly requests it.
