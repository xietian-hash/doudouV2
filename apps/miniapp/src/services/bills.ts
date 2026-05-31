import { get, post, patch, del } from './request';
import type { Bill, BillDetail, PageResult, CalendarSummaryItem } from './types';

export const getBills = (params: {
  month?: string;
  date?: string;
  pageNo?: number;
  pageSize?: number;
}) => get<PageResult<Bill>>('/api/bills', params as Record<string, unknown>);

export const getCalendarSummary = (month: string) =>
  get<CalendarSummaryItem[]>('/api/bills/calendar-summary', { month });

export const getBillDetail = (id: string) => get<BillDetail>(`/api/bills/${id}`);

export const createBill = (data: {
  accountId: string;
  categoryId: string;
  type: number;
  amount: string;
  billDate: string;
  remark?: string;
  tagIds?: string[];
  source?: number;
  voiceText?: string;
}) => post<Bill>('/api/bills', data);

export const createBillBatch = (items: Parameters<typeof createBill>[0][]) =>
  post<Bill[]>('/api/bills/batch', { items });

export const updateBill = (id: string, data: Parameters<typeof createBill>[0]) =>
  patch<Bill>(`/api/bills/${id}`, data);

export const deleteBill = (id: string) => del(`/api/bills/${id}`);
