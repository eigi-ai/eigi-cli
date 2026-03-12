# eigi CLI

Command-line interface for the [eigi.ai](https://eigi.ai) AI agent platform. Manage agents, prompts, calls, and chat — all from your terminal.

## Install

```bash
npm install -g @eigiai/cli
```

Or use directly with npx:

```bash
npx @eigiai/cli agents list
```

### From source

```bash
git clone https://github.com/cliniq360/eigi-cli.git
cd eigi-cli
npm install
npm run build
npm link   # makes 'eigi' available globally
```

## Quick Start

```bash
# 1. Configure your API key (get it from https://studio.eigi.ai)
eigi config set-key vk_your_api_key_here

# 2. Point to your backend (optional — defaults to https://api.eigi.ai)
eigi config set-url http://localhost:4000    # local dev
eigi config set-url https://dev-api.eigi.ai  # QA

# 3. Start using it
eigi agents list
eigi chat interactive <AGENT_ID>
```

## Commands

### Agents

```bash
eigi agents list                             # List all agents
eigi agents list --type INBOUND --search "support"
eigi agents get <AGENT_ID>                   # Get agent details
eigi agents create \                         # Create an agent
  --name "Support Bot" \
  --type INBOUND \
  --stt-provider DEEPGRAM --stt-model nova-2 --stt-language en \
  --llm-provider OPENAI --llm-model gpt-4o --llm-temperature 0.7 \
  --tts-provider CARTESIA --tts-model sonic-2 --tts-language en --tts-voice-id <VOICE_ID> \
  --prompt-content "You are a helpful support agent." \
  --first-message "Hello! How can I help you today?"
eigi agents update <AGENT_ID> --name "New Name" --llm-model gpt-4o-mini
eigi agents delete <AGENT_ID>
```

### Prompts

```bash
eigi prompts list                            # List latest prompts
eigi prompts list --all-versions             # Show all versions
eigi prompts get <NAME>                      # Get latest version
eigi prompts get <NAME> --version 2          # Get specific version
eigi prompts versions <NAME>                 # List all versions
eigi prompts create --name "sales-v1" --content "You are a sales agent..."
eigi prompts create --name "support" --file prompt.txt
cat prompt.txt | eigi prompts create --name "piped"
eigi prompts update <NAME> --file updated.txt
eigi prompts delete <NAME>
```

### Chat

```bash
eigi chat send --agent-id <ID> --message "Hello"            # Single message
eigi chat send --agent-id <ID> -m "Hello" --no-stream       # Non-streaming
eigi chat interactive <AGENT_ID>                             # Interactive session
eigi chat first-message <AGENT_ID>                           # Get greeting
eigi chat sessions list                                      # List sessions
eigi chat sessions list --agent-id <ID>                      # Filter by agent
eigi chat sessions get <SESSION_ID>                          # Session details
```

### Calls

```bash
eigi calls outbound --agent-id <ID> --phone "+1234567890"
eigi calls outbound --agent-id <ID> -p "+111" -p "+222"     # Multiple numbers
eigi calls outbound --agent-id <ID> --phone "+111" --test   # Test call
```

### Conversations

```bash
eigi conversations list                      # List all conversations
eigi conversations list --type TELEPHONY --calling-type OUTBOUND
eigi conversations get <CONVERSATION_ID>     # Get full details
```

### Providers & Voices

```bash
eigi providers list                          # List LLM/TTS/STT providers + models
eigi voices list --provider CARTESIA         # List Cartesia voices
eigi voices list --provider ELEVENLABS --language en --gender FEMALE --search "aria"
eigi mobile-numbers                          # List your phone numbers
```

### Configuration

```bash
eigi config set-key <API_KEY>                # Store API key
eigi config set-url <BASE_URL>              # Set backend URL
eigi config set-format json                  # Default output as JSON
eigi config show                             # Show current config
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `EIGI_API_KEY` | API key (overrides config file) | — |
| `EIGI_BASE_URL` | Backend URL | `https://api.eigi.ai` |

## JSON Output

Every command supports `--json` for machine-readable output:

```bash
eigi agents list --json | jq '.agents[].agent_name'
eigi agents get <ID> --json > agent.json
```

## Piping

```bash
# Create prompt from file
cat system_prompt.txt | eigi prompts create --name "v1"

# Pipe chat
echo "What is your return policy?" | eigi chat send --agent-id <ID>

# Chain commands
AGENT_ID=$(eigi agents list --json | jq -r '.agents[0].id')
eigi chat interactive $AGENT_ID
```

## Testing

### Quick check

```bash
npm run build
npm test          # Prints --help to verify build works
```

### Smoke tests (requires running server + API key)

```bash
# Against local dev server
EIGI_BASE_URL=http://localhost:4000 npm run test:smoke

# Against production
npm run test:smoke
```

The smoke test (`scripts/smoke-test.sh`) runs through:
1. **CLI basics** — help, version, all subcommand help pages
2. **API reads** — providers, agents, prompts, conversations, voices, mobile-numbers
3. **CRUD lifecycle** — creates an agent, updates it, chats, then deletes; same for prompts

### Manual testing

```bash
# Build and run directly
npm run build
node dist/main.js config show
node dist/main.js agents list --json

# Or use dev mode (no build step needed)
npm run dev -- agents list
```

## Development

```bash
npm install         # Install dependencies
npm run build       # Compile TypeScript → dist/
npm run dev -- <args>  # Run without building (uses tsx)
npm run clean       # Remove dist/
```

## Publishing

```bash
# First time: login to npm
npm login

# Publish (runs clean + build automatically via prepublishOnly)
npm publish --access public
```

## Config File

Stored at platform-specific config path (managed by [conf](https://github.com/sindresorhus/conf)):

- **macOS:** `~/Library/Preferences/eigi-nodejs/config.json`
- **Linux:** `~/.config/eigi-nodejs/config.json`
- **Windows:** `%APPDATA%/eigi-nodejs/config.json`
