import * as p from '@clack/prompts';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { OAuthClient } from '../auth/oauth.js';
import {
  describeEnvironment,
  decodeJwtPayload,
  isDevelopmentEnvironment,
} from '../auth/environment.js';
import {
  ensureAccount,
  getActiveAccountNamePublic,
  getConfigPath,
  getAccount,
  loadConfig,
  resolveAccountEnvironment,
  saveAccountLabel,
  saveCredentials,
  setActiveAccount,
} from '../config/store.js';
import { DEFAULT_REDIRECT_URI } from '../constants.js';
import { fail, info, link, note, success, warn } from '../ui/output.js';
import { getErrorMessage } from '../utils/errors.js';

const execAsync = promisify(exec);

export async function runConfigInit(): Promise<void> {
  p.intro('config');

  const clientId = await p.text({
    message: 'Client ID',
    validate: (value) => (!value?.trim() ? 'Obrigatório' : undefined),
  });

  if (p.isCancel(clientId)) {
    p.cancel('Cancelado.');
    process.exit(0);
  }

  const clientSecret = await p.password({
    message: 'Client Secret',
    validate: (value) => (!value?.trim() ? 'Obrigatório' : undefined),
  });

  if (p.isCancel(clientSecret)) {
    p.cancel('Cancelado.');
    process.exit(0);
  }

  const redirectUri = await p.text({
    message: 'Redirect URI',
    initialValue: DEFAULT_REDIRECT_URI,
    validate: (value) => (!value?.trim() ? 'Obrigatório' : undefined),
  });

  if (p.isCancel(redirectUri)) {
    p.cancel('Cancelado.');
    process.exit(0);
  }

  saveCredentials({
    clientId: String(clientId),
    clientSecret: String(clientSecret),
    redirectUri: String(redirectUri),
  });

  success('Credenciais salvas.');
  info('Próximo passo: contaazul login');
  p.outro('Pronto.');
}

export async function runLogin(openBrowser = true, accountName?: string): Promise<void> {
  const targetAccount = accountName ?? getActiveAccountNamePublic();
  ensureAccount(targetAccount);
  setActiveAccount(targetAccount);

  const oauth = OAuthClient.fromConfig(targetAccount);
  oauth.requireCredentials();

  const { url, state } = oauth.buildAuthorizeUrl();

  info(`Conta: ${targetAccount}`);
  info('Abra a URL abaixo, autorize e cole o code de retorno.');
  link(url);

  if (openBrowser) {
    await openUrl(url);
  }

  while (true) {
    const pasted = await p.text({
      message: 'URL ou code',
      placeholder: 'https://contaazul.com?code=...',
    });

    if (p.isCancel(pasted)) {
      p.cancel('Login cancelado.');
      process.exit(0);
    }

    const value = String(pasted).trim();
    if (!value) continue;

    if (['sair', 'exit', 'quit', 'q'].includes(value.toLowerCase())) {
      p.cancel('Login cancelado.');
      process.exit(0);
    }

    const spinner = p.spinner();
    spinner.start('Autenticando...');

    try {
      const code = oauth.parsePastedAuthorization(value, state);
      const tokens = await oauth.exchangeCode(code);
      spinner.stop('Autenticado.');

      await tryUpdateAccountLabel(targetAccount);
      const account = getAccount(targetAccount);
      const env = account?.environment;
      if (env) {
        note(`Ambiente: ${describeEnvironment(env)}`);
        if (isDevelopmentEnvironment(env)) {
          warn('App/conta de desenvolvimento — dados fictícios do portal.');
        }
      }
      note(`Token expira em ${tokens.expiresAt ?? 'desconhecido'}`);
      p.outro(`Conta "${targetAccount}" conectada.`);
      return;
    } catch (error) {
      spinner.stop('Falhou');
      fail(getErrorMessage(error));
    }
  }
}

async function tryUpdateAccountLabel(accountName: string): Promise<void> {
  try {
    const config = loadConfig(accountName);
    const token = config.tokens?.accessToken;
    if (!token) return;
    const claims = decodeJwtPayload(token);
    const label =
      (typeof claims.name === 'string' && claims.name) ||
      (typeof claims.username === 'string' && claims.username) ||
      (typeof claims.email === 'string' && claims.email);
    if (label) saveAccountLabel(accountName, label);
  } catch {
    // label opcional
  }
}

async function openUrl(url: string): Promise<void> {
  const platform = process.platform;
  const command =
    platform === 'win32'
      ? `start "" "${url}"`
      : platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;

  try {
    await execAsync(command);
  } catch {
    info('Abra a URL manualmente no navegador.');
  }
}

export function showConfig(): void {
  const current = loadConfig();

  process.stdout.write(
    `${JSON.stringify(
      {
        activeAccount: current.activeAccount,
        accounts: Object.values(current.accounts).map((account) => ({
          name: account.name,
          label: account.label ?? null,
          authenticated: Boolean(account.tokens?.accessToken),
          expiresAt: account.tokens?.expiresAt ?? null,
          environment: account.environment
            ? {
                erp: account.environment.erp,
                app: account.environment.app,
                summary: describeEnvironment(account.environment),
              }
            : null,
        })),
        clientId: current.clientId ? `${current.clientId.slice(0, 6)}...` : null,
        redirectUri: current.redirectUri,
        environment: resolveAccountEnvironment(),
        apiBase: current.apiBase,
        configPath: getConfigPath(),
      },
      null,
      2,
    )}\n`,
  );
}
