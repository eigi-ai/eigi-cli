/**
 * Calls and conversations commands.
 *
 * Maps to:
 *   POST /v1/public/calls/outbound             → eigi calls outbound
 *   GET  /v1/public/conversations              → eigi conversations list
 *   GET  /v1/public/conversations/{id}         → eigi conversations get <id>
 */

import { Command } from "commander";
import chalk from "chalk";
import * as api from "../api-client.js";
import {
  outputTable,
  outputDetail,
  outputPaginatedInfo,
  formatOrJson,
} from "../output.js";

// =============================================================================
// CALLS
// =============================================================================

export function registerCalls(program: Command): void {
  const calls = program.command("calls").description("Initiate outbound calls.");

  calls
    .command("outbound")
    .requiredOption("--agent-id <id>", "Agent ID to use for the call")
    .requiredOption(
      "-p, --phone <number...>",
      "Phone number(s) to call (repeatable)"
    )
    .option(
      "--provider <p>",
      "Telephony provider: PLIVO or TWILIO",
      "PLIVO"
    )
    .option("--test", "Mark as test call")
    .option("--json", "Output as JSON")
    .description("Initiate outbound call(s) to phone numbers.")
    .action(async (opts) => {
      const params = (opts.phone as string[]).map((p: string) => ({
        mobile_number: p,
      }));

      const data = (await api.post("/v1/public/calls/outbound", {
        agent_id: opts.agentId,
        params,
        telephony_provider: opts.provider,
        is_test_call: opts.test ?? false,
      })) as Record<string, unknown>;

      formatOrJson(data, opts.json, (d) => {
        console.log(chalk.bold.green("✓ Call initiated"));
        outputDetail(d, "Outbound Call");
      });
    });
}

// =============================================================================
// CONVERSATIONS
// =============================================================================

export function registerConversations(program: Command): void {
  const conversations = program
    .command("conversations")
    .description("List and inspect conversations (calls, chats).");

  conversations
    .command("list")
    .option("--page <n>", "Page number", "1")
    .option("--page-size <n>", "Items per page", "10")
    .option("--search <text>", "Search in metadata")
    .option(
      "--type <type>",
      "Filter: DAILY, TELEPHONY, WHATSAPP, CHAT"
    )
    .option("--calling-type <dir>", "INBOUND or OUTBOUND")
    .option("--status <status>", "Filter by conversation status")
    .option("--agent-id <id>", "Filter by agent ID")
    .option("--from-date <date>", "From date (ISO format)")
    .option("--to-date <date>", "To date (ISO format)")
    .option("--json", "Output as JSON")
    .description("List conversations with filters.")
    .action(async (opts) => {
      const data = (await api.get("/v1/public/conversations", {
        page: opts.page,
        page_size: opts.pageSize,
        search: opts.search,
        conversation_type: opts.type,
        calling_type: opts.callingType,
        conversation_status: opts.status,
        agent_id: opts.agentId,
        from_date: opts.fromDate,
        to_date: opts.toDate,
      })) as Record<string, unknown>;

      formatOrJson(data, opts.json, (d) => {
        const convs =
          (d.conversations as Record<string, unknown>[]) ??
          (d.data as Record<string, unknown>[]) ??
          [];
        if (!convs.length) {
          console.log("No conversations found.");
          return;
        }
        outputTable(
          [
            ["conversation_id", "ID"],
            ["conversation_type", "Type"],
            ["calling_type", "Direction"],
            ["conversation_status", "Status"],
            ["agent_id", "Agent"],
            ["created_at", "Created"],
          ],
          convs,
          "Conversations"
        );
        const pag = (d.pagination as Record<string, unknown>) ?? d;
        outputPaginatedInfo(pag);
      });
    });

  conversations
    .command("get")
    .argument("<conversation_id>", "Conversation ID")
    .option("--json", "Output as JSON")
    .description("Get conversation details by ID.")
    .action(async (conversationId: string, opts) => {
      const data = (await api.get(
        `/v1/public/conversations/${conversationId}`
      )) as Record<string, unknown>;
      formatOrJson(data, opts.json, (d) =>
        outputDetail(d, `Conversation: ${conversationId}`)
      );
    });
}
