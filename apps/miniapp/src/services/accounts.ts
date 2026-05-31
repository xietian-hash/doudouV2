import { get, post, patch, del } from './request';
import type { Account } from './types';

export const getAccounts = () => get<Account[]>('/api/accounts');

export const createAccount = (data: { name: string; type: number; icon?: string }) =>
  post<Account>('/api/accounts', data);

export const updateAccount = (id: string, data: { name?: string; type?: number; icon?: string }) =>
  patch<Account>(`/api/accounts/${id}`, data);

export const deleteAccount = (id: string) => del(`/api/accounts/${id}`);

export const setDefaultAccount = (id: string) =>
  post(`/api/accounts/${id}/default`);
