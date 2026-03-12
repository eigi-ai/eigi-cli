/**
 * Prompt management commands.
 *
 * Maps to:
 *   POST   /v1/public/prompts                    → eigi prompts create
 *   GET    /v1/public/prompts                    → eigi prompts list
 *   GET    /v1/public/prompts/{name}             → eigi prompts get <name>
 *   PATCH  /v1/public/prompts/{name}             → eigi prompts update <name>
 *   DELETE /v1/public/prompts/{name}             → eigi prompts delete <name>
 *   GET    /v1/public/prompts/{name}/versions    → eigi prompts versions <name>
 */

import { Command } from "commander";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import * as api from "../api-client.js";
import {
  outputTable,
  outputDetail,
  outputPaginatedInfo,
  formatOrJson,
} from "../output.js";
import chalk from "chalk";

function readStdinSync(): string | null {
  if (process.stdin.isTTY) return null;
  const chunks: Buffer[] = [];
  const buf = Buffer.alloc(1024);
  let n: number;
  try {
    const fd = require("node:fs").openSync("/dev/stdin", "rs");
    while ((n = require("node:fs").readSync(fd, buf, 0, buf.length, null)) > 0)
      chunks.push(buf.subarray(0, n));
    require("node:fs").closeSync(fd);
  } catch {
    return null;
  }
  return Buffer.concat(chunks).toString("utf-8").trim() || null;
}

