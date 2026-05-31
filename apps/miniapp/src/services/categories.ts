import { get, post, patch, del } from './request';
import type { Category, CategoryIcon } from './types';

export const getCategoryIcons = () => get<CategoryIcon[]>('/api/category-icons');

export const getCategories = (params?: { type?: number; onlyLeaf?: boolean }) =>
  get<Category[]>('/api/categories', params as Record<string, unknown>);

export const createCategory = (data: {
  name: string;
  type: number;
  parentId?: string | null;
  icon?: string | null;
}) => post<Category>('/api/categories', data);

export const updateCategory = (id: string, data: { name?: string; icon?: string | null }) =>
  patch<Category>(`/api/categories/${id}`, data);

export const deleteCategory = (id: string, force = false) =>
  del(`/api/categories/${id}${force ? '?force=true' : ''}`, { silentCodes: [10008] });
