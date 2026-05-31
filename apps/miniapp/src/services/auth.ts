import Taro from '@tarojs/taro';
import { post, get } from './request';
import type { User } from './types';

export interface LoginResult {
  token: string;
  user: User;
}

export async function login(): Promise<LoginResult> {
  const { code } = await Taro.login();
  return post<LoginResult>('/api/auth/wechat-login', { wxCode: code });
}

export function getCurrentUser(): Promise<User> {
  return get<User>('/api/users/me');
}
