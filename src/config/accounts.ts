import type { TokenSet } from '../auth/tokens.js';
import type { EnvironmentInfo } from '../auth/environment.js';

export interface Account {
  name: string;
  label?: string;
  tokens: TokenSet | null;
  createdAt: string;
  lastUsedAt?: string;
  environment?: EnvironmentInfo & { detectedAt: string };
}

export function slugifyAccountName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function isValidAccountName(name: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,47}$/.test(name);
}

export function accountDisplayName(account: Account): string {
  return account.label ?? account.name;
}
