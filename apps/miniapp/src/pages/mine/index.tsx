import { useState, useEffect } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAuthStore } from '../../stores/auth';
import BottomNav from '../../components/BottomNav';
import './index.scss';

interface MenuItem {
  key: string;
  icon: string;
  label: string;
  path: string;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'category', icon: '🗂️', label: '分类管理', path: '/subpkg/category-manage/index' },
  { key: 'account', icon: '🏦', label: '账户管理', path: '/subpkg/account-manage/index' },
  { key: 'tag', icon: '🏷️', label: '标签管理', path: '/subpkg/tag-manage/index' },
];

export default function MinePage() {
  const { user } = useAuthStore();

  const handleNavigate = (path: string) => {
    Taro.navigateTo({ url: path });
  };

  const displayName = user?.nickname || '微信用户';
  const avatarUrl = user?.avatarUrl || '';

  return (
    <View className='mine-page'>
      {/* 用户信息卡片 */}
      <View className='user-card'>
        <View className='user-avatar-wrap'>
          {avatarUrl ? (
            <Image className='user-avatar' src={avatarUrl} mode='aspectFill' />
          ) : (
            <View className='user-avatar-placeholder'>
              <Text className='user-avatar-icon'>👤</Text>
            </View>
          )}
        </View>
        <View className='user-info'>
          <Text className='user-name'>{displayName}</Text>
          {user?.phone && (
            <Text className='user-phone'>{user.phone}</Text>
          )}
        </View>
      </View>

      {/* 菜单列表 */}
      <View className='menu-section'>
        <View className='menu-card'>
          {MENU_ITEMS.map((item, idx) => (
            <View
              key={item.key}
              className={`menu-item${idx < MENU_ITEMS.length - 1 ? ' menu-item--bordered' : ''}`}
              onClick={() => handleNavigate(item.path)}
            >
              <Text className='menu-icon'>{item.icon}</Text>
              <Text className='menu-label'>{item.label}</Text>
              <Text className='menu-arrow'>›</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 版本信息 */}
      <View className='version-info'>
        <Text className='version-text'>兜兜有钱 v0.1.0</Text>
      </View>

      <BottomNav />
    </View>
  );
}
