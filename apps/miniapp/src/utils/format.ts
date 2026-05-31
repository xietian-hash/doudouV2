export function formatAmount(amount: string | number, _type?: number): string {
  const num = parseFloat(String(amount));
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
}

export function amountDisplay(amount: string, type: number): string {
  const num = parseFloat(amount);
  return type === 1 ? `-${num.toFixed(2)}` : `+${num.toFixed(2)}`;
}

export function parseAmount(input: string): string {
  // 去除前导零，最多保留2位小数
  if (!input || input === '0') return '0';
  const parts = input.split('.');
  if (parts.length > 2) return input.slice(0, -1);
  if (parts[1] && parts[1].length > 2) return input.slice(0, -1);
  return input;
}
