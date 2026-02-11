# ZenAI

AI-powered mobile app that generates personalized audio meditations on-demand. Unlike Calm or Headspace which offer only pre-recorded content, ZenAI lets you describe exactly what you need — theme, style, duration — and generates a unique audio meditation complete with breathing pauses and silent observation moments.

## Features

- **Custom meditation generation** — describe what you need in natural language and get a unique audio meditation
- **Multiple meditation types** — guided, vipassana, sleep, relaxation, self-compassion, breathing
- **Intelligent pacing** — AI plans speech (~130 wpm) and silence distribution to match your target duration
- **6 TTS voices** — alloy, echo, fable, nova, onyx, shimmer
- **Meditation bell (dong)** — opening and closing bell sounds
- **Sentence-level micro-pauses** — natural breathing pauses injected between sentences
- **Local history** — all meditations saved locally with SQLite for offline replay
- **Configurable durations** — 5, 10, 15, 20, 30, or 40 minutes
- **Multi-language** — meditation language determined by your prompt

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo ~54 / React Native 0.81 |
| Language | TypeScript 5.9 (strict) |
| Navigation | React Navigation 7 (bottom tabs + stack) |
| AI | OpenAI GPT-4o-mini (text) + TTS-1 (speech) |
| Audio | Expo AV |
| Storage | Expo SQLite |
| File System | Expo File System |
| Prompt Testing | Promptfoo |

## Architecture

Clean Architecture with 4 layers and strict dependency rules:

```
Presentation  →  Application  →  Domain
                      ↓
               Infrastructure
```

- **Domain** — entities (`Meditation`), value objects (`MeditationType`, `VoiceOption`, `MeditationSegment`)
- **Application** — use cases, ports/interfaces, DTOs
- **Infrastructure** — adapters for OpenAI, SQLite, audio playback, file system
- **Presentation** — React Native screens, components, hooks, navigation

## Project Structure

```
src/
├── domain/           # Entities and value objects
├── application/      # Use cases, ports, DTOs
├── infrastructure/   # OpenAI, SQLite, audio adapters
├── presentation/     # Screens, components, hooks, theme
├── di/               # Dependency injection container
└── app/              # Root App component
cli/                  # CLI tools for testing generation
promptfoo/            # Prompt evaluation suite
assets/sounds/        # Bell sound (dong.mp3)
```

## Prerequisites

- Node.js 18+
- Expo Go app on your device (for demo)
- OpenAI API key

## Setup

```bash
# Install dependencies
npm install

# Create environment file
echo "OPENAI_API_KEY=sk-your-key-here" > .env
```

## Running

```bash
# Start Expo dev server
npm start

# iOS
npm run ios

# Android
npm run android

# Web (experimental)
npm run web
```

## CLI Testing

Generate meditations from the command line without the mobile app:

```bash
# Text only
npx tsx cli/test-generate.ts --prompt "Breathing meditation" --duration 10

# With audio generation
npx tsx cli/test-generate.ts -p "Sleep meditation" -d 10 -a --voice nova
```

## Prompt Evaluation

Promptfoo suite with 12+ test cases and custom assertions for validating meditation quality:

```bash
# Run evaluations
npm run eval

# View results in browser
npm run eval:view
```

## How It Works

1. **User input** — describe your meditation (prompt, type, duration)
2. **Text generation** — GPT generates a meditation script with `[SILENT Xs]` markers
3. **Parsing** — script is split into speech and silence segments
4. **Audio generation** — TTS generates audio for each speech segment
5. **Concatenation** — all segments stitched into a single audio file
6. **Storage** — audio saved locally, metadata stored in SQLite
7. **Playback** — play, pause, and seek through your meditation

## Cost Estimate

| Duration | GPT-4o-mini | TTS-1 | Total |
|----------|-------------|-------|-------|
| 10 min | ~$0.002 | ~$0.075 | ~$0.08 |
| 40 min | ~$0.005 | ~$0.23 | ~$0.24 |

## License

Private project. All rights reserved.
