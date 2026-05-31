import { get, post, patch, del } from './request';
import type { Tag } from './types';

export const getTags = () => get<Tag[]>('/api/tags');
export const createTag = (name: string) => post<Tag>('/api/tags', { name });
export const updateTag = (id: string, name: string) => patch<Tag>(`/api/tags/${id}`, { name });
export const deleteTag = (id: string) => del(`/api/tags/${id}`, { silentCodes: [10009] });
