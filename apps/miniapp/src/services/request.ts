import Taro from '@tarojs/taro';
import { useAuthStore } from '../stores/auth';
import { showToast } from '../utils/toast';

declare const TARO_APP_API_URL: string;
export const BASE_URL = TARO_APP_API_URL;

function generateTraceId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  data?: unknown;
  header?: Record<string, string>;
  silentCodes?: number[];
}

export class ApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = useAuthStore.getState().token;
  const traceId = generateTraceId();

  const res = await Taro.request({
    url: `${BASE_URL}${url}`,
    method: (options.method || 'GET') as 'GET',
    data: options.data,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-trace-id': traceId,
      ...(options.header || {}),
    },
  });

  const data = res.data as { code: number; message: string; data?: T; details?: unknown };

  if (res.statusCode === 401) {
    useAuthStore.getState().logout();
    Taro.reLaunch({ url: '/pages/record/index' });
    throw new ApiError(401, 'Unauthorized');
  }

  if (data.code !== 0) {
    const msg = data.message || '操作失败，请重试';
    if (!options.silentCodes?.includes(data.code)) {
      showToast(msg, 'error');
    }
    throw new ApiError(data.code, msg, data.details);
  }

  return data.data as T;
}

export const get = <T>(url: string, params?: Record<string, unknown>) => {
  const cleaned = params
    ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null))
    : undefined;
  return request<T>(url, { method: 'GET', data: cleaned });
};

export const post = <T>(url: string, body?: unknown) =>
  request<T>(url, { method: 'POST', data: body });

export const patch = <T>(url: string, body?: unknown) =>
  request<T>(url, { method: 'PATCH', data: body });

export const del = <T>(url: string, opts?: { silentCodes?: number[] }) =>
  request<T>(url, { method: 'DELETE', ...opts });
