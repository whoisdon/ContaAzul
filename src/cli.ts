import { Command } from 'commander';
import { runConfigInit, runLogin, showConfig } from './commands/auth.js';
import {
  runAccountAdd,
  runAccountList,
  runAccountRemove,
  runAccountUse,
  runLogout,
} from './commands/account.js';
import { cobrancas, contasPagar, baixas } from './commands/financeiro.js';
import { pessoas } from './commands/pessoas.js';
import { produtos } from './commands/produtos.js';
import {
  categorias,
  categoriasFin,
  centrosCusto,
  contratos,
  eventosList,
  notas,
  servicos,
} from './commands/recursos.js';
import { vendas, orcamentos } from './commands/vendas.js';
import { showEnvironment } from './commands/env.js';
import { createApiClient } from './api/client.js';
import {
  decodeJwtPayload,
  describeEnvironment,
  isDevelopmentEnvironment,
} from './auth/environment.js';
import { setCurrentAccount } from './config/context.js';
import { accountDisplayName } from './config/accounts.js';
import { getAccount, loadConfig, resolveAccountEnvironment } from './config/store.js';
import { OAuthClient } from './auth/oauth.js';
import { registerCrud, registerInvoices, registerListOnly } from './cli/register.js';
import { printRootHelp } from './ui/help.js';
import { fail, printAccountContext, printOutput, setOutputMode, success, warn, withSpinner, note } from './ui/output.js';
import { getErrorMessage } from './utils/errors.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('contaazul')
    .description('CLI para a API Conta Azul v2')
    .version('0.1.0')
    .option('-q, --quiet', 'Saída mínima (ideal para scripts)')
    .option('-v, --verbose', 'Logs adicionais em stderr')
    .option('--account <name>', 'Usar uma conta específica neste comando')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.optsWithGlobals() as {
        quiet?: boolean;
        verbose?: boolean;
        account?: string;
      };

      setOutputMode({ quiet: opts.quiet, verbose: opts.verbose });

      if (opts.account) {
        setCurrentAccount(opts.account);
        const account = getAccount(opts.account);
        if (!account) {
          fail(`Conta "${opts.account}" não encontrada.`);
          process.exit(1);
        }
        printAccountContext(opts.account, account.label, account.environment ?? resolveAccountEnvironment(opts.account));
      } else {
        const config = loadConfig();
        const account = getAccount(config.activeAccount);
        if (account?.tokens?.accessToken) {
          printAccountContext(
            config.activeAccount,
            account.label,
            account.environment ?? resolveAccountEnvironment(),
          );
        }
      }
    });

  program.addHelpCommand(false);
  program.helpOption('-h, --help', 'Exibir ajuda');
  program.configureHelp({ sortSubcommands: true });

  const config = program.command('config').description('Configuração do app OAuth');

  config
    .command('init')
    .description('Configurar Client ID e Client Secret')
    .action(async () => runConfigInit());

  config
    .command('show')
    .description('Exibir configuração (sem secrets)')
    .action(() => showConfig());

  program
    .command('login')
    .description('Autenticar via OAuth 2.0')
    .option('--no-browser', 'Não abrir o navegador')
    .option('--account <name>', 'Conta de destino')
    .action(async (options: { browser: boolean; account?: string }) => {
      await runLogin(options.browser, options.account);
    });

  program
    .command('logout')
    .description('Encerrar sessão')
    .option('--account <name>', 'Conta específica')
    .option('--all', 'Encerrar sessão em todas as contas')
    .action(async (options: { account?: string; all?: boolean }) => {
      await runLogout(options);
    });

  program
    .command('refresh')
    .description('Renovar access token')
    .action(async () => {
      const oauth = OAuthClient.fromConfig();
      const tokens = await withSpinner('Renovando token', () => oauth.refresh());
      success(`Token renovado · expira ${tokens.expiresAt ?? '?'}`);
    });

  program
    .command('whoami')
    .description('Dados da sessão OAuth (JWT + ambiente)')
    .option('--format <type>', 'table ou json', 'table')
    .action(async (options: { format: string }) => {
      const config = loadConfig();
      const environment = resolveAccountEnvironment();
      const token = config.tokens?.accessToken;
      if (!token) {
        fail('Sem sessão · execute `contaazul login`');
        process.exitCode = 1;
        return;
      }

      const claims = decodeJwtPayload(token);
      const payload = {
        account: config.activeAccount,
        environment,
        username: claims.username ?? claims.email ?? null,
        clientId: claims.client_id ?? config.clientId,
        expiresAt: config.tokens?.expiresAt ?? null,
      };

      if (options.format === 'json') {
        process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
        return;
      }

      printOutput(
        Object.entries(payload).map(([key, value]) => ({
          field: key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
        })),
        'table',
        [
          { key: 'field', header: 'field' },
          { key: 'value', header: 'value' },
        ],
      );
    });

  program
    .command('ping')
    .description('Testar credenciais e conexão com a API')
    .action(async () => {
      const config = loadConfig();
      if (!config.clientId || !config.clientSecret) {
        fail('Credenciais ausentes · execute `contaazul config init`');
        process.exitCode = 1;
        return;
      }

      if (!config.tokens?.accessToken) {
        fail('Sessão ausente · execute `contaazul login`');
        process.exitCode = 1;
        return;
      }

      try {
        const api = createApiClient();
        await withSpinner('Testando API', () => api.get('/v1/pessoas', { pagina: 1, tamanho_pagina: 10 }));
        const account = getAccount(config.activeAccount);
        const environment = resolveAccountEnvironment();
        const name = account ? accountDisplayName(account) : config.activeAccount;
        success(`Conectado · ${name} · ${describeEnvironment(environment)}`);
        if (isDevelopmentEnvironment(environment)) {
          warn('Ambiente de desenvolvimento — dados fictícios do portal.');
        }
      } catch (error) {
        fail(getErrorMessage(error));
        process.exitCode = 1;
      }
    });

  program
    .command('env')
    .description('Detectar ambiente (dev/prod) da app e conta ERP')
    .option('--format <type>', 'table ou json', 'table')
    .action(async (options: { format: string }) => showEnvironment(options));

  const account = program.command('account').description('Gerenciar múltiplas contas');

  account
    .command('list')
    .description('Listar contas salvas')
    .option('--format <type>', 'table ou json', 'table')
    .action(async (options) => runAccountList(options));

  account
    .command('use <name>')
    .description('Alternar conta ativa')
    .action(async (name: string) => runAccountUse(name));

  account
    .command('add')
    .description('Adicionar e autenticar nova conta')
    .option('--no-browser', 'Não abrir o navegador')
    .action(async (options: { browser: boolean }) => runAccountAdd(options.browser));

  account
    .command('remove <name>')
    .description('Remover conta salva')
    .option('-f, --force', 'Sem confirmação')
    .action(async (name: string, options: { force?: boolean }) => runAccountRemove(name, options.force));

  registerCrud(program, 'pessoas', 'Clientes e fornecedores · /v1/pessoas', pessoas);
  registerCrud(program, 'produtos', 'Catálogo de produtos · /v1/produtos', produtos);
  registerCrud(program, 'categorias', 'Categorias de produtos · /v1/categorias', categorias);
  registerCrud(program, 'servicos', 'Catálogo de serviços · /v1/servicos', servicos);
  registerCrud(program, 'contratos', 'Contratos recorrentes · /v1/contratos', contratos);
  registerCrud(program, 'vendas', 'Pedidos de venda · /v1/vendas', vendas);
  registerCrud(program, 'orcamentos', 'Orçamentos · /v1/orcamentos', orcamentos);
  registerInvoices(program, notas);
  registerCrud(program, 'cobrancas', 'Contas a receber · /v1/financeiro/contasreceber', cobrancas);
  registerCrud(program, 'contas-pagar', 'Contas a pagar · /v1/financeiro/contaspagar', contasPagar);
  registerCrud(program, 'baixas', 'Baixas financeiras · /v1/financeiro/baixas', baixas);
  registerCrud(program, 'centros-custo', 'Centros de custo · /v1/financeiro/centrosdecusto', centrosCusto);
  registerCrud(program, 'categorias-fin', 'Categorias financeiras · /v1/financeiro/categorias', categoriasFin);
  registerListOnly(program, 'eventos', 'Eventos financeiros · /v1/financeiro/eventos', eventosList);

  return program;
}

export async function run(argv = process.argv): Promise<void> {
  const bare = argv.length <= 2;
  const rootHelp = bare || (argv.length <= 3 && (argv.includes('--help') || argv.includes('-h')));

  if (rootHelp && !argv.some((arg, index) => index > 1 && !arg.startsWith('-'))) {
    printRootHelp();
    return;
  }

  const program = createProgram();

  try {
    await program.parseAsync(argv);
  } catch (error) {
    fail(getErrorMessage(error));
    process.exitCode = 1;
  }
}
