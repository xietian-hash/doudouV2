import Taro from '@tarojs/taro';
import { post } from './request';
import { useAuthStore } from '../stores/auth';
import type { VoiceParsedBill } from './types';

const BASE_URL = process.env.TARO_APP_API_URL || 'http://localhost:3000';

export const parseVoice = (text: string) =>
  post<VoiceParsedBill[]>('/api/voice/parse', { text });

export async function uploadAudioAndParse(
  filePath: string,
): Promise<VoiceParsedBill[]> {
  const token = useAuthStore.getState().token;
  return new Promise((resolve, reject) => {
    Taro.uploadFile({
      url: `${BASE_URL}/api/voice/upload-audio`,
      filePath,
      name: 'file',
      header: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      success: (res) => {
        try {
          const envelope = JSON.parse(res.data) as {
            code: number;
            message: string;
            data: { text: string; bills: VoiceParsedBill[] };
          };
          if (envelope.code === 0) {
            resolve(envelope.data?.bills ?? []);
          } else {
            reject(new Error(envelope.message || '语音解析失败'));
          }
        } catch {
          reject(new Error('语音解析结果解析失败'));
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '上传失败'));
      },
    });
  });
}
