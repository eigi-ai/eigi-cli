<div align="center">

# eigi CLI

**The official command-line interface for [eigi.ai](https://eigi.ai)**

Manage AI voice agents, prompts, calls, and chat — all from your terminal.

[![npm version](https://img.shields.io/npm/v/@eigiai/cli.svg)](https://www.npmjs.com/package/@eigiai/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

</div>

---

## Features

- **Agent Management** — Create, update, list, and delete AI voice agents with full STT/LLM/TTS configuration
- **Prompt Versioning** — Manage system prompts with automatic versioning and file/stdin support
- **Interactive Chat** — Real-time streaming chat with agents directly from your terminal
- **Outbound Calls** — Initiate AI-powered phone calls to one or multiple numbers
- **Conversation History** — Browse and inspect past calls and chat sessions
- **Provider Discovery** — Explore available LLM, TTS, and STT providers, models, and voices
- **JSON Output** — Every command supports `--json` for scripting and automation
- **Pipe-friendly** — Read prompts from files, pipe stdin, and chain commands with `jq`

---

## Installation

### npm (recommended)

```bash
npm install -g @eigiai/cli
```

### npx (no install)

```bash
npx @eigiai/cli agents list
```

### From source

```bash
git clone https://github.com/cliniq360/eigi-cli.git
cd eigi-cli
npm install && npm run build
npm link   # makes 'eigi' available globally
```

---

## Quick Start

```bash
# 1. Set your API key (get one at https://studio.eigi.ai)
eigi config set-key YOUR_API_KEY

# 2. List your agents
eigi agents list

# 3. Start chatting
eigi chat interactive <AGENT_ID>
```

> **Tip:** Set `EIGI_BASE_URL` to point to a local or staging server:
>
> ```bash
> eigi config set-url http://localhost:4000
> ```

---

## Commands

### `eigi agents` — Manage AI Agents

| Command                             | Description                                               |
| ----------------------------------- | --------------------------------------------------------- |
| `eigi agents list`                  | List all agents (supports `--type`, `--search`, `--page`) |
| `eigi agents get <ID>`              | Get full agent configuration                              |
| `eigi agents create [options]`      | Create a new agent                                        |
| `eigi agents update <ID> [options]` | Update agent properties                                   |
| `eigi agents delete <ID>`           | Delete an agent                                           |

<details>
<summary><strong>Example: Create a full agent</strong></summary>

```bash
eigi agents create \
  --name "Support Bot" \
  --type INBOUND \
  --stt-provider DEEPGRAM --stt-model nova-2 --stt-language en \
  --llm-provider OPENAI --llm-model gpt-4o --llm-temperature 0.7 \
  --tts-provider CARTESIA --tts-model sonic-2 --tts-language en --tts-voice-id <VOICE_ID> \
  --prompt-content "You are a helpful support agent." \
  --first-message "Hello! How can I help you today?"
```

</details>

### `eigi prompts` — Prompt Management

| Command                                           | Description                    |
| ------------------------------------------------- | ------------------------------ |
| `eigi prompts list`                               | List latest prompt versions    |
| `eigi prompts list --all-versions`                | Show all versions              |
| `eigi prompts get <NAME>`                         | Get latest version of a prompt |
| `eigi prompts get <NAME> --version 2`             | Get a specific version         |
| `eigi prompts versions <NAME>`                    | List all versions of a prompt  |
| `eigi prompts create --name <N> --content <TEXT>` | Create from inline text        |
| `eigi prompts create --name <N> --file <PATH>`    | Create from file               |
| `eigi prompts update <NAME> --file <PATH>`        | Update prompt content          |
| `eigi prompts delete <NAME>`                      | Delete a prompt                |

Prompts also accept **piped stdin**:

```bash
cat system_prompt.txt | eigi prompts create --name "v1"
```

### `eigi chat` — Chat with Agents

| Command                                              | Description                                |
| ---------------------------------------------------- | ------------------------------------------ |
| `eigi chat send --agent-id <ID> -m "Hello"`          | Send a single message (streams by default) |
| `eigi chat send --agent-id <ID> -m "Hi" --no-stream` | Get the full response at once              |
| `eigi chat interactive <AGENT_ID>`                   | Start an interactive chat session          |
| `eigi chat first-message <AGENT_ID>`                 | Get the agent's greeting                   |
| `eigi chat sessions list`                            | List chat sessions                         |
| `eigi chat sessions get <SESSION_ID>`                | Get session details                        |

### `eigi calls` — Outbound Calls

| Command                                                     | Description           |
| ----------------------------------------------------------- | --------------------- |
| `eigi calls outbound --agent-id <ID> --phone "+1234567890"` | Call a single number  |
| `eigi calls outbound --agent-id <ID> -p "+111" -p "+222"`   | Call multiple numbers |
| `eigi calls outbound --agent-id <ID> -p "+111" --test`      | Place a test call     |

### `eigi conversations` — Conversation History

| Command                                                            | Description                   |
| ------------------------------------------------------------------ | ----------------------------- |
| `eigi conversations list`                                          | List all conversations        |
| `eigi conversations list --type TELEPHONY --calling-type OUTBOUND` | Filter conversations          |
| `eigi conversations get <ID>`                                      | Get full conversation details |

### `eigi providers` / `eigi voices` — Discovery

| Command                                                                | Description                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------ |
| `eigi providers list`                                                  | List all LLM, TTS, and STT providers with models |
| `eigi voices list --provider CARTESIA`                                 | List available voices                            |
| `eigi voices list --provider ELEVENLABS --language en --gender FEMALE` | Filter voices                                    |
| `eigi mobile-numbers`                                                  | List your purchased phone numbers                |

### `eigi config` — Configuration

| Command                          | Description                |
| -------------------------------- | -------------------------- |
| `eigi config set-key <API_KEY>`  | Store your API key         |
| `eigi config set-url <BASE_URL>` | Set the backend URL        |
| `eigi config set-format json`    | Set default output format  |
| `eigi config show`               | Show current configuration |

---

## JSON Output & Scripting

Every command supports `--json` for machine-readable output, making it easy to integrate with scripts and pipelines:

```bash
# Extract agent names
eigi agents list --json | jq '.agents[].agent_name'

# Save agent config to file
eigi agents get <ID> --json > agent-backup.json

# Pipe chat messages
echo "What is your return policy?" | eigi chat send --agent-id <ID>

# Chain commands
AGENT_ID=$(eigi agents list --json | jq -r '.agents[0].id')
eigi chat interactive "$AGENT_ID"
```

---

## Environment Variables

| Variable        | Description                       | Default               |
| --------------- | --------------------------------- | --------------------- |
| `EIGI_API_KEY`  | API key (overrides stored config) | —                     |
| `EIGI_BASE_URL` | Backend URL                       | `https://api.eigi.ai` |

---

## Configuration

Config is stored at a platform-specific path (managed by [conf](https://github.com/sindresorhus/conf)):

| Platform | Path                                            |
| -------- | ----------------------------------------------- |
| macOS    | `~/Library/Preferences/eigi-nodejs/config.json` |
| Linux    | `~/.config/eigi-nodejs/config.json`             |
| Windows  | `%APPDATA%\eigi-nodejs\config.json`             |

---

## Development

```bash
npm install            # Install dependencies
npm run build          # Compile TypeScript → dist/
npm run dev -- <args>  # Run without building (uses tsx)
npm run clean          # Remove dist/
```

### Testing

```bash
# Quick build check
npm run build && npm test

# Smoke tests (requires running server + API key)
npm run test:smoke

# Against a local server
EIGI_BASE_URL=http://localhost:4000 npm run test:smoke
```

---

## Requirements

- **Node.js** >= 18
- An **eigi.ai API key** — get one at [studio.eigi.ai](https://studio.eigi.ai)

## License

[MIT](https://opensource.org/licenses/MIT) — see [LICENSE](LICENSE) for details.
