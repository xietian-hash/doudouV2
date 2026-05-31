import { Component } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import './index.scss';

const TABS = [
  { path: 'pages/record/index', label: '记录', icon: '📋', key: 'record' },
  { path: 'pages/bill/index', label: '记账', icon: '➕', key: 'bill', isCenter: true },
  { path: 'pages/mine/index', label: '我的', icon: '👤', key: 'mine' },
];

interface State { selected: number; hidden: boolean }

export default class CustomTabBar extends Component<Record<string, never>, State> {
  state: State = { selected: 0, hidden: false };

  componentDidMount() {
    const pages = Taro.getCurrentPages();
    const curr = pages[pages.length - 1]?.route || '';
    const idx = TABS.findIndex(t => curr.includes(t.key));
    this.setState({ selected: idx >= 0 ? idx : 0 });
    Taro.eventCenter.on('tabBar:hide', () => this.setState({ hidden: true }));
    Taro.eventCenter.on('tabBar:show', () => this.setState({ hidden: false }));
  }

  componentWillUnmount() {
    Taro.eventCenter.off('tabBar:hide');
    Taro.eventCenter.off('tabBar:show');
  }

  switchTab(index: number, path: string) {
    this.setState({ selected: index });
    Taro.switchTab({ url: `/${path}` });
  }

  render() {
    const { selected, hidden } = this.state;
    return (
      <View className='custom-tab-bar' style={hidden ? { display: 'none' } : {}}>
        {TABS.map((tab, idx) => (
          <View
            key={tab.path}
            className={`ctb-item${tab.isCenter ? ' ctb-item--center' : ''}`}
            onClick={() => this.switchTab(idx, tab.path)}
          >
            {tab.isCenter ? (
              <View className='ctb-fab'>
                <Text className='ctb-fab-icon'>+</Text>
              </View>
            ) : (
              <>
                <Text className={`ctb-icon${selected === idx ? ' ctb-icon--active' : ''}`}>
                  {tab.icon}
                </Text>
                <Text className={`ctb-label${selected === idx ? ' ctb-label--active' : ''}`}>
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
