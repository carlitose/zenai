# ZenAI Promptfoo Evaluation Suite

Systematic evaluation of meditation script quality using [promptfoo](https://promptfoo.dev).

## Quick Start

### Requirements

- `OPENAI_API_KEY` set in the root `.env` file (or as environment variable)
- Node.js 20+

### Run evaluations

```bash
# Run all 12 test cases
npm run eval

# Open the web UI to explore results
npm run eval:view
```

## Directory Structure

```
promptfoo/
├── promptfooconfig.yaml          # Main config: provider, tests, default assertions
├── prompts/
│   └── meditation-system.json    # System + user prompt template (chat format)
├── assertions/
│   ├── dongMarkers.js            # Validates [DONG] count and placement
│   ├── silentMarkers.js          # Validates [SILENT Xs] markers and total silence
│   ├── wordCount.js              # Validates word count vs duration target
│   ├── noMetaCommentary.js       # Ensures no meta-text or AI filler
│   └── structureValidator.js     # Validates overall meditation structure
└── README.md                     # This file
```

## How to Add a Test Case

Add a new entry to the `tests:` section in `promptfooconfig.yaml`:

```yaml
tests:
  # ... existing tests ...

  - description: "IT guided 10min - gratitudine"
    vars:
      type: guided
      duration: "10"
      prompt: "Meditazione sulla gratitudine e apprezzamento"
    assert:
      # Inline assertions (in addition to defaultTest assertions)
      - type: icontains
        value: "gratitud"
      - type: not-icontains
        value: "gratitude"   # ensure it's in Italian
```

### Variables

| Variable | Description | Example values |
|----------|-------------|---------------|
| `type` | Meditation type | `guided`, `vipassana`, `sleep`, `relaxation`, `self_compassion`, `breathing` |
| `duration` | Target duration in minutes (as string) | `"5"`, `"10"`, `"15"`, `"20"` |
| `prompt` | User's meditation request | Any natural language prompt |

### Inline Assertions

Each test case inherits all `defaultTest` assertions automatically. Use the `assert:` key on individual tests to add test-specific checks (e.g., language verification, topic keywords).

## How to Modify Assertions

Each assertion file exports a function with signature:

```javascript
module.exports = (output, context) => {
  // output: the model's response (string)
  // context.vars: the test variables { type, duration, prompt }
  return {
    pass: true | false,
    score: 0.0 - 1.0,    // partial scoring supported
    reason: "explanation"
  };
};
```

### Configurable Parameters

| Assertion | Parameter | Default | Description |
|-----------|-----------|---------|-------------|
| `dongMarkers` | Expected count | 6 | Total [DONG] markers |
| `dongMarkers` | Opening/closing | 3 + 3 | Split between start and end |
| `silentMarkers` | Duration range | 5-60s | Valid silence duration per marker |
| `silentMarkers` | Min total silence | 30% of target | Minimum total silence percentage |
| `silentMarkers` | Min markers | 2 | Minimum number of silence markers |
| `wordCount` | WPM | 130 | Words per minute rate |
| `wordCount` | Tolerance | ±35% | Acceptable deviation from expected |
| `noMetaCommentary` | Patterns | 11 | Regex patterns for meta-text |
| `structureValidator` | Min spoken lines | 5 | Minimum lines of spoken content |

## How to Create a New Assertion

1. Create a new `.js` file in `assertions/`:

```javascript
// assertions/myNewCheck.js
module.exports = (output, context) => {
  const durationMin = parseInt(context.vars.duration, 10) || 10;

  // Your validation logic here
  const pass = /* your check */;

  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass ? 'Check passed' : 'Check failed because...',
  };
};
```

2. Register it in `promptfooconfig.yaml`:

```yaml
defaultTest:
  assert:
    # ... existing assertions ...
    - type: javascript
      value: file://assertions/myNewCheck.js
```

Or add it to a single test case:

```yaml
tests:
  - description: "specific test"
    vars: { ... }
    assert:
      - type: javascript
        value: file://assertions/myNewCheck.js
```

## Built-in Assertion Types

Promptfoo provides many built-in assertions you can use alongside custom ones:

| Type | Description | Example |
|------|-------------|---------|
| `contains` | Output contains string (case-sensitive) | `value: "[DONG]"` |
| `icontains` | Output contains string (case-insensitive) | `value: "breath"` |
| `not-contains` | Output does NOT contain string | `value: "error"` |
| `not-icontains` | Output does NOT contain string (case-insensitive) | `value: "as an AI"` |
| `javascript` | Custom JS function | `value: file://assertions/check.js` |
| `llm-rubric` | LLM-graded evaluation | `value: "Is this a calming meditation?"` |
| `similar` | Embedding-based similarity | `value: "expected text"`, `threshold: 0.8` |
| `regex` | Regex match | `value: "\\[DONG\\]"` |
| `cost` | Max cost per request | `threshold: 0.10` |
| `latency` | Max latency in ms | `threshold: 30000` |

See [promptfoo assertion docs](https://www.promptfoo.dev/docs/configuration/expected-outputs/) for full reference.

## Provider Configuration

Current provider in `promptfooconfig.yaml`:

```yaml
providers:
  - id: openai:chat:gpt-5.2
    config:
      reasoning_effort: medium
      max_completion_tokens: 16384
```

To change model or parameters:

```yaml
# Use a different model
providers:
  - id: openai:chat:gpt-4o
    config:
      temperature: 0.8
      max_tokens: 8000

# Compare multiple models side by side
providers:
  - id: openai:chat:gpt-5.2
    config:
      reasoning_effort: medium
      max_completion_tokens: 16384
  - id: openai:chat:gpt-4o
    config:
      temperature: 0.8
      max_tokens: 8000
```

## Useful Commands

```bash
# Run all tests (from project root)
npx promptfoo eval -c promptfoo/promptfooconfig.yaml

# Open web UI for results
npx promptfoo view

# Run only Italian tests
npx promptfoo eval -c promptfoo/promptfooconfig.yaml --filter-description "IT"

# Run only English tests
npx promptfoo eval -c promptfoo/promptfooconfig.yaml --filter-description "EN"

# Run a specific test
npx promptfoo eval -c promptfoo/promptfooconfig.yaml --filter-description "IT guided 5min"

# Clear cache (force fresh API calls)
npx promptfoo cache clear

# Output results as JSON
npx promptfoo eval -c promptfoo/promptfooconfig.yaml -o results.json

# Compare with a previous run
npx promptfoo eval -c promptfoo/promptfooconfig.yaml --repeat 2
```

All commands should be run from the **project root** (where `.env` is located). The npm scripts `npm run eval` / `npm run eval:view` handle this automatically.

## Prompt Synchronization

The system prompt in `prompts/meditation-system.json` must stay aligned with:

- **App**: `src/infrastructure/openai/OpenAIMeditationGenerator.ts` (`SYSTEM_PROMPT` constant)
- **CLI**: `cli/test-generate.ts` (`SYSTEM_PROMPT` constant)

When updating the prompt, change all three locations to keep them in sync.
