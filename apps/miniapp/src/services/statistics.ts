import { get } from './request';
import type { CategoryExpenseStat } from './types';

export const getCategoryExpense = (month: string) =>
  get<CategoryExpenseStat[]>('/api/statistics/category-expense', { month });
