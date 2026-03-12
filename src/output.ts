/**
 * Output formatting utilities for the eigi CLI.
 *
 * Supports table (chalk + cli-table3) and JSON output modes.
 */

import chalk from "chalk";
import Table from "cli-table3";

type ColumnDef = [key: string, label: string];

export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function outputTable(
  columns: ColumnDef[],
  rows: Record<string, unknown>[],
  title?: string
): void {
  if (title) console.log(chalk.bold(`\n${title}`));

  const table = new Table({
    head: columns.map(([, label]) => chalk.cyan(label)),
    style: { head: [], border: [] },
    wordWrap: true,
  });

  for (const row of rows) {
    table.push(columns.map(([key]) => String(row[key] ?? "")));
  }

  console.log(table.toString());
}

export function outputDetail(
  data: Record<string, unknown>,
  title?: string
): void {
  if (title) console.log(chalk.bold.blue(`\n─── ${title} ───`));

  for (const [k, v] of Object.entries(data)) {
    const val =
      typeof v === "object" && v !== null
        ? JSON.stringify(v, null, 2)
        : String(v ?? "");
    console.log(`${chalk.bold.cyan(k)}: ${val}`);
  }
  console.log();
}

export function outputPaginatedInfo(data: Record<string, unknown>): void {
  const total = data.total ?? data.total_count ?? "?";
  const page = data.page ?? "?";
  const totalPages = data.total_pages ?? "?";
  console.log(chalk.dim(`\nPage ${page}/${totalPages} • ${total} total items`));
}

export function formatOrJson(
  data: unknown,
  asJson: boolean,
  formatter: (d: Record<string, unknown>) => void
): void {
  if (asJson) {
    outputJson(data);
  } else {
    formatter(data as Record<string, unknown>);
  }
}
