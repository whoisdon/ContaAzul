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

interface FinanceiroItem {
  id?: string;
  descricao?: string;
  valor?: number;
  vencimento?: string;
  status?: string;
}

const financeColumns = [
  { key: 'id', header: 'id' },
  { key: 'descricao', header: 'descricao' },
  { key: 'valor', header: 'valor' },
  { key: 'vencimento', header: 'vencimento' },
  { key: 'status', header: 'status' },
];

function financeCrud(basePath: string, label: string, singular: string) {
  return {
    list: async (options: ResourceCommandOptions) => {
      const ctx = buildContext(options);
      await listResource<FinanceiroItem>(ctx, basePath, options, financeColumns, label);
    },
    get: async (id: string, options: { format?: string; verbose?: boolean }) => {
      const ctx = buildContext(options);
      const item = await getResource<FinanceiroItem>(ctx, `${basePath}/${id}`, singular);
      printOutput(item, ctx.format);
    },
    create: async (options: { format?: string; data?: string; verbose?: boolean }) => {
      const ctx = buildContext(options);
      const body = readJsonBody(options.data);
      const created = await createResource<FinanceiroItem>(ctx, basePath, body, singular);
      printOutput(created, ctx.format);
    },
    update: async (id: string, options: { format?: string; data?: string; verbose?: boolean }) => {
      const ctx = buildContext(options);
      const body = readJsonBody(options.data);
      const updated = await updateResource<FinanceiroItem>(ctx, `${basePath}/${id}`, body, singular);
      printOutput(updated, ctx.format);
    },
    delete: async (id: string, options: { verbose?: boolean }) => {
      const ctx = buildContext(options);
      await deleteResource(ctx, `${basePath}/${id}`, singular);
    },
  };
}

export const cobrancas = financeCrud('/v1/financeiro/contasreceber', 'cobranças', 'cobrança');
export const contasPagar = financeCrud('/v1/financeiro/contaspagar', 'contas a pagar', 'conta a pagar');
export const baixas = financeCrud('/v1/financeiro/baixas', 'baixas', 'baixa');
