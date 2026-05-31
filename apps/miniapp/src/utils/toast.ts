import Taro from '@tarojs/taro';

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (toastTimer) clearTimeout(toastTimer);
  Taro.showToast({
    title: message,
    icon: type === 'success' ? 'success' : 'error',
    duration: 2000,
    mask: false,
  });
  toastTimer = setTimeout(() => { toastTimer = null; }, 2200);
}
