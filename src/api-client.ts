/**
 * HTTP API client for eigi.ai public API.
 *
 * Wraps fetch with auth headers, error handling, and streaming support.
 */

import { getApiKey, getBaseUrl } from "./config.js";

const TIMEOUT_MS = 120_000;

function getHeaders(): Record<string, string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(
      "Error: No API key configured. Run 'eigi config set-key <KEY>' or set EIGI_API_KEY env var."
    );
    process.exit(1);
  }
  return {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function handleError(resp: Response): Promise<never> {
  let detail: unknown;
  try {
    detail = await resp.json();
  } catch {
    detail = await resp.text();
  }
  const msg =
    typeof detail === "object" ? JSON.stringify(detail, null, 2) : detail;
  console.error(`Error ${resp.status}: ${msg}`);
  process.exit(1);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function filterParams(params?: Record<string, unknown>): string {
  if (!params) return "";
  const filtered = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null
  );
  if (filtered.length === 0) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of filtered) sp.append(k, String(v));
  return `?${sp.toString()}`;
}

export async function get(
  path: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  const url = `${getBaseUrl()}${path}${filterParams(params)}`;
  const resp = await fetchWithTimeout(url, { method: "GET", headers: getHeaders() });
  if (resp.status >= 400) await handleError(resp);
  return resp.json();
}

export async function post(
  path: string,
  data?: Record<string, unknown>
): Promise<unknown> {
  const url = `${getBaseUrl()}${path}`;
  const resp = await fetchWithTimeout(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data ?? {}),
  });
  if (resp.status >= 400) await handleError(resp);
  return resp.json();
}

export async function patch(
  path: string,
  data?: Record<string, unknown>
): Promise<unknown> {
  const url = `${getBaseUrl()}${path}`;
  const resp = await fetchWithTimeout(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(data ?? {}),
  });
  if (resp.status >= 400) await handleError(resp);
  return resp.json();
}

export async function del(path: string): Promise<unknown> {
  const url = `${getBaseUrl()}${path}`;
  const resp = await fetchWithTimeout(url, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (resp.status >= 400) await handleError(resp);
  return resp.json();
}

export async function* postStream(
  path: string,
  data?: Record<string, unknown>
): AsyncGenerator<string> {
  const url = `${getBaseUrl()}${path}`;
  const resp = await fetchWithTimeout(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data ?? {}),
  });
  if (resp.status >= 400) await handleError(resp);
  if (!resp.body) return;

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}
