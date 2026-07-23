import type { EnvironmentInfo } from '../auth/environment.js';
import { formatEnvironmentBadge } from '../auth/environment.js';
import chalk from 'chalk';

let quiet = false;
let verbose = false;

export function setOutputMode(options: { quiet?: boolean; verbose?: boolean }): void {
  quiet = Boolean(options.quiet);
  verbose = Boolean(options.verbose);
}

export function isQuiet(): boolean {
  return quiet;
}

export function isVerbose(): boolean {
  return verbose;
}

export function success(message: string): void {
  if (quiet) return;
  console.error(chalk.green('ok') + chalk.dim(' · ') + message);
}

export function warn(message: string): void {
  if (quiet) return;
  console.error(chalk.yellow('warn') + chalk.dim(' · ') + message);
}

export function fail(message: string): void {
  console.error(chalk.red('error') + chalk.dim(' · ') + message);
}

export function info(message: string): void {
  if (quiet) return;
  console.error(chalk.dim(message));
}

export function note(message: string): void {
  if (quiet || !verbose) return;
  console.error(chalk.dim('note · ') + message);
}

export function link(url: string): void {
  if (quiet) return;
  console.error(chalk.blue(url));
}

export type OutputFormat = 'table' | 'json';

export function resolveFormat(value?: string): OutputFormat {
  if (value === 'json') return 'json';
  return 'table';
}

export function printOutput<T>(
  data: T[] | T,
  format: OutputFormat,
  columns?: Array<{ key: string; header: string; render?: (row: Record<string, unknown>) => string }>,
): void {
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }

  const rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) {
    if (!quiet) warn('Nenhum registro encontrado.');
    return;
  }

  if (!columns) {
    printSimpleTable(
      Object.keys(rows[0] as object),
      rows.map((row) => Object.values(row as object).map(String)),
    );
    return;
  }

  const headers = columns.map((c) => c.header);
  const tableRows = rows.map((row) => {
    const record = row as Record<string, unknown>;
    return columns.map((col) => {
      if (col.render) return col.render(record);
      const value = record[col.key];
      return value == null ? '' : String(value);
    });
  });

  printSimpleTable(headers, tableRows);

  if (!quiet && verbose) {
    info(`${rows.length} registro(s)`);
  }
}

function printSimpleTable(headers: string[], rows: string[][]): void {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => (row[index] ?? '').length)),
  );

  const formatRow = (cells: string[]) =>
    cells.map((cell, index) => (cell ?? '').padEnd(widths[index])).join('  ');

  process.stdout.write(`${formatRow(headers)}\n`);
  if (rows.length > 0) {
    process.stdout.write(`${widths.map((w) => '─'.repeat(w)).join('  ')}\n`);
  }
  for (const row of rows) {
    process.stdout.write(`${formatRow(row)}\n`);
  }
}

export async function withSpinner<T>(
  message: string,
  task: () => Promise<T>,
): Promise<T> {
  if (quiet || !process.stderr.isTTY) {
    return task();
  }

  const { default: ora } = await import('ora');
  const spinner = ora({ text: message, color: 'gray', discardStdin: false }).start();
  try {
    const result = await task();
    spinner.stop();
    note(message);
    return result;
  } catch (error) {
    spinner.fail(message);
    throw error;
  }
}

export function printAccountContext(
  accountName: string,
  label?: string,
  environment?: EnvironmentInfo,
): void {
  if (quiet) return;
  const display = label ? `${label} (${accountName})` : accountName;
  if (!environment) {
    console.error(chalk.dim(`account · ${display}`));
    return;
  }

  const badge = formatEnvironmentBadge(environment);
  const coloredBadge =
    badge === 'dev'
      ? chalk.yellow(badge)
      : badge === 'prod'
        ? chalk.green(badge)
        : chalk.dim(badge);

  console.error(chalk.dim('account · ') + display + chalk.dim(' · ') + coloredBadge);
}
