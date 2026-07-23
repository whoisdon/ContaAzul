import {
  describeEnvironment,
  detectEnvironment,
  isDevelopmentEnvironment,
} from '../auth/environment.js';
import { loadConfig, resolveAccountEnvironment } from '../config/store.js';
import { printOutput, warn } from '../ui/output.js';

export function showEnvironment(options: { format?: string }): void {
  const config = loadConfig();
  const environment = resolveAccountEnvironment();

  const payload = {
    erp: environment.erp,
    app: environment.app,
    summary: describeEnvironment(environment),
    confidence: environment.confidence,
    redirectUri: config.redirectUri,
    username: environment.username ?? null,
    email: environment.email ?? null,
    signals: environment.signals,
    note:
      'A Conta Azul não expõe um campo oficial app_type na API. ' +
      'A detecção usa heurísticas (JWT @devportal.com + redirect_uri do portal).',
  };

  if (options.format === 'json') {
    printOutput(payload, 'json');
    return;
  }

  printOutput(
    [
      {
        layer: 'erp',
        value: environment.erp,
        meaning: 'Conta ERP conectada (real vs teste do portal)',
      },
      {
        layer: 'app',
        value: environment.app,
        meaning: 'Tipo de app OAuth (redirect_uri do portal)',
      },
      {
        layer: 'confidence',
        value: environment.confidence,
        meaning: 'Confiança da detecção',
      },
    ],
    'table',
    [
      { key: 'layer', header: 'layer' },
      { key: 'value', header: 'value' },
      { key: 'meaning', header: 'meaning' },
    ],
  );

  if (!config.tokens?.accessToken) {
    warn('Sem access token — faça login para detectar o ambiente via JWT.');
    return;
  }

  if (isDevelopmentEnvironment(environment)) {
    warn('Ambiente de desenvolvimento — dados fictícios, conta ERP temporária do portal.');
  }

  for (const signal of environment.signals) {
    warn(signal);
  }
}

export function refreshEnvironmentDetection(): ReturnType<typeof detectEnvironment> {
  const config = loadConfig();
  return detectEnvironment({
    accessToken: config.tokens?.accessToken,
    redirectUri: config.redirectUri,
  });
}
