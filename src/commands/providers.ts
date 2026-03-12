/**
 * Providers, voices, and mobile numbers commands.
 *
 * Maps to:
 *   GET /v1/public/providers       → eigi providers list
 *   GET /v1/public/voices          → eigi voices list
 *   GET /v1/public/mobile-numbers  → eigi mobile-numbers
 */

import { Command } from "commander";
import chalk from "chalk";
import * as api from "../api-client.js";
import { outputTable, formatOrJson } from "../output.js";

// =============================================================================
// PROVIDERS
// =============================================================================

export function registerProviders(program: Command): void {
  const providers = program
    .command("providers")
    .description("List available AI providers and models.");

  providers
    .command("list")
    .option("--json", "Output as JSON")
    .description("List all available LLM, TTS, and STT providers with models.")
    .action(async (opts) => {
      const data = (await api.get(
        "/v1/public/providers"
      )) as Record<string, unknown>;

      formatOrJson(data, opts.json, (d) => {
        for (const category of ["llm", "tts", "stt"]) {
          const providers = d[category] as
            | Record<string, unknown>
            | undefined;
          if (!providers) continue;
          console.log(
            `\n${chalk.bold.underline(`${category.toUpperCase()} Providers`)}`
          );
          for (const [providerName, models] of Object.entries(providers)) {
            const modelStr = Array.isArray(models)
              ? models.map(String).join(", ")
              : String(models);
            console.log(`  ${chalk.cyan(providerName)}: ${modelStr}`);
          }
        }
      });
    });
}

// =============================================================================
// VOICES
// =============================================================================

export function registerVoices(program: Command): void {
  const voices = program
    .command("voices")
    .description("Browse available voices for TTS.");

  voices
    .command("list")
    .requiredOption(
      "--provider <p>",
      "Voice provider: CARTESIA, ELEVENLABS, SARVAM, GOOGLE, HUME"
    )
    .option("--page <n>", "Page number", "1")
    .option("--page-size <n>", "Items per page (max 100)", "20")
    .option("--language <lang>", "Filter by language code (e.g., en, hi)")
    .option("--gender <g>", "MALE, FEMALE, or NEUTRAL")
    .option("--search <text>", "Search by voice name")
    .option("--cloned-only", "Show only cloned voices")
    .option("--model <m>", "Filter by model (e.g., bulbul:v2)")
    .option("--page-token <token>", "Cursor token for next page")
    .option(
      "--next-page-tokens <tokens>",
      "Comma-separated cursor tokens for navigation"
    )
    .option("--json", "Output as JSON")
    .description("List voices from a TTS provider with optional filters.")
    .action(async (opts) => {
      const data = (await api.get("/v1/public/voices", {
        provider: opts.provider,
        page: opts.page,
        page_size: opts.pageSize,
        language: opts.language,
        gender: opts.gender,
        search: opts.search,
        show_cloned_only: opts.clonedOnly ?? false,
        model: opts.model,
        page_token: opts.pageToken,
        next_page_tokens: opts.nextPageTokens,
      })) as Record<string, unknown>;

      formatOrJson(data, opts.json, (d) => {
        const voices = (d.voices as Record<string, unknown>[]) ?? [];
        if (!voices.length) {
          console.log("No voices found.");
          return;
        }
        outputTable(
          [
            ["voice_id", "Voice ID"],
            ["name", "Name"],
            ["gender", "Gender"],
            ["language", "Language"],
            ["provider", "Provider"],
          ],
          voices,
          `Voices — ${opts.provider}`
        );
        const hasMore = d.has_more as boolean | undefined;
        const total = d.total_count ?? "?";
        console.log(
          chalk.dim(
            `\nPage ${opts.page} • ${total} total • ${hasMore ? "More available" : "Last page"}`
          )
        );
      });
    });
}

// =============================================================================
// MOBILE NUMBERS
// =============================================================================

export function registerMobileNumbers(program: Command): void {
  program
    .command("mobile-numbers")
    .option("--json", "Output as JSON")
    .description("Get your purchased mobile numbers.")
    .action(async (opts) => {
      const data = (await api.get(
        "/v1/public/mobile-numbers"
      )) as Record<string, unknown>;

      formatOrJson(data, opts.json, (d) => {
        const numbers = (d.purchased_mobile_numbers as unknown[]) ?? [];
        if (!numbers.length) {
          console.log("No mobile numbers found.");
          return;
        }
        const rows = (
          typeof numbers[0] === "object"
            ? numbers
            : numbers.map((n) => ({ phone_number: n }))
        ) as Record<string, unknown>[];

        outputTable(
          [
            ["phone_number", "Phone Number"],
            ["telephony_provider", "Provider"],
            ["status", "Status"],
          ],
          rows,
          "Mobile Numbers"
        );
      });
    });
}
