export const DEV_PORTAL_REDIRECT_URIS = new Set([
  'https://contaazul.com',
  'https://www.contaazul.com',
]);

export type EnvironmentKind = 'development' | 'production' | 'unknown';

export interface EnvironmentInfo {
  /** Conta ERP conectada (dados reais vs conta teste do portal) */
  erp: EnvironmentKind;
  /** Tipo de app OAuth (heurística pela redirect_uri do portal) */
  app: EnvironmentKind;
  confidence: 'high' | 'medium' | 'low';
  signals: string[];
  username?: string;
  email?: string;
}

export function decodeJwtPayload(accessToken: string): Record<string, unknown> {
  const parts = accessToken.split('.');
  if (parts.length < 2) return {};

  const payloadB64 = parts[1];
  const padding = '='.repeat((4 - (payloadB64.length % 4)) % 4);
  const json = Buffer.from(payloadB64 + padding, 'base64url').toString('utf8');
  return JSON.parse(json) as Record<string, unknown>;
}

function claimString(payload: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function isDevPortalAccount(username?: string, email?: string): boolean {
  const values = [username, email].filter(Boolean) as string[];
  return values.some((value) => value.toLowerCase().includes('@devportal.com'));
}

function isDevPortalRedirect(redirectUri?: string): boolean {
  if (!redirectUri) return false;
  const normalized = redirectUri.trim().replace(/\/$/, '');
  return DEV_PORTAL_REDIRECT_URIS.has(normalized);
}

/**
 * A Conta Azul não expõe um campo oficial "app_type" na API.
 * Usamos heurísticas documentadas pelo portal + claims do JWT OAuth.
 */
export function detectEnvironment(input: {
  accessToken?: string | null;
  redirectUri?: string;
}): EnvironmentInfo {
  const signals: string[] = [];
  let erp: EnvironmentKind = 'unknown';
  let app: EnvironmentKind = 'unknown';
  let confidence: EnvironmentInfo['confidence'] = 'low';

  let username: string | undefined;
  let email: string | undefined;

  if (input.accessToken) {
    try {
      const payload = decodeJwtPayload(input.accessToken);
      username = claimString(payload, 'username', 'cognito:username', 'preferred_username');
      email = claimString(payload, 'email');

      if (isDevPortalAccount(username, email)) {
        erp = 'development';
        signals.push('JWT: usuário @devportal.com (conta ERP de teste do portal)');
        confidence = 'high';
      } else if (username || email) {
        erp = 'production';
        signals.push('JWT: usuário não é @devportal.com (conta ERP real)');
        confidence = confidence === 'low' ? 'medium' : confidence;
      }
    } catch {
      signals.push('JWT: não foi possível decodificar o access token');
    }
  }

  if (isDevPortalRedirect(input.redirectUri)) {
    app = 'development';
    signals.push('redirect_uri padrão do portal (app de Desenvolvimento)');
    confidence = confidence === 'high' ? 'high' : 'medium';
  } else if (input.redirectUri) {
    app = 'production';
    signals.push('redirect_uri customizada (típico de app de Produção)');
    confidence = confidence === 'high' ? 'high' : 'medium';
  }

  if (erp === 'unknown' && app === 'unknown') {
    signals.push('ambiente não identificado — faça login para atualizar');
  }

  return { erp, app, confidence, signals, username, email };
}

export function environmentLabel(info: EnvironmentInfo): string {
  if (info.erp === 'development' || info.app === 'development') return 'development';
  if (info.erp === 'production' && info.app === 'production') return 'production';
  if (info.erp === 'production' || info.app === 'production') return 'production';
  return 'unknown';
}

export function formatEnvironmentBadge(info: EnvironmentInfo): string {
  const label = environmentLabel(info);
  if (label === 'development') return 'dev';
  if (label === 'production') return 'prod';
  return '?';
}

export function describeEnvironment(info: EnvironmentInfo): string {
  const erp =
    info.erp === 'development'
      ? 'ERP de teste (portal)'
      : info.erp === 'production'
        ? 'ERP real'
        : 'ERP desconhecido';

  const app =
    info.app === 'development'
      ? 'app Desenvolvimento'
      : info.app === 'production'
        ? 'app Produção'
        : 'app desconhecido';

  return `${erp} · ${app}`;
}

export function isDevelopmentEnvironment(info: EnvironmentInfo): boolean {
  return info.erp === 'development' || info.app === 'development';
}
