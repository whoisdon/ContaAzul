import crypto from 'node:crypto';
import axios from 'axios';
import {
  DEFAULT_SCOPE,
  LOGIN_URL,
  TOKEN_URL,
} from '../constants.js';
import { loadConfig, saveTokens } from '../config/store.js';
import { AuthError } from '../utils/errors.js';
import {
  extractCodeAndState,
  expiresAtFromJwt,
  isTokenExpired,
  tokenFromOAuthResponse,
  type TokenSet,
} from './tokens.js';

export class OAuthClient {
  private tokens: TokenSet | null;

  static fromConfig(accountName?: string): OAuthClient {
    const config = loadConfig(accountName);
    return new OAuthClient(
      config.clientId,
      config.clientSecret,
      config.redirectUri,
      config.tokens,
      config.activeAccount,
    );
  }

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
    tokens: TokenSet | null = null,
    private readonly accountName?: string,
  ) {
    this.tokens = tokens;
  }

  requireCredentials(): void {
    if (!this.clientId || !this.clientSecret) {
      throw new AuthError(
        'Client ID e Client Secret são obrigatórios. Execute `contaazul config init`.',
      );
    }
  }

  buildAuthorizeUrl(state?: string): { url: string; state: string } {
    const oauthState = state ?? crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: oauthState,
      scope: DEFAULT_SCOPE,
    });

    return { url: `${LOGIN_URL}?${params.toString()}`, state: oauthState };
  }

  async exchangeCode(code: string): Promise<TokenSet> {
    const tokens = await this.requestToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
    });
    this.persist(tokens);
    return tokens;
  }

  async refresh(refreshToken?: string): Promise<TokenSet> {
    const token = refreshToken ?? this.tokens?.refreshToken;
    if (!token) {
      throw new AuthError('Nenhum refresh token disponível. Execute `contaazul login`.');
    }

    const tokens = await this.requestToken({
      grant_type: 'refresh_token',
      refresh_token: token,
    });
    this.persist(tokens);
    return tokens;
  }

  importTokens(accessToken: string, refreshToken = ''): TokenSet {
    const tokens: TokenSet = {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresAt: expiresAtFromJwt(accessToken),
    };
    this.persist(tokens);
    return tokens;
  }

  async ensureAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new AuthError('Sem tokens salvos. Execute `contaazul login`.');
    }

    if (isTokenExpired(this.tokens)) {
      if (!this.tokens.refreshToken) {
        throw new AuthError('Token expirado e sem refresh token. Execute `contaazul login`.');
      }
      await this.refresh(this.tokens.refreshToken);
    }

    if (!this.tokens) {
      throw new AuthError('Falha ao obter access token.');
    }

    return this.tokens.accessToken;
  }

  getTokens(): TokenSet | null {
    return this.tokens;
  }

  parsePastedAuthorization(pasted: string, expectedState?: string): string {
    const { code, state } = extractCodeAndState(pasted);
    if (state && expectedState && state !== expectedState) {
      throw new AuthError('State OAuth não confere com esta sessão. Tente novamente.');
    }
    return code;
  }

  private async requestToken(data: Record<string, string>): Promise<TokenSet> {
    this.requireCredentials();

    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    try {
      const response = await axios.post(TOKEN_URL, new URLSearchParams(data), {
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return tokenFromOAuthResponse(response.data as Record<string, unknown>);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data ?? error.message;
        throw new AuthError(`Falha ao obter token (${error.response?.status ?? 'erro'}).`, detail);
      }
      throw error;
    }
  }

  private persist(tokens: TokenSet): void {
    this.tokens = tokens;
    saveTokens(tokens, this.accountName);
  }
}
