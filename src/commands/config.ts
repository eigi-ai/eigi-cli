/**
 * Configuration commands.
 *
 *   eigi config set-key <KEY>       → Store API key
 *   eigi config show                → Show current config
 *   eigi config set-format <FMT>    → Set default output format
 */

import { Command } from "commander";
import process from "node:process";
import chalk from "chalk";
import * as cfg from "../config.js";

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

export function registerConfig(program: Command): void {
  const config = program
    .command("config")
    .description("Configure CLI settings — API key and output format.");

  config
    .command("set-key")
    .argument("<api_key>", "Your eigi.ai API key")
    .description("Store your eigi.ai API key.")
    .action((apiKey: string) => {
      cfg.setApiKey(apiKey);
      console.log(`✓ API key saved to ${cfg.getConfigPath()}`);
    });

  config
    .command("set-format")
    .argument("<format>", "Output format: table or json")
    .description("Set default output format (table or json).")
    .action((fmt: string) => {
      if (!["table", "json"].includes(fmt)) {
        console.error("Error: format must be 'table' or 'json'.");
        process.exit(1);
      }
      cfg.setOutputFormat(fmt);
      console.log(`✓ Default output format set to '${fmt}'`);
    });

  config
    .command("show")
    .description("Show current CLI configuration.")
    .action(() => {
      const apiKey = cfg.getApiKey();
      const outputFmt = cfg.getOutputFormat();

      console.log(`${chalk.bold("Config file:")}  ${cfg.getConfigPath()}`);
      console.log(
        `${chalk.bold("API Key:")}     ${apiKey ? maskKey(apiKey) : chalk.red("Not set")}`,
      );
      console.log(`${chalk.bold("Format:")}      ${outputFmt}`);

      if (process.env[cfg.ENV_API_KEY]) {
        console.log(
          chalk.dim(`  (API key overridden by ${cfg.ENV_API_KEY} env var)`),
        );
      }
    });
}
