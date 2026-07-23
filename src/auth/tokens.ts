import { AuthError } from '../utils/errors.js';

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: string | null;
}

export function tokenFromOAuthResponse(payload: Record<string, unknown>): TokenSet {
  const expiresIn = Number(payload.expires_in ?? 3600);
  const expiresAt = new Date(Date.now() + Math.max(expiresIn - 60, 0) * 1000).toISOString();

  if (typeof payload.access_token !== 'string' || typeof payload.refresh_token !== 'string') {
    throw new AuthError('Resposta de token incompleta da Conta Azul.');
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenType: typeof payload.token_type === 'string' ? payload.token_type : 'Bearer',
    expiresAt,
  };
}

export function isTokenExpired(tokens: TokenSet): boolean {
  if (!tokens.expiresAt) return true;
  return Date.now() >= new Date(tokens.expiresAt).getTime();
}

export function expiresAtFromJwt(accessToken: string): string {
  try {
    const payloadB64 = accessToken.split('.')[1];
    const padding = '='.repeat((4 - (payloadB64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(payloadB64 + padding, 'base64url').toString('utf8')) as {
      exp?: number;
    };
    if (payload.exp) {
      return new Date(payload.exp * 1000).toISOString();
    }
  } catch {
    // fallback
  }
  return new Date(Date.now() + 50 * 60 * 1000).toISOString();
}

export function extractCodeAndState(pasted: string): { code: string; state: string | null } {
  const text = pasted.trim().replace(/^["']|["']$/g, '');

  if (text.startsWith('http://') || text.startsWith('https://')) {
    const url = new URL(text);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code) throw new AuthError('URL colada sem parâmetro code.');
    return { code, state };
  }

  if (text.includes('code=') || text.includes('&state=') || text.startsWith('state=')) {
    const query = text.includes('?') ? text.slice(text.indexOf('?') + 1) : text;

    if (!query.includes('code=') && query.includes('&state=')) {
      const [code, , rest] = query.split('&');
      const params = new URLSearchParams(rest);
      return { code: code.trim(), state: params.get('state') };
    }

    const params = new URLSearchParams(query);
    const code = params.get('code');
    if (!code) throw new AuthError('Não foi possível extrair o code do texto colado.');
    return { code, state: params.get('state') };
  }

  return { code: text, state: null };
}
