/**
 * Configuration management for eigi CLI.
 *
 * Handles API key storage and output preferences.
 * Config stored at ~/.eigi/config.json
 */

import Conf from "conf";

const config = new Conf<{
  api_key?: string;
  output_format?: string;
}>({
  projectName: "eigi",
  schema: {
    api_key: { type: "string" },
    output_format: {
      type: "string",
      enum: ["table", "json"],
      default: "table",
    },
  },
});

const DEFAULT_BASE_URL = "https://api.eigi.ai";
const ENV_API_KEY = "EIGI_API_KEY";

export function getApiKey(): string | undefined {
  return process.env[ENV_API_KEY] || config.get("api_key");
}

export function getBaseUrl(): string {
  return DEFAULT_BASE_URL;
}

export function setApiKey(apiKey: string): void {
  config.set("api_key", apiKey);
}

export function getOutputFormat(): string {
  return config.get("output_format") || "table";
}

export function setOutputFormat(fmt: string): void {
  config.set("output_format", fmt);
}

export function getConfigPath(): string {
  return config.path;
}

export { ENV_API_KEY };
