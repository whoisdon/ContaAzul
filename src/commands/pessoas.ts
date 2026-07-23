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

interface Pessoa {
  id?: string;
  nome?: string;
  documento?: string;
  email?: string;
  telefone?: string;
  tipo?: string;
  ativo?: boolean;
}

const columns = [
  { key: 'id', header: 'id' },
  { key: 'nome', header: 'nome' },
  { key: 'documento', header: 'documento' },
  { key: 'email', header: 'email' },
  { key: 'tipo', header: 'tipo' },
];

export const pessoas = {
  list: async (options: ResourceCommandOptions) => {
    const ctx = buildContext(options);
    await listResource<Pessoa>(ctx, '/v1/pessoas', options, columns, 'pessoas');
  },
  get: async (id: string, options: { format?: string; verbose?: boolean }) => {
    const ctx = buildContext(options);
    const pessoa = await getResource<Pessoa>(ctx, `/v1/pessoas/${id}`, 'pessoa');
    printOutput(pessoa, ctx.format);
  },
  create: async (options: { format?: string; data?: string; verbose?: boolean }) => {
    const ctx = buildContext(options);
    const body = readJsonBody(options.data);
    const created = await createResource<Pessoa>(ctx, '/v1/pessoas', body, 'pessoa');
    printOutput(created, ctx.format);
  },
  update: async (id: string, options: { format?: string; data?: string; verbose?: boolean }) => {
    const ctx = buildContext(options);
    const body = readJsonBody(options.data);
    const updated = await updateResource<Pessoa>(ctx, `/v1/pessoas/${id}`, body, 'pessoa');
    printOutput(updated, ctx.format);
  },
  delete: async (id: string, options: { verbose?: boolean }) => {
    const ctx = buildContext(options);
    await deleteResource(ctx, `/v1/pessoas/${id}`, 'pessoa');
  },
};
