/**
 * Agent management commands.
 *
 * Maps to:
 *   POST   /v1/public/agents          → eigi agents create
 *   GET    /v1/public/agents           → eigi agents list
 *   GET    /v1/public/agents/{id}      → eigi agents get <id>
 *   PATCH  /v1/public/agents/{id}      → eigi agents update <id>
 *   DELETE /v1/public/agents/{id}      → eigi agents delete <id>
 */

import { Command } from "commander";
import { readFileSync } from "node:fs";
import * as api from "../api-client.js";
import {
  outputTable,
  outputDetail,
  outputPaginatedInfo,
  formatOrJson,
} from "../output.js";
import { createInterface } from "node:readline";

export function registerAgents(program: Command): void {
  const agents = program.command("agents").description("Manage AI agents — create, list, update, delete.");

  agents
    .command("list")
    .option("--page <n>", "Page number", "1")
    .option("--page-size <n>", "Items per page (max 100)", "10")
    .option("--search <text>", "Search in agent name/description")
    .option("--type <type>", "Filter: INBOUND or OUTBOUND")
    .option("--category <cat>", "Filter by category")
    .option("--json", "Output as JSON")
    .description("List all agents with pagination and filtering.")
    .action(async (opts) => {
      const data = (await api.get("/v1/public/agents", {
        page: opts.page,
        page_size: opts.pageSize,
        search: opts.search,
        agent_type: opts.type,
        agent_category: opts.category,
      })) as Record<string, unknown>;

      formatOrJson(data, opts.json, (d) => {
        const agents = (d.agents as Record<string, unknown>[]) ?? [];
        if (!agents.length) {
          console.log("No agents found.");
          return;
        }
        outputTable(
          [
            ["id", "ID"],
            ["agent_name", "Name"],
            ["agent_type", "Type"],
            ["agent_category", "Category"],
            ["created_at", "Created"],
          ],
          agents,
          "Agents"
        );
        outputPaginatedInfo(d);
      });
    });

  agents
    .command("get")
    .argument("<agent_id>", "Agent ID")
    .option("--json", "Output as JSON")
    .description("Get detailed agent configuration by ID.")
    .action(async (agentId: string, opts) => {
      const data = (await api.get(
        `/v1/public/agents/${agentId}`
      )) as Record<string, unknown>;
      formatOrJson(data, opts.json, (d) =>
        outputDetail(d, `Agent: ${d.agent_name ?? agentId}`)
      );
    });

  agents
    .command("create")
    .requiredOption("--name <name>", "Agent name (1-100 chars)")
    .requiredOption("--type <type>", "Agent type: INBOUND or OUTBOUND")
    .option("--description <text>", "Agent description")
    .option("--category <cat>", "Agent category")
    .requiredOption("--stt-provider <p>", "STT provider: DEEPGRAM or WHISPER")
    .requiredOption("--stt-model <m>", "STT model name")
    .requiredOption("--stt-language <lang>", "STT language code (e.g., en, hi)")
    .requiredOption("--llm-provider <p>", "LLM provider: OPENAI, ANTHROPIC, GOOGLE, GROK")
    .requiredOption("--llm-model <m>", "LLM model name (e.g., gpt-4o)")
    .option("--llm-temperature <t>", "LLM temperature (0.0-2.0)")
    .requiredOption("--tts-provider <p>", "TTS provider: CARTESIA, ELEVENLABS, SARVAM, GOOGLE, HUME")
    .requiredOption("--tts-model <m>", "TTS model name")
    .requiredOption("--tts-language <lang>", "TTS language code")
    .requiredOption("--tts-voice-id <id>", "Voice ID for TTS")
    .option("--tts-speed <s>", "TTS speed")
    .option("--prompt-content <text>", "Inline prompt/system message")
    .option("--prompt-file <path>", "Read prompt from file")
    .option("--prompt-name <name>", "Reference existing prompt by name")
    .option("--prompt-version <v>", "Prompt version (with --prompt-name)")
    .option("--first-message <msg>", "Agent's greeting message")
    .option("--json", "Output as JSON")
    .description("Create a new AI agent with full configuration.")
    .action(async (opts) => {
      const body: Record<string, unknown> = {
        agent_name: opts.name,
        agent_type: opts.type,
        stt: {
          provider_name: opts.sttProvider,
          model_name: opts.sttModel,
          language: opts.sttLanguage,
        },
        llm: {
          provider_name: opts.llmProvider,
          model_name: opts.llmModel,
          params: {} as Record<string, unknown>,
        },
        tts: {
          provider_name: opts.ttsProvider,
          model_name: opts.ttsModel,
          language: opts.ttsLanguage,
          voice_id: opts.ttsVoiceId,
          params: {} as Record<string, unknown>,
        },
      };

      if (opts.description) body.agent_description = opts.description;
      if (opts.category) body.agent_category = opts.category;
      if (opts.llmTemperature != null)
        (body.llm as Record<string, unknown>).params = {
          temperature: parseFloat(opts.llmTemperature),
        };
      if (opts.ttsSpeed != null)
        (body.tts as Record<string, unknown>).params = {
          speed: parseFloat(opts.ttsSpeed),
        };
      if (opts.firstMessage) body.first_message_prompt = opts.firstMessage;

      if (opts.promptFile) {
        body.prompt_content = readFileSync(opts.promptFile, "utf-8");
      } else if (opts.promptContent) {
        body.prompt_content = opts.promptContent;
      } else if (opts.promptName) {
        const prompt: Record<string, unknown> = { prompt_name: opts.promptName };
        if (opts.promptVersion) prompt.prompt_version = parseInt(opts.promptVersion);
        body.prompt = prompt;
      }

      const data = (await api.post(
        "/v1/public/agents",
        body
      )) as Record<string, unknown>;
      formatOrJson(data, opts.json, (d) => {
        console.log(
          `✓ Agent created: ${d.agent_name} (ID: ${d.id ?? d.agent_id ?? "?"})`
        );
      });
    });

  agents
    .command("update")
    .argument("<agent_id>", "Agent ID")
    .option("--name <name>", "New agent name")
    .option("--type <type>", "INBOUND or OUTBOUND")
    .option("--description <text>", "New description")
    .option("--category <cat>", "New category")
    .option("--llm-provider <p>", "OPENAI, ANTHROPIC, GOOGLE, GROK")
    .option("--llm-model <m>", "New LLM model name")
    .option("--llm-temperature <t>", "New LLM temperature")
    .option("--tts-voice-id <id>", "New voice ID")
    .option("--prompt-content <text>", "New prompt content (creates new version)")
    .option("--prompt-file <path>", "Read new prompt from file")
    .option("--first-message <msg>", "New greeting message")
    .option("--json", "Output as JSON")
    .description("Update an existing agent. Only provided fields are changed.")
    .action(async (agentId: string, opts) => {
      const body: Record<string, unknown> = {};
      if (opts.name) body.agent_name = opts.name;
      if (opts.type) body.agent_type = opts.type;
      if (opts.description) body.agent_description = opts.description;
      if (opts.category) body.agent_category = opts.category;
      if (opts.firstMessage) body.first_message_prompt = opts.firstMessage;

      if (opts.llmProvider || opts.llmModel || opts.llmTemperature != null) {
        const llm: Record<string, unknown> = {};
        if (opts.llmProvider) llm.provider_name = opts.llmProvider;
        if (opts.llmModel) llm.model_name = opts.llmModel;
        if (opts.llmTemperature != null)
          llm.params = { temperature: parseFloat(opts.llmTemperature) };
        body.llm = llm;
      }

      if (opts.ttsVoiceId) body.tts = { voice_id: opts.ttsVoiceId };

      if (opts.promptFile) {
        body.prompt_content = readFileSync(opts.promptFile, "utf-8");
      } else if (opts.promptContent) {
        body.prompt_content = opts.promptContent;
      }

      if (Object.keys(body).length === 0) {
        console.error("No update fields provided. Use --help to see options.");
        process.exit(1);
      }

      const data = (await api.patch(
        `/v1/public/agents/${agentId}`,
        body
      )) as Record<string, unknown>;
      formatOrJson(data, opts.json, (d) => {
        console.log(`✓ Agent updated: ${d.agent_name ?? agentId}`);
      });
    });

  agents
    .command("delete")
    .argument("<agent_id>", "Agent ID")
    .option("-y, --yes", "Skip confirmation")
    .option("--json", "Output as JSON")
    .description("Permanently delete an agent.")
    .action(async (agentId: string, opts) => {
      if (!opts.yes) {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise<string>((resolve) =>
          rl.question(
            `Delete agent ${agentId}? This cannot be undone (y/N): `,
            resolve
          )
        );
        rl.close();
        if (answer.toLowerCase() !== "y") {
          console.log("Aborted.");
          return;
        }
      }

      const data = (await api.del(
        `/v1/public/agents/${agentId}`
      )) as Record<string, unknown>;
      formatOrJson(data, opts.json, (d) => {
        console.log(`✓ Agent deleted: ${d.agent_name ?? agentId}`);
      });
    });
}
