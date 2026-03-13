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
import { registerWorkflow } from "./commands/workflow.js";
import {
  registerProviders,
  registerVoices,
  registerMobileNumbers,
} from "./commands/providers.js";
import { registerConfig } from "./commands/config.js";

const program = new Command();

program
  .name("eigi")
  .description("Official CLI for eigi.ai voice agents.")
  .version("1.1.0");

program.addHelpText(
  "after",
  "\nQuick start:\n" +
    "  1. eigi config set-key <YOUR_API_KEY>\n" +
    "  2. eigi workflow agent-create\n" +
    "  3. eigi prompts get <PROMPT_NAME>\n" +
    "  4. eigi agents list\n\n" +
    "Useful commands:\n" +
    "  eigi workflow list\n" +
    "  eigi providers list\n" +
    "  eigi chat interactive <AGENT_ID>\n",
);

registerAgents(program);
registerPrompts(program);
registerChat(program);
registerCalls(program);
registerConversations(program);
registerWorkflow(program);
registerProviders(program);
registerVoices(program);
registerMobileNumbers(program);
registerConfig(program);

program.parse();
