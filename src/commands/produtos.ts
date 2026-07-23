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

interface Produto {
  id?: string;
  nome?: string;
  codigo?: string;
  preco?: number;
  estoque?: number;
  available_stock?: number;
  ativo?: boolean;
}

const columns = [
  { key: 'id', header: 'id' },
  { key: 'nome', header: 'nome' },
  { key: 'codigo', header: 'codigo' },
  {
    key: 'preco',
    header: 'preco',
    render: (row: Produto) => (row.preco != null ? String(row.preco) : ''),
  },
  {
    key: 'estoque',
    header: 'estoque',
    render: (row: Produto) => String(row.available_stock ?? row.estoque ?? ''),
  },
];

export const produtos = {
  list: async (options: ResourceCommandOptions) => {
    const ctx = buildContext(options);
    await listResource<Produto>(ctx, '/v1/produtos', options, columns, 'produtos');
  },
  get: async (id: string, options: { format?: string; verbose?: boolean }) => {
    const ctx = buildContext(options);
    const produto = await getResource<Produto>(ctx, `/v1/produtos/${id}`, 'produto');
    printOutput(produto, ctx.format);
  },
  create: async (options: { format?: string; data?: string; verbose?: boolean }) => {
    const ctx = buildContext(options);
    const body = readJsonBody(options.data);
    const created = await createResource<Produto>(ctx, '/v1/produtos', body, 'produto');
    printOutput(created, ctx.format);
  },
  update: async (id: string, options: { format?: string; data?: string; verbose?: boolean }) => {
    const ctx = buildContext(options);
    const body = readJsonBody(options.data);
    const updated = await updateResource<Produto>(ctx, `/v1/produtos/${id}`, body, 'produto');
    printOutput(updated, ctx.format);
  },
  delete: async (id: string, options: { verbose?: boolean }) => {
    const ctx = buildContext(options);
    await deleteResource(ctx, `/v1/produtos/${id}`, 'produto');
  },
};
