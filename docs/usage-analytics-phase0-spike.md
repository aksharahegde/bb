# Usage analytics — Phase 0 spike findings

Linked from [ADR-001](../.bb/decisions/ADR-001-usage-analytics-from-local-claude-code-and-cursor-history.md).

Survey date: 2026-08-10. Host: macOS (darwin 25.6.0). Scope: Claude Code + Cursor (IDE composer + cursor-agent). Codex excluded per ADR.

## Summary

| Source | Viable for token/cost analytics? | Confidence |
|--------|----------------------------------|------------|
| Claude Code session JSONL | **Yes** — per-API-call `usage` on assistant messages | High |
| Cursor IDE composer (`state.vscdb`) | **Partial** — schema supports `usageData` / `tokenCount`, but often zeroed on surveyed host | Medium |
| Cursor IDE agent transcripts (JSONL) | **No** — message audit trail only, no usage fields | High |
| cursor-agent ACP sessions (`store.db`) | **No (yet)** — turn blobs without extractable usage in v1 survey | Low |
| `ai-code-tracking.db` | **No** — code-attribution telemetry, not LLM token usage | High |

**Recommendation for TASK-003:** implement Claude JSONL ingestion first; implement Cursor IDE `state.vscdb` reader with composer-level `usageData.costInCents` when present and bubble-level `tokenCount` when non-zero; continue cursor-agent protobuf investigation in parallel; do not use `ai-code-tracking.db`.

---

## Claude Code

### Paths (macOS)

| Path | Purpose |
|------|---------|
| `~/.claude/projects/<encoded-cwd>/<session-uuid>.jsonl` | Primary session transcript |
| `~/.claude/projects/<encoded-cwd>/<session-uuid>/subagents/<agent-id>.jsonl` | Subagent sidechains (include in scan) |
| `~/.claude.json` | Project path index only (no usage) — already used by `discover-repos.ts` |

Linux: `~/.claude/...`. Windows: `%USERPROFILE%\.claude\...`.

Encoded cwd example: `/Users/me/projects/bb` → `-Users-me-projects-bb`.

### Record shape

Newline-delimited JSON. Relevant lines:

- `type: "assistant"` with `message.usage` and `message.model`
- `type: "user"` with `toolUseResult.usage` + `agentId` for subagents
- `type: "result"` with top-level `usage` (session rollup — use for validation, not per-turn ingestion)

### Usage fields (assistant `message.usage`)

```json
{
  "input_tokens": 8902,
  "output_tokens": 274,
  "cache_creation_input_tokens": 2886,
  "cache_read_input_tokens": 18455,
  "cache_creation": {
    "ephemeral_1h_input_tokens": 2886,
    "ephemeral_5m_input_tokens": 0
  }
}
```

Reasoning tokens: when present, appear in output breakdown (no separate field in all samples; treat `output_tokens` as inclusive unless provider adds `reasoning` later).

### Timestamps

- Per line: `timestamp` (ISO-8601) on assistant/user rows
- Session id: `sessionId` / `session_id` (both appear — normalize to one)

### Dedupe strategy

**Problem:** one API response is split across multiple `type: "assistant"` lines (thinking, text, tool_use) sharing the same `message.id`. Counting every line multiplies usage (~2× observed on a real session).

**Stable event id:**

```
claude-code:{sessionId}:{message.id}
```

Ingest usage once per unique `message.id` where `message.usage` is present. For subagents, include `toolUseResult.agentId` in the key:

```
claude-code:{sessionId}:subagent:{agentId}:{turnUuid}
```

### Scan strategy

- Walk `~/.claude/projects/**/*.jsonl` (skip `subagents/` optional flag: include by default)
- Incremental cursor: `(filePath, byteOffset, mtimeMs)` per file
- Time-box reads (same pattern as `discover-repos.ts`)

### Fixture

`apps/host-daemon/test-fixtures/usage-history/claude-code/sample-session.jsonl`

---

## Cursor IDE (composer)

### Paths (macOS)

| Path | Purpose |
|------|---------|
| `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` | Cross-workspace composer bodies, bubbles, `cursorDiskKV` |
| `~/Library/Application Support/Cursor/User/workspaceStorage/<hash>/state.vscdb` | Per-workspace composer registry (Cursor ≤3.0); may be sparse after migration |
| `~/Library/Application Support/Cursor/User/workspaceStorage/<hash>/workspace.json` | Maps hash → `file:///…` cwd |

Linux: `~/.config/Cursor/User/...`. Windows: `%APPDATA%\Cursor\User\...`.

Open **read-only** (`?mode=ro`); WAL may lag a few seconds — acceptable for analytics.

### Tables

Both `ItemTable` and `cursorDiskKV` (key TEXT, value BLOB/JSON).

### Keys

| Key pattern | Content |
|-------------|---------|
| `composerData:{composerUuid}` | Session metadata, `fullConversationHeadersOnly[]`, `usageData`, `createdAt` |
| `bubbleId:{composerUuid}:{bubbleUuid}` | Individual user/assistant bubble |
| `composer.composerHeaders` (`ItemTable`) | Central index of composers (Cursor 3.0+) with `workspaceIdentifier` |

