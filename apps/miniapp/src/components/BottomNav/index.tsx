import { Component } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import './index.scss';

const TABS = [
  { path: '/pages/record/index', label: '记录', icon: '◷', key: 'record' },
  { path: '/pages/bill/index', label: '记账', icon: '+', activeIcon: '🎙', key: 'bill', isCenter: true },
  { path: '/pages/mine/index', label: '我的', icon: '◉', key: 'mine' },
];

interface State {
  selected: number;
}

export default class BottomNav extends Component<Record<string, never>, State> {
  state: State = { selected: 0 };

  componentDidMount() {
    this.syncSelected();
  }

  componentDidShow() {
    this.syncSelected();
  }

  syncSelected() {
    const pages = Taro.getCurrentPages();
    const curr = pages[pages.length - 1]?.route || '';
    const idx = TABS.findIndex(t => curr.includes(t.key));
    this.setState({ selected: idx >= 0 ? idx : 0 });
  }

  switchTab(index: number, path: string) {
    this.setState({ selected: index });
    Taro.switchTab({ url: path });
  }

  render() {
    const { selected } = this.state;
    return (
      <View className='tab-bar'>
        {TABS.map((tab, idx) => (
          <View
            key={tab.path}
            className={`tab-item${tab.isCenter ? ' tab-item--center' : ''}`}
            onClick={() => this.switchTab(idx, tab.path)}
          >
            {tab.isCenter ? (
              <View className={`fab${selected === idx ? ' fab--active' : ''}`}>
                <Text className='fab-icon'>{selected === idx ? tab.activeIcon : tab.icon}</Text>
              </View>
            ) : (
              <>
                <Text className={`tab-icon${selected === idx ? ' tab-icon--active' : ''}`}>
                  {tab.icon}
                </Text>
                <Text className={`tab-label${selected === idx ? ' tab-label--active' : ''}`}>
                  {tab.label}
                </Text>
              </>
            )}
          </View>
        ))}
      </View>
    );
  }
}
