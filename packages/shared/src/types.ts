export type BillType = 1 | 2; // 1支出 2收入
export type AccountType = 1 | 2 | 3 | 4 | 5; // 1现金 2银行卡 3支付宝 4微信 5其他
export type BillSource = 1 | 2; // 1手工录入 2语音识别

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  traceId: string;
}

export interface ApiError {
  code: number;
  message: string;
  details?: Record<string, unknown>;
  traceId: string;
}

export interface PageResult<T> {
  pageNo: number;
  pageSize: number;
  total: number;
  list: T[];
}