export function registerPrompts(program: Command): void {
  const prompts = program
    .command("prompts")
    .description("Manage prompts — create, version, list, update, delete.");

  prompts
    .command("list")
    .option("--page <n>", "Page number", "1")
    .option("--page-size <n>", "Items per page (max 100)", "10")
    .option("--search <text>", "Search in prompt name/content")
    .option("--all-versions", "Show all versions, not just latest")
    .option("--json", "Output as JSON")
    .description("List all prompts with pagination.")
    .action(async (opts) => {
      const data = (await api.get("/v1/public/prompts", {
        page: opts.page,
        page_size: opts.pageSize,
        search: opts.search,
        latest_only: opts.allVersions ? false : true,
      })) as Record<string, unknown>;

      formatOrJson(data, opts.json, (d) => {
        const prompts = (d.prompts as Record<string, unknown>[]) ?? [];
        if (!prompts.length) {
          console.log("No prompts found.");
          return;
        }
        outputTable(
          [
            ["prompt_name", "Name"],
            ["prompt_version", "Version"],
            ["prompt_type", "Type"],
            ["created_at", "Created"],
            ["updated_at", "Updated"],
          ],
          prompts,
          "Prompts"
        );
        const total = (d.count as number) ?? d.total ?? "?";
        const skip = (d.skip as number) ?? 0;
        const limit = (d.limit as number) ?? 10;
        const page = limit > 0 ? Math.floor(skip / limit) + 1 : 1;
        const totalPages = limit > 0 && typeof total === "number" ? Math.ceil(total / limit) : "?";
        outputPaginatedInfo({ total, page, total_pages: totalPages });
      });
    });

  prompts
    .command("get")
    .argument("<prompt_name>", "Prompt name")
    .option("--version <v>", "Specific version (default: latest)")
    .option("--json", "Output as JSON")
    .description("Get a specific prompt by name.")
    .action(async (promptName: string, opts) => {
      const params: Record<string, unknown> = {};
      if (opts.version != null) params.version = opts.version;

      const data = (await api.get(
        `/v1/public/prompts/${promptName}`,
        params
      )) as Record<string, unknown>;
      formatOrJson(data, opts.json, (d) =>
        outputDetail(d, `Prompt: ${promptName}`)
      );
    });

  prompts
    .command("create")
    .requiredOption("--name <name>", "Prompt name (1-100 chars)")
    .option("--content <text>", "Prompt text content")
    .option("--file <path>", "Read prompt content from file")
    .option("--type <type>", "Prompt type: main or analysis", "main")
    .option("--json", "Output as JSON")
    .description("Create a new prompt. If name exists, creates a new version.")
    .action(async (opts) => {
      let content: string | undefined = opts.content;
      if (opts.file) {
        content = readFileSync(opts.file, "utf-8");
      } else if (!content) {
        const stdin = readStdinSync();
        if (stdin) {
          content = stdin;
        } else {
          console.error(
            "Error: Provide --content, --file, or pipe content via stdin."
          );
          process.exit(1);
        }
      }

      const data = (await api.post("/v1/public/prompts", {
        prompt_name: opts.name,
        prompt_content: content,
        prompt_metadata: { prompt_type: opts.type },
      })) as Record<string, unknown>;

      formatOrJson(data, opts.json, (d) => {
        console.log(
          `✓ Prompt created: ${d.prompt_name} v${d.prompt_version ?? "?"}`
        );
      });
    });

  prompts
    .command("update")
    .argument("<prompt_name>", "Prompt name")
    .option("--content <text>", "New prompt content")
    .option("--file <path>", "Read new content from file")
    .option("--type <type>", "Prompt type: main or analysis")
    .option("--json", "Output as JSON")
    .description("Update a prompt (creates a new version).")
    .action(async (promptName: string, opts) => {
      let content: string | undefined = opts.content;
      if (opts.file) {
        content = readFileSync(opts.file, "utf-8");
      } else if (!content) {
        const stdin = readStdinSync();
        if (stdin) {
          content = stdin;
        } else {
          console.error(
            "Error: Provide --content, --file, or pipe content via stdin."
          );
          process.exit(1);
        }
      }

      const body: Record<string, unknown> = { prompt_content: content };
      if (opts.type) body.prompt_metadata = { prompt_type: opts.type };

      const data = (await api.patch(
        `/v1/public/prompts/${promptName}`,
        body
      )) as Record<string, unknown>;

      formatOrJson(data, opts.json, (d) => {
        console.log(
          `✓ Prompt updated: ${d.prompt_name} → v${d.prompt_version ?? "?"}`
        );
      });
    });

  prompts
    .command("delete")
    .argument("<prompt_name>", "Prompt name")
    .option("-y, --yes", "Skip confirmation")
    .option("--json", "Output as JSON")
    .description("Delete all versions of a prompt.")
    .action(async (promptName: string, opts) => {
      if (!opts.yes) {
        const rl = createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        const answer = await new Promise<string>((res) =>
          rl.question(
            `Delete all versions of prompt '${promptName}'? (y/N): `,
            res
          )
        );
        rl.close();
        if (answer.toLowerCase() !== "y") {
          console.log("Aborted.");
          return;
        }
      }

      const data = (await api.del(
        `/v1/public/prompts/${promptName}`
      )) as Record<string, unknown>;
      formatOrJson(data, opts.json, (d) => {
        console.log(
          `✓ Prompt deleted: ${promptName} (${d.versions_deleted ?? "?"} versions)`
        );
      });
    });

  prompts
    .command("versions")
    .argument("<prompt_name>", "Prompt name")
    .option("--json", "Output as JSON")
    .description("List all versions of a prompt.")
    .action(async (promptName: string, opts) => {
      const data = (await api.get(
        `/v1/public/prompts/${promptName}/versions`
      )) as Record<string, unknown>;

      formatOrJson(data, opts.json, (d) => {
        const versions = (d.versions as Record<string, unknown>[]) ?? [];
        if (!versions.length) {
          console.log(`No versions found for '${promptName}'.`);
          return;
        }
        console.log(
          `\n${chalk.bold("Prompt:")} ${d.prompt_name ?? promptName}`
        );
        outputTable(
          [
            ["prompt_version", "Version"],
            ["prompt_content", "Content (preview)"],
            ["created_at", "Created"],
          ],
          versions.map((v) => {
            const content = String(v.prompt_content ?? "");
            return {
              ...v,
              prompt_content:
                content.length > 80 ? content.slice(0, 80) + "..." : content,
            };
          }),
          `Versions (${d.total ?? versions.length})`
        );
      });
    });
}
