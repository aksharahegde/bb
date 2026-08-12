You are an **Expert Staff/Senior Fullstack Engineer, Software Architect, Developer Productivity Engineer, and Agentic IDE Architect**.

Your task is to deeply analyze **BB (https://github.com/get-bb/bb)** and determine how BB can be enhanced into a significantly more powerful **Senior Engineer Agentic Development Environment**.

BB is an agentic IDE that can work with coding agents, tools, integrations, and extensible development workflows. Do not analyze BB as if it were a traditional editor such as VS Code.

Think of BB as an **AI-native engineering control plane**.

The objective is to discover:

1. What BB already provides.
2. What capabilities BB is missing.
3. Which existing plugins/tools/MCP servers/integrations should be added.
4. Which capabilities should instead become native BB features.
5. Which specialized agents/skills should exist.
6. How BB can provide significantly better visibility and control over AI-assisted development.
7. How BB can evolve toward an **AI Engineering Operating System for senior engineers**.

---

# 1. Analyze BB Before Making Recommendations

Start by thoroughly inspecting the BB repository.

Use the actual source code, documentation, package structure, configuration, issues, and relevant repository history.

Understand:

* BB architecture
* Workspace architecture
* Agent runtime
* Agent integrations
* Claude Code integration
* Codex integration
* Host/daemon architecture
* Plugin architecture
* Tool architecture
* Skill architecture
* MCP support
* Command execution
* Terminal integration
* File system integration
* Git integration
* Project management
* Session management
* Agent orchestration
* Agent communication
* State management
* Persistence
* UI architecture
* Extension mechanisms
* Configuration
* Permissions
* Security boundaries
* Context handling
* Memory mechanisms
* Event systems
* Logging
* Telemetry
* Any existing observability capabilities

Do not assume a feature exists.

Verify it from the repository.

---

# 2. Build a BB Capability Map

Create a capability map of BB.

Classify capabilities into:

### Native BB Capability

Implemented directly by BB.

### Agent Capability

Provided by Claude Code, Codex, or another agent runtime.

### Plugin / Extension

Provided through BB's extensibility system.

### MCP / External Tool

Provided externally.

### Developer Workflow

Something the user currently has to do manually.

For each capability determine:

* What it does
* Where it exists
* How agents access it
* Whether it is persistent
* Whether it is observable
* Whether it is extensible
* Whether it is sufficient for a senior engineer

---

# 3. Identify the Gap Between "Agent IDE" and "Senior Engineer IDE"

Do not simply ask:

> "What plugins are missing?"

Instead ask:

> **"What information, controls, intelligence, and automation does a senior engineer need that BB currently does not provide?"**

Analyze these dimensions:

| Area                   | BB Today | Gap | Recommended Solution |
| ---------------------- | -------- | --- | -------------------- |
| Codebase Intelligence  |          |     |                      |
| Context Engineering    |          |     |                      |
| Agent Orchestration    |          |     |                      |
| Agent Memory           |          |     |                      |
| Coding Sessions        |          |     |                      |
| Git Intelligence       |          |     |                      |
| Testing                |          |     |                      |
| Debugging              |          |     |                      |
| Architecture           |          |     |                      |
| Security               |          |     |                      |
| Performance            |          |     |                      |
| Production             |          |     |                      |
| Dependencies           |          |     |                      |
| Documentation          |          |     |                      |
| Technical Debt         |          |     |                      |
| Developer Productivity |          |     |                      |

---

# 4. Senior Engineer Context Layer

Design what BB should know before allowing an agent to work.

The context system should potentially combine:

* Workspace
* Project
* Current branch
* Git history
* Git diff
* Related files
* Dependencies
* API contracts
* Database schemas
* Tests
* Documentation
* ADRs
* Issues
* PRs
* CI status
* Runtime logs
* Production incidents
* Previous coding sessions
* Previous agent discoveries
* Developer preferences
* Project conventions

The key question:

> **How can BB give an agent the right context instead of simply giving it more context?**

Recommend mechanisms for:

* Context ranking
* Context retrieval
* Context caching
* Context compression
* Context invalidation
* Context provenance
* Context freshness
* Context prioritization

---

# 5. Codebase Intelligence

Evaluate whether BB needs a deeper engineering knowledge layer.

Consider:

* Symbol index
* AST index
* Semantic code search
* Dependency graph
* Import graph
* Call graph
* API graph
* Database relationship graph
* Feature-to-code graph
* Architecture graph
* Runtime dependency graph
* Ownership graph
* Change-impact graph

The system should allow an agent to answer:

> "What parts of the system depend on this function?"

> "Which APIs consume this service?"

> "What could break if I modify this model?"

> "Which tests cover this behavior?"

> "Which components are architecture hotspots?"

---

# 6. Coding Session Intelligence

This should be treated as a **first-class BB capability**.

BB should understand what happened during an engineering session.

Track relevant events such as:

* User objective
* Active task
* Agent activated
* Agent handoff
* Files inspected
* Files changed
* Commands executed
* Tests executed
* Test failures
* Errors
* Fix attempts
* Successful fixes
* Dependencies changed
* Git changes
* Commits
* Architecture decisions
* Human approvals
* Blockers
* TODOs
* Deferred work
* Technical debt discovered

At any point the developer should be able to ask:

> "What have I done in this session?"

> "Why did I change this file?"

> "What failed earlier?"

> "Which approaches did we already try?"

> "What is still unfinished?"

---

# 7. Session Memory

Design a persistent session-memory system.

Potential layers:

### Global Memory

Information useful across projects.

### Workspace Memory

Shared knowledge across projects in a workspace.

### Project Memory

Architecture, conventions, technology decisions.

### Task Memory

Information specific to the current task.

### Session Memory

What happened during the current session.

### Agent Memory

What an individual agent discovered.

### Decision Memory

Important engineering decisions.

Determine:

* Storage model
* Retrieval strategy
* Expiration
* Versioning
* Validation
* Conflict resolution
* Privacy boundaries

Avoid creating an unstructured "AI memory dump."

---

# 8. Agent Orchestration

Analyze whether BB needs stronger multi-agent orchestration.

Evaluate:

* Parent agents
* Child agents
* Parallel agents
* Agent pipelines
* Agent dependencies
* Agent handoffs
* Shared context
* Shared memory
* Agent cancellation
* Retry policies
* Timeouts
* Task prioritization
* Resource limits
* Human approval points

Design an **Agent Task Graph** where appropriate.

Example:

```text
User Requirement
      ↓
Planning Agent
      ↓
Architecture Agent
      ├── Database Agent
      ├── Backend Agent
      └── Frontend Agent
                ↓
           Testing Agent
                ↓
          Security Agent
                ↓
           Review Agent
                ↓
         Human Approval
```

Determine what BB already supports and what is missing.

---

# 9. Agent Mission Control

Design an ideal **Mission Control** interface inside BB.

It should provide visibility into:

### Active Agents

* Agent
* Task
* Status
* Parent/child relationship
* Runtime
* Cost
* Context usage

### Live Activity

* Tool calls
* Commands
* Files accessed
* Files modified
* Tests
* Errors
* Agent handoffs

### Task Graph

Visualize how agents are collaborating.

### Session Timeline

Show the progression of engineering work.

### Human Control

Allow the developer to:

* Pause
* Resume
* Cancel
* Retry
* Approve
* Reject
* Reassign
* Escalate

---

# 10. Agent Permissions

Design a permission model appropriate for autonomous engineering.

Separate:

### Read Operations

* Files
* Git
* Database
* Logs

### Write Operations

* Source
* Config
* Documentation

### Execute Operations

* Shell
* Tests
* Package manager
* Git

### External Operations

* APIs
* Cloud
* Production

### Destructive Operations

* Delete
* Reset
* Force push
* Database mutation
* Deployment

Classify actions as:

**Autonomous**

**Approval Required**

**Restricted**

The permission system should be agent-aware, tool-aware, workspace-aware, and task-aware.

---

# 11. Change Impact Analysis

Before an agent modifies important code, BB should be capable of determining:

* What depends on it?
* What APIs are affected?
* What database objects are affected?
* What tests are affected?
* What documentation is affected?
* What deployments may be affected?
* What security implications exist?

Generate a risk report:

```text
Change Risk: HIGH

Affected:
- 8 modules
- 3 APIs
- 2 database tables
- 17 tests

Risks:
- Breaking API contract
- Cache invalidation
- Backward compatibility

Recommended validation:
- Unit tests
- Integration tests
- API tests
- E2E tests
```

---

# 12. Git Intelligence

Analyze how BB could become Git-aware at the engineering level.

Capabilities may include:

* Branch intelligence
* Commit intelligence
* Diff intelligence
* PR intelligence
* Change-risk scoring
* Commit quality
* Review preparation
* Review feedback processing
* Merge-conflict prediction
* Regression analysis
* Changelog generation
* Release-note generation

The goal is not merely:

> "Show Git status."

The goal is:

> **"Understand the engineering implications of the Git changes."**

---

# 13. Testing Intelligence

Determine how BB can make testing agentic.

Potential capabilities:

* Automatic test discovery
* Impact-based test selection
* Test generation
* Regression testing
* Failed-test clustering
* Flaky-test detection
* Coverage analysis
* Missing-test detection
* E2E test selection
* Test prioritization

The system should answer:

> "Given these changes, which tests should actually run?"

rather than blindly executing everything.

---

# 14. Debugging Intelligence

Design a BB debugging intelligence pipeline:

```text
Error
 ↓
Stack Trace
 ↓
Relevant Code
 ↓
Recent Changes
 ↓
Related Logs
 ↓
Dependency Changes
 ↓
Historical Similar Errors
 ↓
Likely Root Cause
 ↓
Reproduction
 ↓
Fix
 ↓
Regression Test
```

Determine which integrations/plugins/tools are needed.

---

# 15. Production Intelligence

Evaluate whether BB should connect engineering work to runtime behavior.

Potential integrations:

* Sentry
* Datadog
* OpenTelemetry
* Grafana
* CloudWatch
* Logs
* Metrics
* Traces
* Deployment systems
* CI/CD
* Cloud platforms
* Databases

The ideal BB capability should allow:

> Production Error → Deployment → Commit → PR → Files → Functions → Likely Cause

Clearly separate read-only production observability from production mutation privileges.

---

# 16. Architecture Intelligence

BB should understand more than source files.

Evaluate support for:

* Architecture maps
* ADRs
* System boundaries
* Domain models
* Service relationships
* Data flows
* API boundaries
* Infrastructure relationships
* Architectural hotspots

Enable questions such as:

> "Why is this service structured this way?"

> "What architectural decisions affect this feature?"

> "Which components violate our architecture?"

---

# 17. Dependency Intelligence

Evaluate capabilities for:

* Dependency inventory
* Outdated dependencies
* Vulnerability detection
* Breaking changes
* Deprecated APIs
* Upgrade planning
* Framework migration
* Dependency conflicts

For example:

```text
Upgrade: Django 5 → Django 6

Risk: Medium

Affected:
- 12 source files
- 2 configuration files
- 3 deprecated APIs

Recommended:
1. ...
2. ...
3. ...

Tests:
- ...
```

The agent should proactively warn about upgrade implications.

---

# 18. Security Intelligence

Evaluate integration with:

* SAST
* Dependency scanning
* Secret detection
* Container scanning
* IaC scanning
* API security
* Authentication/authorization analysis
* OWASP checks

Security findings should be connected to:

**Vulnerability → Code → Dependency → Commit → Agent Change**

---

# 19. Performance Intelligence

Evaluate support for:

* Frontend performance
* Backend latency
* Database performance
* Slow queries
* N+1 queries
* Bundle size
* Network usage
* Memory
* CPU
* API latency
* Performance regression

The agent should be able to reason about performance impacts before and after a change.

---

# 20. Proactive Engineering Intelligence

One of the biggest opportunities for BB.

Determine when BB should proactively tell the engineer things such as:

> "This change modifies a public API. Three consumers may be affected."

> "This database migration could lock a large table."

> "You modified authentication code without adding tests."

> "This dependency is deprecated."

> "This error has appeared repeatedly across recent sessions."

> "This file has become an architectural hotspot."

> "You have attempted this debugging approach before."

Proactivity must be configurable.

Avoid notification overload.

---

# 21. Reusable Skills

Analyze whether BB should learn recurring engineering workflows.

Example:

```text
Repeated workflow:

Inspect framework release
→ identify breaking changes
→ scan repository
→ map affected APIs
→ generate migration plan
→ implement
→ run validation
→ generate report
```

When BB detects repeated workflows, it should be able to suggest:

> "This looks like a reusable engineering workflow. Create a BB skill?"

Determine which workflows should become:

* Skills
* Commands
* Agents
* Plugins
* MCP tools
* Automations

---

# 22. Plugin / MCP / Integration Audit

Now recommend **specific technologies** that should be integrated into BB.

For every recommendation provide:

| Tool | Type | BB Gap Solved | Integration Point | Local/Cloud | Security Risk | Token/Cost Impact | Priority |
| ---- | ---- | ------------- | ----------------- | ----------- | ------------- | ----------------- | -------- |

Classify each recommendation as:

* Native BB feature
* Plugin
* MCP server
* Agent
* Skill
* CLI integration
* External service

Do not recommend something merely because it is popular.

Tie every recommendation to an identified BB capability gap.

---

# 23. Avoid Tool Sprawl

This is critical.

For every proposed integration determine:

1. Does BB already support this?
2. Can an existing BB capability provide it?
3. Can an agent skill provide it?
4. Can an MCP server provide it?
5. Should this become native BB functionality?
6. Does the tool duplicate another recommendation?
7. Does it increase context/token cost?
8. Does it increase maintenance burden?
9. Does it introduce data/privacy risks?

Prefer a **small, composable engineering platform** over dozens of disconnected plugins.

---

# 24. What BB Should Build Itself

Since BB is an agent IDE that can build itself, explicitly identify functionality that is better implemented **inside BB rather than delegated to third-party tools**.

Prioritize native capabilities for things such as:

* Session intelligence
* Agent Mission Control
* Agent Task Graph
* Context orchestration
* Agent permissions
* Agent lifecycle management
* Agent memory
* Cross-agent communication
* Engineering activity timeline
* Change-impact engine
* Skill discovery
* Agent observability

For each, explain:

**Why native BB?**

**What should the API look like?**

**What should remain extensible?**

---

# 25. Recommended BB Architecture

Based on everything discovered, propose an architecture resembling:

```text
                    ┌──────────────────────┐
                    │      Developer       │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   BB Mission Control │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
          ┌─────▼─────┐  ┌─────▼─────┐  ┌────▼──────┐
          │   Agent   │  │   Agent   │  │   Agent   │
          │   Plane   │  │   Plane   │  │   Plane   │
          └─────┬─────┘  └─────┬─────┘  └────┬──────┘
                └──────────────┼──────────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Agent Orchestrator │
                    └──────────┬───────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
    ┌─────▼─────┐        ┌─────▼─────┐        ┌────▼─────┐
    │   Memory  │        │  Context  │        │  Policy  │
    │   Layer   │        │  Engine   │        │  Engine  │
    └───────────┘        └───────────┘        └──────────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Engineering Graph   │
                    │ Code / Git / Tests /  │
                    │ APIs / DB / Runtime   │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
          Plugins             MCP              Skills
             │                 │                 │
             └─────────────────┼─────────────────┘
                               │
                    External Engineering
                    Systems & Services
```

Replace this conceptual architecture with a more accurate BB-specific architecture based on the repository.

---

# 26. Final Deliverable

Produce a detailed report with:

## 1. BB Architecture Summary

## 2. Existing Agent Capabilities

## 3. Existing Extension Points

## 4. Existing Plugins / Tools / Integrations

## 5. Capability Gaps

## 6. Senior Engineer Requirements

## 7. Coding Session Intelligence

## 8. Agent Memory Architecture

## 9. Agent Orchestration

## 10. Agent Mission Control

## 11. Context Engineering

## 12. Codebase Intelligence

## 13. Change Impact Intelligence

## 14. Git / PR Intelligence

## 15. Testing / Debugging Intelligence

## 16. Architecture Intelligence

## 17. Security / Performance Intelligence

## 18. Production Intelligence

## 19. Recommended Plugins / MCP / Tools

## 20. Recommended Agents

## 21. Recommended Skills

## 22. Native BB Features Worth Building

## 23. Tool Consolidation

## 24. Priority Matrix

## 25. Implementation Roadmap

---

# 27. Priority Framework

Use:

### P0 — Essential

Major capability gap for a senior engineer.

### P1 — High Value

Substantial productivity or engineering-quality improvement.

### P2 — Useful

Meaningful but workflow-specific.

### P3 — Experimental

Potential future capability.

For each recommendation score:

* Engineering Impact
* Developer Control
* Agent Value
* Implementation Effort
* Maintenance Cost
* Security Risk
* Context/Token Cost

---

# Final Principle

Do not optimize BB for:

> "More AI agents."

Optimize BB for:

> **Better engineering decisions, better context, better control, better visibility, and safer autonomy.**

The final goal is for a senior engineer to be able to open BB and immediately understand:

> **What am I working on?**

> **What are my agents doing?**

> **What changed?**

> **Why did it change?**

> **What has already been tried?**

> **What could break?**

> **What should I validate?**

> **What technical debt did we create?**

> **What architectural decisions are relevant?**

> **What happened in my previous sessions?**

> **What should I do next?**

> **Which agents/tools should handle the work?**

The result should make BB feel less like an IDE with AI attached and more like a **Senior Engineer Control Plane with an autonomous engineering team inside it**.

Always ground recommendations in the actual BB repository and clearly distinguish:

**Already exists → Missing → Should integrate → Should build natively → Future/experimental.**

