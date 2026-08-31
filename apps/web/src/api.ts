let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function rawRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`/api${path}`, {
    ...init,
    headers,
    credentials: 'include', // envia o cookie httpOnly do refresh token
  });
}

async function tryRefresh(): Promise<boolean> {
  const res = await rawRequest('/auth/refresh', { method: 'POST' });
  if (!res.ok) return false;
  const data = await res.json();
  setAccessToken(data.accessToken);
  return true;
}

/**
 * Faz a mesma dança de auth/refresh do apiRequest, mas devolve a Response crua
 * em vez de parsear como JSON — usado para arquivos binários (imagens, PDFs).
 * Necessário porque o token de acesso vive só em memória e vai no header
 * Authorization: uma tag <img>/<a> comum não consegue mandar esse header,
 * então qualquer arquivo autenticado precisa passar por aqui.
 */
async function rawFileRequest(path: string): Promise<Response> {
  let res = await rawRequest(path);
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawRequest(path);
    }
  }
  if (!res.ok) {
    throw new ApiError(res.status, 'Não foi possível carregar o arquivo.');
  }
  return res;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await rawRequest(path, init);

  if (res.status === 401 && path !== '/auth/login') {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawRequest(path, init);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? 'Erro inesperado.');
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

/** Busca um arquivo autenticado e devolve uma object URL (pra <img src> ou window.open). */
export async function fetchFileUrl(path: string): Promise<string> {
  const res = await rawFileRequest(path);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Copia texto pra área de transferência, com fallback pra quando o site está
 * em HTTP puro (sem domínio/TLS ainda) — a API navigator.clipboard só
 * funciona em contexto seguro (HTTPS ou localhost); em HTTP ela nem existe
 * no objeto navigator, então chamar direto falha silenciosamente.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // cai pro fallback abaixo
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
  upload: <T>(path: string, formData: FormData) =>
    apiRequest<T>(path, { method: 'POST', body: formData }),
};
