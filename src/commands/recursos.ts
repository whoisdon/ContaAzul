import {
  buildContext,
  createResource,
  deleteResource,
  getResource,
  listResource,
  readJsonBody,
  updateResource,
  type ResourceCommandOptions,
} from './helpers.js';
import { printOutput } from '../ui/output.js';

type Column<T> = { key: string; header: string; render?: (row: T) => string };

function makeCrudHandlers<T>(
  path: string,
  label: string,
  columns: Column<T>[],
  singular: string,
) {
  return {
    list: async (options: ResourceCommandOptions) => {
      const ctx = buildContext(options);
      await listResource<T>(ctx, path, options, columns, label);
    },
    get: async (id: string, options: { format?: string; verbose?: boolean }) => {
      const ctx = buildContext(options);
      const item = await getResource<T>(ctx, `${path}/${id}`, singular);
      printOutput(item, ctx.format);
    },
    create: async (options: { format?: string; data?: string; verbose?: boolean }) => {
      const ctx = buildContext(options);
      const body = readJsonBody(options.data);
      const created = await createResource<T>(ctx, path, body, singular);
      printOutput(created, ctx.format);
    },
    update: async (id: string, options: { format?: string; data?: string; verbose?: boolean }) => {
      const ctx = buildContext(options);
      const body = readJsonBody(options.data);
      const updated = await updateResource<T>(ctx, `${path}/${id}`, body, singular);
      printOutput(updated, ctx.format);
    },
    delete: async (id: string, options: { verbose?: boolean }) => {
      const ctx = buildContext(options);
      await deleteResource(ctx, `${path}/${id}`, singular);
    },
  };
}

interface NamedResource {
  id?: string;
  nome?: string;
  descricao?: string;
  codigo?: string;
  status?: string;
}

const idNomeColumns = [
  { key: 'id', header: 'id' },
  { key: 'nome', header: 'nome' },
  { key: 'codigo', header: 'codigo' },
  { key: 'status', header: 'status' },
];

export const categorias = makeCrudHandlers<NamedResource>(
  '/v1/categorias',
  'categorias',
  idNomeColumns,
  'categoria',
);

export const servicos = makeCrudHandlers<NamedResource & { preco?: number }>(
  '/v1/servicos',
  'serviços',
  [
    { key: 'id', header: 'id' },
    { key: 'nome', header: 'nome' },
    { key: 'preco', header: 'preco' },
    { key: 'status', header: 'status' },
  ],
  'serviço',
);

export const contratos = makeCrudHandlers<NamedResource & { valor?: number }>(
  '/v1/contratos',
  'contratos',
  [
    { key: 'id', header: 'id' },
    { key: 'nome', header: 'nome' },
    { key: 'valor', header: 'valor' },
    { key: 'status', header: 'status' },
  ],
  'contrato',
);

export const centrosCusto = makeCrudHandlers<NamedResource>(
  '/v1/financeiro/centrosdecusto',
  'centros de custo',
  idNomeColumns,
  'centro de custo',
);

export const categoriasFin = makeCrudHandlers<NamedResource>(
  '/v1/financeiro/categorias',
  'categorias financeiras',
  idNomeColumns,
  'categoria financeira',
);

interface NotaFiscal {
  id?: string;
  numero?: string;
  tipo?: string;
  status?: string;
  valor?: number;
}

export const notas = {
  list: async (options: ResourceCommandOptions) => {
    const ctx = buildContext(options);
    await listResource<NotaFiscal>(
      ctx,
      '/v1/notas-fiscais',
      options,
      [
        { key: 'id', header: 'id' },
        { key: 'numero', header: 'numero' },
        { key: 'tipo', header: 'tipo' },
        { key: 'valor', header: 'valor' },
        { key: 'status', header: 'status' },
      ],
      'notas fiscais',
    );
  },
  get: async (id: string, options: { format?: string; verbose?: boolean }) => {
    const ctx = buildContext(options);
    const item = await getResource<NotaFiscal>(ctx, `/v1/notas-fiscais/${id}`, 'nota fiscal');
    printOutput(item, ctx.format);
  },
  link: async (options: { format?: string; data?: string; verbose?: boolean }) => {
    const ctx = buildContext(options);
    const body = readJsonBody(options.data);
    const result = await createResource<unknown>(ctx, '/v1/notas-fiscais', body, 'vínculo de nota');
    printOutput(result, ctx.format);
  },
};

export async function eventosList(options: ResourceCommandOptions): Promise<void> {
  const ctx = buildContext(options);
  await listResource<Record<string, unknown>>(
    ctx,
    '/v1/financeiro/eventos',
    options,
    [
      { key: 'id', header: 'id' },
      { key: 'tipo', header: 'tipo' },
      { key: 'data', header: 'data' },
      { key: 'status', header: 'status' },
    ],
    'eventos financeiros',
  );
}
