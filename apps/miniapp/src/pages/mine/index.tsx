import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAuthStore } from '../../stores/auth';
import './index.scss';

interface MenuItem {
  key: string;
  icon: string;
  label: string;
  desc: string;
  path: string;
}

const MENU_GROUPS: MenuItem[][] = [
  [
    { key: 'category', icon: '□', label: '分类管理', desc: '维护收入和支出分类', path: '/subpkg/category-manage/index' },
    { key: 'account', icon: '¥', label: '账户管理', desc: '管理现金、银行卡和余额', path: '/subpkg/account-manage/index' },
  ],
  [
    { key: 'tag', icon: '#', label: '标签管理', desc: '给账单补充场景标签', path: '/subpkg/tag-manage/index' },
  ],
];

export default function MinePage() {
  const { user } = useAuthStore();
  const displayName = user?.nickname || '微信用户';
  const avatarUrl = user?.avatarUrl || '';

  Taro.useDidShow(() => {
    Taro.eventCenter.trigger('tabBar:sync', 'mine');
    Taro.eventCenter.trigger('tabBar:show');
  });

  return (
    <View className='mine-page'>
      <View className='user-header'>
        <View className='user-avatar-wrap'>
          {avatarUrl ? (
            <Image className='user-avatar' src={avatarUrl} mode='aspectFill' />
          ) : (
            <View className='user-avatar-placeholder'>
              <Text className='user-avatar-icon'>兜</Text>
            </View>
          )}
        </View>
        <Text className='user-name'>{displayName}</Text>
      </View>

      <View className='mine-content'>
        {MENU_GROUPS.map((group, groupIndex) => (
          <View key={groupIndex} className='menu-card'>
            {group.map((item, index) => (
              <View
                key={item.key}
                className={`menu-item${index < group.length - 1 ? ' menu-item--bordered' : ''}`}
                onClick={() => Taro.navigateTo({ url: item.path })}
              >
                <View className='menu-icon-wrap'>
                  <Text className='menu-icon'>{item.icon}</Text>
                </View>
                <View className='menu-main'>
                  <Text className='menu-label'>{item.label}</Text>
                  <Text className='menu-desc'>{item.desc}</Text>
                </View>
                <Text className='menu-arrow'>›</Text>
              </View>
            ))}
          </View>
        ))}

        <View className='version-info'>
          <Text className='version-text'>兜兜有钱 v0.1.2</Text>
        </View>
      </View>

    </View>
  );
}
