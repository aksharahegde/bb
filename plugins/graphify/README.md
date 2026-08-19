# bb-plugin-graphify

Official BB plugin that wraps the system [Graphify](https://github.com/Graphify-Labs/graphify) CLI for codebase intelligence.

## Features

- `bb graphify status|update|query|path|affected|god-nodes`
- Compact god-node catalog via `bb.agents.contributeInstructions`
- Settings → Graphify status panel
- Bundled `graphify` skill

Graphs live at `<project>/graphify-out/`. Add that directory to `.gitignore`.

## Install

```bash
bb plugin install graphify
```

Requires `graphify` on PATH (`uv tool install graphifyy`).

## Agent usage

```bash
bb graphify update
bb graphify query "What calls resolveThreadRuntimeCommandConfig?"
bb graphify affected "packages/domain/src/thread.ts"
```
