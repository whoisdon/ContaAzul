import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Conf from 'conf';
import dotenv from 'dotenv';
import type { TokenSet } from '../auth/tokens.js';
import { detectEnvironment, type EnvironmentInfo } from '../auth/environment.js';
import { DEFAULT_REDIRECT_URI, ENV_KEYS } from '../constants.js';
import type { Account } from './accounts.js';

dotenv.config();

export interface AppConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiBase: string;
  activeAccount: string;
  accounts: Record<string, Account>;
  tokens: TokenSet | null;
}

interface ConfigSchema {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  apiBase?: string;
  activeAccount?: string;
  accounts?: Record<string, Account>;
  tokens?: TokenSet | null;
}

const DEFAULT_ACCOUNT = 'default';

const store = new Conf<ConfigSchema>({
  projectName: 'contaazul-cli',
  configName: 'config',
});

function migrateLegacyTokens(): void {
  const legacyTokens = store.get('tokens');
  if (!legacyTokens) return;

  const accounts = store.get('accounts') ?? {};
  if (!accounts[DEFAULT_ACCOUNT]) {
    accounts[DEFAULT_ACCOUNT] = {
      name: DEFAULT_ACCOUNT,
      tokens: legacyTokens,
      createdAt: new Date().toISOString(),
    };
    store.set('accounts', accounts);
    store.set('activeAccount', DEFAULT_ACCOUNT);
  }

  store.delete('tokens');
}

export function getConfigPath(): string {
  return path.join(os.homedir(), '.config', 'contaazul-cli', 'config.json');
}

function readAccounts(): Record<string, Account> {
  migrateLegacyTokens();
  return store.get('accounts') ?? {};
}

function getActiveAccountName(): string {
  migrateLegacyTokens();
  return store.get('activeAccount') ?? DEFAULT_ACCOUNT;
}

function resolveAccountTokens(accountName?: string): TokenSet | null {
  const name = accountName ?? getActiveAccountName();
  const accounts = readAccounts();
  const account = accounts[name];
  if (account?.tokens) return account.tokens;

  const envAccessToken = process.env[ENV_KEYS.accessToken]?.trim() ?? '';
  const envRefreshToken = process.env[ENV_KEYS.refreshToken]?.trim() ?? '';
  if (envAccessToken && name === getActiveAccountName()) {
    return {
      accessToken: envAccessToken,
      refreshToken: envRefreshToken,
      tokenType: 'Bearer',
      expiresAt: null,
    };
  }

  return null;
}

export function loadConfig(accountName?: string): AppConfig {
  const envClientId = process.env[ENV_KEYS.clientId]?.trim() ?? '';
  const envClientSecret = process.env[ENV_KEYS.clientSecret]?.trim() ?? '';
  const envRedirectUri = process.env[ENV_KEYS.redirectUri]?.trim() ?? '';

  const activeAccount = accountName ?? getActiveAccountName();
  const accounts = readAccounts();
  const tokens = resolveAccountTokens(activeAccount);

  return {
    clientId: envClientId || store.get('clientId') || '',
    clientSecret: envClientSecret || store.get('clientSecret') || '',
    redirectUri: envRedirectUri || store.get('redirectUri') || DEFAULT_REDIRECT_URI,
    apiBase: store.get('apiBase') || 'https://api-v2.contaazul.com',
    activeAccount,
    accounts,
    tokens,
  };
}

export function saveCredentials(input: {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}): void {
  store.set('clientId', input.clientId.trim());
  store.set('clientSecret', input.clientSecret.trim());
  if (input.redirectUri) {
    store.set('redirectUri', input.redirectUri.trim());
  }
}

export function listAccounts(): Account[] {
  return Object.values(readAccounts()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getAccount(name: string): Account | null {
  return readAccounts()[name] ?? null;
}

export function ensureAccount(name: string): Account {
  const accounts = readAccounts();
  const existing = accounts[name];
  if (existing) return existing;

  const account: Account = {
    name,
    tokens: null,
    createdAt: new Date().toISOString(),
  };
  accounts[name] = account;
  store.set('accounts', accounts);
  return account;
}

export function setActiveAccount(name: string): void {
  ensureAccount(name);
  store.set('activeAccount', name);
  touchAccount(name);
}

export function touchAccount(name: string): void {
  const accounts = readAccounts();
  const account = accounts[name];
  if (!account) return;
  accounts[name] = { ...account, lastUsedAt: new Date().toISOString() };
  store.set('accounts', accounts);
}

export function saveTokens(tokens: TokenSet, accountName?: string): void {
  const name = accountName ?? getActiveAccountName();
  const accounts = readAccounts();
  const account = ensureAccount(name);
  const redirectUri = store.get('redirectUri') || DEFAULT_REDIRECT_URI;
  const environment = detectEnvironment({
    accessToken: tokens.accessToken,
    redirectUri,
  });

  accounts[name] = {
    ...account,
    tokens,
    lastUsedAt: new Date().toISOString(),
    environment: { ...environment, detectedAt: new Date().toISOString() },
  };
  store.set('accounts', accounts);
  store.set('activeAccount', name);
}

export function saveAccountLabel(name: string, label: string): void {
  const accounts = readAccounts();
  const account = accounts[name];
  if (!account) return;
  accounts[name] = { ...account, label };
  store.set('accounts', accounts);
}

export function clearTokens(accountName?: string): void {
  const name = accountName ?? getActiveAccountName();
  const accounts = readAccounts();
  const account = accounts[name];
  if (!account) return;
  accounts[name] = { ...account, tokens: null, environment: undefined };
  store.set('accounts', accounts);
}

export function resolveAccountEnvironment(accountName?: string): EnvironmentInfo {
  const config = loadConfig(accountName);
  const account = getAccount(config.activeAccount);
  if (account?.environment) {
    return account.environment;
  }
  return detectEnvironment({
    accessToken: config.tokens?.accessToken,
    redirectUri: config.redirectUri,
  });
}

export function removeAccount(name: string): boolean {
  const accounts = readAccounts();
  if (!accounts[name]) return false;
  delete accounts[name];
  store.set('accounts', accounts);

  if (getActiveAccountName() === name) {
    const remaining = Object.keys(accounts);
    if (remaining.length > 0) {
      store.set('activeAccount', remaining[0]);
    } else {
      store.delete('activeAccount');
    }
  }

  return true;
}

export function hasCredentials(config: AppConfig): boolean {
  return Boolean(config.clientId && config.clientSecret);
}

export function hasTokens(config: AppConfig): boolean {
  return Boolean(config.tokens?.accessToken);
}

export function tryLoadLegacyTokens(cwd = process.cwd()): TokenSet | null {
  const legacyPath = path.join(cwd, '.tokens.json');
  if (!fs.existsSync(legacyPath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(legacyPath, 'utf8')) as {
      access_token?: string;
      refresh_token?: string;
      token_type?: string;
      expires_at?: string | null;
    };

    if (!raw.access_token) return null;

    return {
      accessToken: raw.access_token,
      refreshToken: raw.refresh_token ?? '',
      tokenType: raw.token_type ?? 'Bearer',
      expiresAt: raw.expires_at ?? null,
    };
  } catch {
    return null;
  }
}

export function importLegacyTokensIfNeeded(config: AppConfig): AppConfig {
  if (config.tokens) return config;
  const legacy = tryLoadLegacyTokens();
  if (!legacy) return config;
  saveTokens(legacy, config.activeAccount);
  return { ...config, tokens: legacy };
}

export function getActiveAccountNamePublic(): string {
  return getActiveAccountName();
}
