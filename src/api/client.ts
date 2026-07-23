import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import { API_BASE } from '../constants.js';
import { importLegacyTokensIfNeeded, loadConfig, touchAccount } from '../config/store.js';
import { getCurrentAccount } from '../config/context.js';
import { OAuthClient } from '../auth/oauth.js';
import { ApiError, AuthError } from '../utils/errors.js';

export interface PaginatedResponse<T> {
  items: T[];
  totalItems?: number;
  pagina?: number;
  tamanhoPagina?: number;
  nextPage?: boolean;
}

export interface ListOptions {
  pagina?: number;
  tamanhoPagina?: number;
  params?: Record<string, string | number | boolean | undefined>;
  allPages?: boolean;
}

export class ApiClient {
  private readonly http: AxiosInstance;
  private readonly oauth: OAuthClient;

  constructor(baseUrl = API_BASE, accountName?: string) {
    const account = accountName ?? getCurrentAccount();
    const config = importLegacyTokensIfNeeded(loadConfig(account));
    if (account) touchAccount(config.activeAccount);

    this.oauth = new OAuthClient(
      config.clientId,
      config.clientSecret,
      config.redirectUri,
      config.tokens,
      config.activeAccount,
    );

    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 30_000,
      headers: { Accept: 'application/json' },
    });

    axiosRetry(this.http, {
      retries: 3,
      retryDelay: (retryCount, error) => {
        const retryAfter = Number(error.response?.headers['retry-after']);
        if (retryAfter && !Number.isNaN(retryAfter)) {
          return retryAfter * 1000;
        }
        return axiosRetry.exponentialDelay(retryCount);
      },
      retryCondition: (error) => {
        const status = error.response?.status;
        return status === 429 || (status !== undefined && status >= 500);
      },
    });
  }

  getOAuth(): OAuthClient {
    return this.oauth;
  }

  async request<T = unknown>(
    method: string,
    path: string,
    config?: AxiosRequestConfig,
    retried = false,
  ): Promise<T> {
    const accessToken = await this.oauth.ensureAccessToken();

    try {
      const response = await this.http.request<T>({
        ...config,
        method,
        url: path,
        headers: {
          ...config?.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 204 || response.data === '') {
        return undefined as T;
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 401 && !retried) {
          try {
            this.oauth.requireCredentials();
            await this.oauth.refresh();
            return this.request<T>(method, path, config, true);
          } catch (refreshError) {
            throw new AuthError(
              'Token inválido ou expirado. Execute `contaazul login` novamente.',
              refreshError,
            );
          }
        }

        throw new ApiError(
          `Erro na API Conta Azul (${status ?? 'sem status'}).`,
          status,
          error.response?.data ?? error.message,
        );
      }

      throw error;
    }
  }

  async get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', path, { params });
  }

  async post<T = unknown>(path: string, data?: unknown): Promise<T> {
    return this.request<T>('POST', path, { data });
  }

  async put<T = unknown>(path: string, data?: unknown): Promise<T> {
    return this.request<T>('PUT', path, { data });
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  async listAllPages<T>(
    path: string,
    options: ListOptions = {},
  ): Promise<T[]> {
    const pageSize = options.tamanhoPagina ?? 50;
    let pagina = options.pagina ?? 1;
    const all: T[] = [];
    let total = Number.POSITIVE_INFINITY;

    while (all.length < total) {
      const params = {
        pagina,
        tamanho_pagina: pageSize,
        ...options.params,
      };

      const data = await this.get<Record<string, unknown>>(path, params);
      const items = extractItems<T>(data);
      const totalItems = extractTotalItems(data);

      all.push(...items);
      total = totalItems ?? all.length;

      const hasNext = data.nextPage === true || (totalItems !== undefined && all.length < totalItems);
      if (!options.allPages || !hasNext || items.length === 0) break;
      pagina += 1;
    }

    return all;
  }
}

function extractItems<T>(data: Record<string, unknown>): T[] {
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data.items)) return data.items as T[];
  if (Array.isArray(data.data)) return data.data as T[];
  if (Array.isArray(data.content)) return data.content as T[];
  return [];
}

function extractTotalItems(data: Record<string, unknown>): number | undefined {
  if (typeof data.totalItems === 'number') return data.totalItems;
  if (typeof data.total === 'number') return data.total;
  if (typeof data.totalElements === 'number') return data.totalElements;
  return undefined;
}

export function createApiClient(accountName?: string): ApiClient {
  const config = loadConfig(accountName ?? getCurrentAccount());
  return new ApiClient(config.apiBase, accountName ?? getCurrentAccount());
}
