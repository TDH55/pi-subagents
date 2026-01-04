# Subagent Enhanced

Experimental subagent tool with output truncation, progress tracking, and debug artifacts.

## Features

- **Output Truncation**: Configurable byte/line limits, keeps HEAD
- **Progress Tracking**: Real-time tool/token/duration metrics (sync mode)
- **Debug Artifacts**: Input/output/JSONL/metadata files per task
- **Session-tied Artifacts**: Uses session dir when available (sync), temp dir for async

## Usage

```typescript
{ agent: "worker", task: "refactor auth", async: false }
{ agent: "scout", task: "find todos", maxOutput: { lines: 1000 } }
{ agent: "worker", task: "...", artifacts: false }
```

## Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `maxOutput` | `{bytes?, lines?}` | 200KB, 5000 lines | Truncation limits |
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
