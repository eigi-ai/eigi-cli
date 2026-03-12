/**
 * Configuration management for eigi CLI.
 *
 * Handles API key storage, base URL configuration, and profile management.
 * Config stored at ~/.eigi/config.json
 */

import Conf from "conf";

const config = new Conf<{
  api_key?: string;
  base_url?: string;
  output_format?: string;
}>({
  projectName: "eigi",
  schema: {
    api_key: { type: "string" },
    base_url: { type: "string" },
    output_format: { type: "string", enum: ["table", "json"], default: "table" },
  },
});

const DEFAULT_BASE_URL = "https://api.eigi.ai";
const ENV_API_KEY = "EIGI_API_KEY";
const ENV_BASE_URL = "EIGI_BASE_URL";

export function getApiKey(): string | undefined {
  return process.env[ENV_API_KEY] || config.get("api_key");
}

export function getBaseUrl(): string {
  const url = process.env[ENV_BASE_URL] || config.get("base_url") || DEFAULT_BASE_URL;
  return url.replace(/\/+$/, "");
}

export function setApiKey(apiKey: string): void {
  config.set("api_key", apiKey);
}

export function setBaseUrl(baseUrl: string): void {
  config.set("base_url", baseUrl.replace(/\/+$/, ""));
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

export { ENV_API_KEY, ENV_BASE_URL };
