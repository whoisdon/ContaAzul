import * as p from '@clack/prompts';
import {
  accountDisplayName,
  isValidAccountName,
  slugifyAccountName,
} from '../config/accounts.js';
import {
  formatEnvironmentBadge,
  describeEnvironment,
} from '../auth/environment.js';
import {
  clearTokens,
  ensureAccount,
  getAccount,
  listAccounts,
  loadConfig,
  removeAccount,
  setActiveAccount,
} from '../config/store.js';
import { runLogin } from './auth.js';
import { fail, printOutput, success } from '../ui/output.js';

export async function runAccountList(options: { format?: string }): Promise<void> {
  const config = loadConfig();
  const accounts = listAccounts();
  const format = options.format === 'json' ? 'json' : 'table';

  if (format === 'json') {
    printOutput(
      accounts.map((account) => ({
        name: account.name,
        label: account.label ?? null,
        active: account.name === config.activeAccount,
        authenticated: Boolean(account.tokens?.accessToken),
        expiresAt: account.tokens?.expiresAt ?? null,
        lastUsedAt: account.lastUsedAt ?? null,
        environment: account.environment
          ? {
              erp: account.environment.erp,
              app: account.environment.app,
              summary: describeEnvironment(account.environment),
            }
          : null,
      })),
      'json',
    );
    return;
  }

  if (accounts.length === 0) {
    fail('Nenhuma conta salva. Use `contaazul account add`.');
    process.exitCode = 1;
    return;
  }

  printOutput(
    accounts.map((account) => ({
      account: account.name === config.activeAccount ? `* ${account.name}` : account.name,
      label: accountDisplayName(account),
      session: account.tokens?.accessToken ? 'active' : '—',
      env: account.environment ? formatEnvironmentBadge(account.environment) : '—',
      expires: account.tokens?.expiresAt?.slice(0, 16).replace('T', ' ') ?? '—',
    })),
    'table',
    [
      { key: 'account', header: 'account' },
      { key: 'label', header: 'label' },
      { key: 'env', header: 'env' },
      { key: 'session', header: 'session' },
      { key: 'expires', header: 'expires' },
    ],
  );
}

export async function runAccountUse(name: string): Promise<void> {
  const account = getAccount(name);
  if (!account) {
    fail(`Conta "${name}" não encontrada. Use \`contaazul account list\`.`);
    process.exitCode = 1;
    return;
  }

  setActiveAccount(name);
  success(`Conta ativa: ${accountDisplayName(account)}`);
}

export async function runAccountAdd(openBrowser = true): Promise<void> {
  const nameInput = await p.text({
    message: 'Nome da conta (ex: matriz, filial-sp)',
    validate: (value) => {
      const slug = slugifyAccountName(String(value ?? ''));
      if (!slug || !isValidAccountName(slug)) {
        return 'Use apenas letras, números e hífen.';
      }
      return undefined;
    },
  });

  if (p.isCancel(nameInput)) {
    p.cancel('Operação cancelada.');
    process.exit(0);
  }

  const name = slugifyAccountName(String(nameInput));
  ensureAccount(name);
  setActiveAccount(name);

  await runLogin(openBrowser, name);
}

export async function runAccountRemove(name: string, force = false): Promise<void> {
  const account = getAccount(name);
  if (!account) {
    fail(`Conta "${name}" não encontrada.`);
    process.exitCode = 1;
    return;
  }

  if (!force) {
    const confirmed = await p.confirm({
      message: `Remover a conta "${accountDisplayName(account)}"?`,
      initialValue: false,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Operação cancelada.');
      process.exit(0);
    }
  }

  removeAccount(name);
  success(`Conta removida: ${name}`);
}

export async function runLogout(options: { account?: string; all?: boolean }): Promise<void> {
  if (options.all) {
    for (const account of listAccounts()) {
      clearTokens(account.name);
    }
    success('Sessão encerrada em todas as contas.');
    return;
  }

  const config = loadConfig(options.account);
  const accountName = options.account ?? config.activeAccount;

  if (!getAccount(accountName)) {
    fail(`Conta "${accountName}" não encontrada.`);
    process.exitCode = 1;
    return;
  }

  clearTokens(accountName);
  success(`Sessão encerrada: ${accountName}`);
}
