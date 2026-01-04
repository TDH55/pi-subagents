# Subagent Enhanced

Experimental subagent tool with output truncation, progress tracking, and debug artifacts.

Forked from the [async-subagent example](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/examples/custom-tools/async-subagent) in pi-mono.

## Features

- **Output Truncation**: Configurable byte/line limits via `maxOutput`
- **Progress Tracking**: Real-time tool/token/duration metrics (sync mode)
- **Debug Artifacts**: Input/output/JSONL/metadata files per task
- **Session-tied Artifacts**: Uses session dir when available (sync), temp dir for async
- **Session-scoped Notifications**: Async completions only notify the originating session

## Modes

| Mode | Async Support | Notes |
|------|---------------|-------|
| Single | Yes | `{ agent, task }` |
| Chain | Yes | `{ chain: [{agent, task}...] }` with `{previous}` placeholder |
| Parallel | Sync only | `{ tasks: [{agent, task}...] }` - auto-downgrades if async requested |

## Usage

```typescript
{ agent: "worker", task: "refactor auth", async: false }
{ agent: "scout", task: "find todos", maxOutput: { lines: 1000 } }
{ tasks: [{ agent: "scout", task: "a" }, { agent: "scout", task: "b" }] }
{ chain: [{ agent: "scout", task: "find" }, { agent: "worker", task: "fix {previous}" }] }
```

## Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `async` | boolean | true | Background execution (single/chain only) |
| `maxOutput` | `{bytes?, lines?}` | 200KB, 5000 lines | Truncation limits for final output |
| `artifacts` | boolean | true | Write debug artifacts |
| `includeProgress` | boolean | false | Include full progress in result |

## Artifacts

Location: `{sessionDir}/subagent-artifacts/` or `/tmp/pi-subagent-artifacts/`

Files per task:
- `{runId}_{agent}_input.md` - Task prompt
- `{runId}_{agent}_output.md` - Full output (untruncated)
- `{runId}_{agent}.jsonl` - Event stream (sync only)
- `{runId}_{agent}_meta.json` - Timing, usage, exit code

## Event

Async completion: `subagent_enhanced:complete`

## Files

```
├── index.ts           # Main tool
├── subagent-runner.ts # Async runner
├── agents.ts          # Agent discovery
├── artifacts.ts       # Artifact management
└── types.ts           # Shared types
```
