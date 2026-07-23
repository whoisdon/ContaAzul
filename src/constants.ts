export const AUTH_BASE = 'https://auth.contaazul.com';
export const TOKEN_URL = `${AUTH_BASE}/oauth2/token`;
export const LOGIN_URL = `${AUTH_BASE}/login`;
export const API_BASE = 'https://api-v2.contaazul.com';
export const DEFAULT_SCOPE = 'openid profile aws.cognito.signin.user.admin';
export const DEFAULT_REDIRECT_URI = 'https://contaazul.com';

export const ENV_KEYS = {
  clientId: 'CONTAAZUL_CLIENT_ID',
  clientSecret: 'CONTAAZUL_CLIENT_SECRET',
  accessToken: 'CONTAAZUL_ACCESS_TOKEN',
  refreshToken: 'CONTAAZUL_REFRESH_TOKEN',
  redirectUri: 'CONTAAZUL_REDIRECT_URI',
} as const;
