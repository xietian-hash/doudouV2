export interface User {
  id: string;
  openid: string;
  nickname: string | null;
  avatarUrl: string | null;
  phone: string | null;
  status: number;
}

export interface Account {
  id: string;
  name: string;
  type: number;
  balance: string;
  icon: string | null;
  sort: number;
  isDefault: boolean;
}

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  type: number;
  icon: string | null;
  sort: number;
  lastUsedAt: string | null;
  children?: Category[];
}

export interface CategoryIcon {
  id: string;
  icon: string;
  name: string;
  sort: number;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Bill {
  id: string;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  type: number;
  amount: string;
  remark: string | null;
  billDate: string;
  source: number;
  tags: Tag[];
}

export interface BillDetail extends Bill {
  voiceText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageResult<T> {
  pageNo: number;
  pageSize: number;
  total: number;
  list: T[];
}

export interface CalendarSummaryItem {
  date: string;
  expenseAmount: string;
  incomeAmount: string;
}

export interface VoiceParsedBill {
  type: number;
  amount: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  remark: string | null;
  billDate: string | null;
  confidence: number;
  needsConfirm: boolean;
}

export interface CategoryExpenseStat {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  amount: string;
  percent: number;
}
