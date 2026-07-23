import { createApiClient, type ApiClient } from '../api/client.js';
import { printOutput, resolveFormat, withSpinner, type OutputFormat } from '../ui/output.js';

export interface CommandContext {
  api: ApiClient;
  format: OutputFormat;
  verbose: boolean;
}

export interface ResourceCommandOptions {
  format?: string;
  page?: number;
  size?: number;
  all?: boolean;
  filter?: string[];
  verbose?: boolean;
}

export function buildContext(options: {
  format?: string;
  verbose?: boolean;
}): CommandContext {
  return {
    api: createApiClient(),
    format: resolveFormat(options.format),
    verbose: Boolean(options.verbose),
  };
}

const VALID_PAGE_SIZES = [10, 20, 50, 100, 200, 500, 1000];

export function normalizePageSize(size?: number): number {
  if (!size || size < 10) return 10;
  if (VALID_PAGE_SIZES.includes(size)) return size;
  return VALID_PAGE_SIZES.find((v) => v >= size) ?? 1000;
}

export function parseFilters(filters?: string[]): Record<string, string> {
  const params: Record<string, string> = {};
  if (!filters) return params;

  for (const item of filters) {
    const [key, ...rest] = item.split('=');
    if (!key || rest.length === 0) continue;
    params[key] = rest.join('=');
  }

  return params;
}

export async function listResource<T>(
  ctx: CommandContext,
  path: string,
  options: ResourceCommandOptions,
  columns: Array<{ key: string; header: string; render?: (row: T) => string }>,
  label: string,
): Promise<void> {
  const params = parseFilters(options.filter);

  const items = await withSpinner(`Buscando ${label}...`, () =>
    ctx.api.listAllPages<T>(path, {
      pagina: options.page,
      tamanhoPagina: normalizePageSize(options.size),
      allPages: options.all ?? false,
      params,
    }),
  );

  printOutput(
    items,
    ctx.format,
    columns.map((col) => ({
      key: col.key,
      header: col.header,
      render: col.render
        ? (row: Record<string, unknown>) => col.render!(row as T)
        : undefined,
    })),
  );
}

export async function getResource<T>(
  ctx: CommandContext,
  path: string,
  label: string,
): Promise<T> {
  return withSpinner(`Consultando ${label}...`, () => ctx.api.get<T>(path));
}

export async function createResource<T>(
  ctx: CommandContext,
  path: string,
  body: unknown,
  label: string,
): Promise<T> {
  return withSpinner(`Criando ${label}...`, () => ctx.api.post<T>(path, body));
}

export async function updateResource<T>(
  ctx: CommandContext,
  path: string,
  body: unknown,
  label: string,
): Promise<T> {
  return withSpinner(`Atualizando ${label}...`, () => ctx.api.put<T>(path, body));
}

export async function deleteResource(
  ctx: CommandContext,
  path: string,
  label: string,
): Promise<void> {
  await withSpinner(`Removendo ${label}...`, () => ctx.api.delete(path));
}

export function readJsonBody(raw?: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error('JSON inválido em --data. Use aspas e formato JSON válido.');
  }
}
