import { Command } from 'commander';

export function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

export interface CrudHandlers {
  list: (options: Record<string, unknown>) => Promise<void>;
  get: (id: string, options: Record<string, unknown>) => Promise<void>;
  create: (options: Record<string, unknown>) => Promise<void>;
  update: (id: string, options: Record<string, unknown>) => Promise<void>;
  delete: (id: string, options: Record<string, unknown>) => Promise<void>;
}

function mapListOptions(options: Record<string, unknown>) {
  return {
    format: options.format,
    page: Number(options.page),
    size: Number(options.size),
    all: options.all,
    filter: options.filter as string[] | undefined,
    verbose: options.verbose,
  };
}

export function registerCrud(
  program: Command,
  name: string,
  description: string,
  handlers: CrudHandlers,
): void {
  const cmd = program.command(name).description(description);

  cmd
    .command('list')
    .description('Listar registros')
    .option('--format <type>', 'table ou json', 'table')
    .option('--page <n>', 'Página', '1')
    .option('--size <n>', 'Itens por página (10, 20, 50…)', '10')
    .option('--all', 'Buscar todas as páginas')
    .option('-f, --filter <field=value>', 'Filtro (pode repetir)', collect, [])
    .action(async (options) => {
      await handlers.list(mapListOptions(options));
    });

  cmd
    .command('get <id>')
    .description('Obter registro por id')
    .option('--format <type>', 'table ou json', 'table')
    .action(async (id: string, options) => {
      await handlers.get(id, options);
    });

  cmd
    .command('create')
    .description('Criar registro')
    .requiredOption('--data <json>', 'Payload JSON')
    .option('--format <type>', 'table ou json', 'table')
    .action(async (options) => {
      await handlers.create(options);
    });

  cmd
    .command('update <id>')
    .description('Atualizar registro')
    .requiredOption('--data <json>', 'Payload JSON')
    .option('--format <type>', 'table ou json', 'table')
    .action(async (id: string, options) => {
      await handlers.update(id, options);
    });

  cmd
    .command('delete <id>')
    .description('Remover registro')
    .action(async (id: string, options) => {
      await handlers.delete(id, options);
    });
}

export interface InvoiceHandlers {
  list: (options: Record<string, unknown>) => Promise<void>;
  get: (id: string, options: Record<string, unknown>) => Promise<void>;
  link: (options: Record<string, unknown>) => Promise<void>;
}

export function registerInvoices(program: Command, handlers: InvoiceHandlers): void {
  const cmd = program.command('notas').description('Notas fiscais · /v1/notas-fiscais');

  cmd
    .command('list')
    .description('Listar notas fiscais')
    .option('--format <type>', 'table ou json', 'table')
    .option('--page <n>', 'Página', '1')
    .option('--size <n>', 'Itens por página (10, 20, 50…)', '10')
    .option('--all', 'Buscar todas as páginas')
    .option('-f, --filter <field=value>', 'Filtro', collect, [])
    .action(async (options) => {
      await handlers.list(mapListOptions(options));
    });

  cmd
    .command('get <id>')
    .description('Obter nota fiscal por id')
    .option('--format <type>', 'table ou json', 'table')
    .action(async (id: string, options) => {
      await handlers.get(id, options);
    });

  cmd
    .command('link')
    .description('Vincular nota fiscal a pedido')
    .requiredOption('--data <json>', 'Payload JSON')
    .option('--format <type>', 'table ou json', 'table')
    .action(async (options) => {
      await handlers.link(options);
    });
}

export function registerListOnly(
  program: Command,
  name: string,
  description: string,
  handler: (options: Record<string, unknown>) => Promise<void>,
): void {
  const cmd = program.command(name).description(description);

  cmd
    .command('list')
    .description('Listar registros')
    .option('--format <type>', 'table ou json', 'table')
    .option('--page <n>', 'Página', '1')
    .option('--size <n>', 'Itens por página (10, 20, 50…)', '10')
    .option('--all', 'Buscar todas as páginas')
    .option('-f, --filter <field=value>', 'Filtro', collect, [])
    .action(async (options) => {
      await handler(mapListOptions(options));
    });
}
