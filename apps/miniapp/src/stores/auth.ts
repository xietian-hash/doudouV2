import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { login } from '../services/auth';
import type { User } from '../services/types';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoggedIn: boolean;
  init: () => Promise<void>;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoggedIn: false,

  init: async () => {
    const token = Taro.getStorageSync('token');
    if (token) {
      set({ token, isLoggedIn: true });
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getCurrentUser } = require('../services/auth') as typeof import('../services/auth');
        const user = await getCurrentUser();
        set({ user });
      } catch {
        // token 已过期，清除后重新登录
        get().logout();
        await get().init();
      }
    } else {
      try {
        const result = await login();
        Taro.setStorageSync('token', result.token);
        set({ token: result.token, user: result.user, isLoggedIn: true });
      } catch (e) {
        console.error('login failed', e);
      }
    }
  },

  setToken: (token) => {
    Taro.setStorageSync('token', token);
    set({ token, isLoggedIn: true });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    Taro.removeStorageSync('token');
    set({ token: null, user: null, isLoggedIn: false });
  },
}));
