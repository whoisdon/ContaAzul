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

interface Venda {
  id?: string;
  numero?: string | number;
  cliente?: { nome?: string };
  valor_total?: number;
  data?: string;
  status?: string;
}

const columns = [
  { key: 'id', header: 'id' },
  { key: 'numero', header: 'numero' },
  {
    key: 'cliente',
    header: 'cliente',
    render: (row: Venda) => row.cliente?.nome ?? '',
  },
  { key: 'valor_total', header: 'total' },
  { key: 'data', header: 'data' },
  { key: 'status', header: 'status' },
];

function vendaCrud(basePath: string, label: string, singular: string) {
  return {
    list: async (options: ResourceCommandOptions) => {
      const ctx = buildContext(options);
      await listResource<Venda>(ctx, basePath, options, columns, label);
    },
    get: async (id: string, options: { format?: string; verbose?: boolean }) => {
      const ctx = buildContext(options);
      const item = await getResource<Venda>(ctx, `${basePath}/${id}`, singular);
      printOutput(item, ctx.format);
    },
    create: async (options: { format?: string; data?: string; verbose?: boolean }) => {
      const ctx = buildContext(options);
      const body = readJsonBody(options.data);
      const created = await createResource<Venda>(ctx, basePath, body, singular);
      printOutput(created, ctx.format);
    },
    update: async (id: string, options: { format?: string; data?: string; verbose?: boolean }) => {
      const ctx = buildContext(options);
      const body = readJsonBody(options.data);
      const updated = await updateResource<Venda>(ctx, `${basePath}/${id}`, body, singular);
      printOutput(updated, ctx.format);
    },
    delete: async (id: string, options: { verbose?: boolean }) => {
      const ctx = buildContext(options);
      await deleteResource(ctx, `${basePath}/${id}`, singular);
    },
  };
}

export const vendas = vendaCrud('/v1/vendas', 'vendas', 'venda');
export const orcamentos = vendaCrud('/v1/orcamentos', 'orçamentos', 'orçamento');