### Usage fields

**Composer rollup** (`composerData.usageData`):

```json
{
  "default": { "costInCents": 8, "amount": 2 },
  "claude-sonnet-4": { "costInCents": 12, "amount": 5 }
}
```

`costInCents` is provider-reported when populated. `amount` semantics unclear — treat as opaque unless documented by Cursor.

**Per-bubble** (`bubbleId.tokenCount`):

```json
{ "inputTokens": 0, "outputTokens": 0 }
```

On the surveyed host: **2014 bubbles had `tokenCount` keys; all were zero**. Community docs report ~96% zero rate — do not rely on bubbles alone.

### Timestamps

- `composerData.createdAt` / `lastUpdatedAt` (epoch ms when present)
- Bubble rows may include timing fields; prefer composer session time for daily rollups when only composer-level `usageData` exists

### Dedupe strategy

```
cursor-ide:{composerUuid}
```

For composer-level `usageData` entries per model key, emit one event per model bucket per composer when `costInCents > 0`.

If per-bubble `tokenCount` is non-zero in future Cursor versions:

```
cursor-ide:{composerUuid}:{bubbleUuid}
```

### Scan strategy

1. Enumerate `globalStorage/state.vscdb` + all `workspaceStorage/*/state.vscdb`
2. Query `cursorDiskKV` where `key LIKE 'composerData:%'`
3. Join bubble ids from `fullConversationHeadersOnly` only when bubble tokens are non-zero
4. Map workspace hash → cwd via `workspace.json` for optional drill-down

### Fixture

`apps/host-daemon/test-fixtures/usage-history/cursor/ide-composer-data.json`
`apps/host-daemon/test-fixtures/usage-history/cursor/ide-composer-bubble.json`

---

## Cursor IDE (agent mode)

### Paths

`~/.cursor/projects/<encoded-workspace>/agent-transcripts/<composer-or-agent-uuid>/<uuid>.jsonl`

### Record shape

```json
{ "role": "user|assistant", "message": { "content": [...] } }
```

Optional `type`, `status`. **No `usage`, `model`, or token fields** in surveyed bb project transcripts (215 lines across 3 files).

Use for session discovery / titles only, not cost analytics.

### Fixture

`apps/host-daemon/test-fixtures/usage-history/cursor/ide-agent-transcript.jsonl`

---

## cursor-agent (ACP / CLI)

### Paths

| Path | Purpose |
|------|---------|
| `~/.cursor/acp-sessions/<session-uuid>/store.db` | Blob store (`blobs`, `meta` tables) |
| `~/.cursor/acp-sessions/<session-uuid>/meta.json` | `cwd`, `title`, `schemaVersion` |
| `~/.cursor/chats/<workspace-hash>/<composer-uuid>/store.db` | IDE-originated agent chats (same blob schema) |

### Record shape

- `meta` table row `0`: hex-encoded JSON with `agentId`, `createdAt`, `lastUsedModel`, `name`
- `blobs`: mix of JSON (`role`/`content`) and protobuf/binary payloads; assistant JSON uses `redacted-reasoning` blocks

**No extractable per-turn token usage** found in UTF-8 JSON blobs on surveyed sessions.

### Follow-up for TASK-003

- Reverse-engineer protobuf turn envelopes in `blobs` (or locate a Cursor CLI export)
- Check whether cursor-agent mirrors IDE `state.vscdb` usage server-side via Dashboard RPC (historical endpoint TBD)
- Until then, attribute cursor-agent spend through IDE composer `usageData` when sessions overlap, or mark as `unpriced` with session counts only

### Fixture

`apps/host-daemon/test-fixtures/usage-history/cursor/acp-meta.json` (synthetic from observed schema)

---

## Cross-machine dedupe (server)

After host normalizes events:

```
id = sha256("{provider}:{sourceSurface}:{stableKey}")
```

`sourceSurface`: `claude-jsonl` | `cursor-ide-composer` | `cursor-agent-acp`.

Same physical session synced across machines should collide on `stableKey` when session uuids match.

---

## Cost mapping

| `costSource` | When |
|--------------|------|
| `provider-reported` | Cursor `usageData.*.costInCents` present |
| `model-priced` | Claude usage + known model in pricing catalog |
| `unpriced` | Missing model or zero token fields |

Store `costUsdMicros` as integer (`cents * 10_000` for provider-reported; catalog math for model-priced).

---

## Open risks

1. **Cursor token fields often zero** — dashboard may need composer-level cents + model-priced estimates from partial token data
2. **cursor-agent blob format is opaque** — may block accurate per-model splits for CLI-only work
3. **Cursor schema migrations** (e.g. 3.0 composer header move) — parsers need version adapters
4. **Large histories** — all-time retention; incremental scan + SQLite indexes required

## Next task

Proceed to **TASK-003**: host daemon `usage.history.scan` with Claude parser + Cursor `state.vscdb` reader (readonly).
