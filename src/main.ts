#!/usr/bin/env node

/**
 * eigi CLI — Command-line interface for eigi.ai AI agent platform.
 *
 * Usage:
 *   eigi agents list
 *   eigi agents create --name "Bot" --type INBOUND ...
 *   eigi chat interactive <agent_id>
 *   eigi prompts create --name "v1" --file prompt.txt
 *   eigi calls outbound --agent-id abc --phone "+1234567890"
 *   eigi config set-key <API_KEY>
 */

import { Command } from "commander";
import { registerAgents } from "./commands/agents.js";
import { registerPrompts } from "./commands/prompts.js";
import { registerChat } from "./commands/chat.js";
import { registerCalls, registerConversations } from "./commands/calls.js";
import {
  registerProviders,
  registerVoices,
  registerMobileNumbers,
} from "./commands/providers.js";
import { registerConfig } from "./commands/config.js";

const program = new Command();

program
  .name("eigi")
  .description(
    "Manage AI agents, prompts, calls, and chat from your terminal.\n\n" +
      "Get started:\n" +
      "  1. eigi config set-key <YOUR_API_KEY>\n" +
      "  2. eigi agents list\n" +
      "  3. eigi chat interactive <AGENT_ID>\n\n" +
      "Environment variables:\n" +
      "  EIGI_API_KEY    — API key (overrides config file)\n" +
      "  EIGI_BASE_URL   — Base URL (default: https://api.eigi.ai)",
  )
  .version("1.1.0");

registerAgents(program);
registerPrompts(program);
registerChat(program);
registerCalls(program);
registerConversations(program);
registerProviders(program);
registerVoices(program);
registerMobileNumbers(program);
registerConfig(program);

program.parse();
