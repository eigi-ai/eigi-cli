/**
 * Chat commands.
 *
 * Maps to:
 *   POST /v1/public/chat                              → eigi chat send
 *   GET  /v1/public/agents/{id}/first-message          → eigi chat first-message <id>
 *   GET  /v1/public/chat/sessions                      → eigi chat sessions list
 *   GET  /v1/public/chat/sessions/{id}                 → eigi chat sessions get <id>
 *   (interactive)                                      → eigi chat interactive <agent_id>
 */

import { Command } from "commander";
import { createInterface } from "node:readline";
import * as api from "../api-client.js";
import chalk from "chalk";
import {
  outputJson,
  outputTable,
  outputDetail,
  outputPaginatedInfo,
  formatOrJson,
} from "../output.js";

export function registerChat(program: Command): void {
  const chat = program
    .command("chat")
    .description("Chat with AI agents and manage chat sessions.");

  chat
    .command("send")
    .requiredOption("--agent-id <id>", "Agent ID to chat with")
    .option("-m, --message <text>", "Message to send")
    .option("--session-id <id>", "Existing session ID (auto-created if omitted)")
    .option("--no-stream", "Disable streaming (get full response)")
    .option("--json", "Output as JSON (implies --no-stream)")
    .description("Send a message to an AI agent.")
    .action(async (opts) => {
      let message: string = opts.message;
      if (!message) {
        if (!process.stdin.isTTY) {
          const chunks: string[] = [];
          for await (const chunk of process.stdin) chunks.push(chunk);
          message = chunks.join("").trim();
        } else {
          console.error(
            "Error: Provide --message or pipe input via stdin."
          );
          process.exit(1);
        }
      }

      const useStream = opts.stream !== false && !opts.json;
      const body: Record<string, unknown> = {
        agent_id: opts.agentId,
        message,
        streaming: useStream,
      };
      if (opts.sessionId) body.session_id = opts.sessionId;

      if (useStream) {
        for await (const chunk of api.postStream("/v1/public/chat", body)) {
          process.stdout.write(chunk);
        }
        console.log();
      } else {
        const data = (await api.post(
          "/v1/public/chat",
          body
        )) as Record<string, unknown>;
        if (opts.json) {
          outputJson(data);
        } else {
          console.log(
            `\n${chalk.bold.cyan("Agent:")} ${data.message ?? data.response ?? ""}`
          );
          console.log(chalk.dim(`Session: ${data.session_id ?? "?"}`));
        }
      }
    });

  chat
    .command("interactive")
    .argument("<agent_id>", "Agent ID")
    .option("--session-id <id>", "Resume existing session")
    .description(
      "Start an interactive chat session. Type 'exit' or Ctrl+C to quit."
    )
    .action(async (agentId: string, opts) => {
      console.log(
        chalk.bold.green(`Starting chat with agent ${agentId}`)
      );
      console.log(chalk.dim("Type 'exit' or press Ctrl+C to quit.\n"));

      let sessionId: string | undefined = opts.sessionId;

      // Get first message if no session
      if (!sessionId) {
        try {
          const first = (await api.get(
            `/v1/public/agents/${agentId}/first-message`
          )) as Record<string, unknown>;
          sessionId = first.session_id as string | undefined;
          const greeting = (first.message ?? first.first_message ?? "") as string;
          if (greeting) {
            console.log(`${chalk.bold.cyan("Agent:")} ${greeting}\n`);
          }
        } catch {
          // first-message may not be configured
        }
      }

      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const ask = (): void => {
        rl.question("You: ", async (userInput) => {
          if (!userInput) {
            ask();
            return;
          }
          const trimmed = userInput.trim().toLowerCase();
          if (["exit", "quit", "q"].includes(trimmed)) {
            console.log("Goodbye!");
            rl.close();
            return;
          }

          const body: Record<string, unknown> = {
            agent_id: agentId,
            message: userInput,
            streaming: true,
          };
          if (sessionId) body.session_id = sessionId;

          process.stdout.write("Agent: ");
          for await (const chunk of api.postStream(
            "/v1/public/chat",
            body
          )) {
            process.stdout.write(chunk);
          }
          console.log("\n");
          ask();
        });
      };

      rl.on("close", () => {
        console.log("\nGoodbye!");
        process.exit(0);
      });

      ask();
    });

  chat
    .command("first-message")
    .argument("<agent_id>", "Agent ID")
    .option("--json", "Output as JSON")
    .description("Get agent's greeting message for chat initialization.")
    .action(async (agentId: string, opts) => {
      const data = (await api.get(
        `/v1/public/agents/${agentId}/first-message`
      )) as Record<string, unknown>;
      formatOrJson(data, opts.json, (d) => {
        console.log(
          `${chalk.bold.cyan("Greeting:")} ${d.message ?? d.first_message ?? ""}`
        );
        console.log(chalk.dim(`Session: ${d.session_id ?? "?"}`));
      });
    });

  // --- Sessions subgroup ---
  const sessions = chat.command("sessions").description("Manage chat sessions.");

  sessions
    .command("list")
    .option("--page <n>", "Page number", "1")
    .option("--page-size <n>", "Items per page", "10")
    .option("--agent-id <id>", "Filter by agent ID")
    .option("--json", "Output as JSON")
    .description("List chat sessions.")
    .action(async (opts) => {
      const data = (await api.get("/v1/public/chat/sessions", {
        page: opts.page,
        page_size: opts.pageSize,
        agent_id: opts.agentId,
      })) as Record<string, unknown>;

      formatOrJson(data, opts.json, (d) => {
        const sessions =
          (d.sessions as Record<string, unknown>[]) ??
          (d.chat_sessions as Record<string, unknown>[]) ??
          [];
        if (!sessions.length) {
          console.log("No chat sessions found.");
          return;
        }
        outputTable(
          [
            ["session_id", "Session ID"],
            ["agent_id", "Agent ID"],
            ["message_count", "Messages"],
            ["created_at", "Created"],
            ["updated_at", "Last Activity"],
          ],
          sessions,
          "Chat Sessions"
        );
        outputPaginatedInfo(d);
      });
    });

  sessions
    .command("get")
    .argument("<session_id>", "Session ID")
    .option("--json", "Output as JSON")
    .description("Get chat session details with messages.")
    .action(async (sessionId: string, opts) => {
      const data = (await api.get(
        `/v1/public/chat/sessions/${sessionId}`
      )) as Record<string, unknown>;
      formatOrJson(data, opts.json, (d) =>
        outputDetail(d, `Session: ${sessionId}`)
      );
    });
}
