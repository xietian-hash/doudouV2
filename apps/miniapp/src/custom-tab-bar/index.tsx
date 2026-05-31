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
    this.syncSelected();
    Taro.eventCenter.on('tabBar:sync', this.syncSelected);
    Taro.eventCenter.on('tabBar:hide', this.hide);
    Taro.eventCenter.on('tabBar:show', this.show);
  }

  componentWillUnmount() {
    Taro.eventCenter.off('tabBar:sync', this.syncSelected);
    Taro.eventCenter.off('tabBar:hide', this.hide);
    Taro.eventCenter.off('tabBar:show', this.show);
  }

  componentDidShow() {
    this.syncSelected();
  }

  syncSelected = (key?: string) => {
    const pages = Taro.getCurrentPages();
    const curr = key || pages[pages.length - 1]?.route || '';
    const idx = TABS.findIndex(t => curr.includes(t.key));
    this.setState({ selected: idx >= 0 ? idx : 0 });
  };

  switchTab(index: number, path: string) {
    this.setState({ selected: index });
    Taro.switchTab({ url: `/${path}` });
  }

  handleCenterTouchStart = () => {
    if (TABS[this.state.selected]?.key !== 'bill') return;
    Taro.eventCenter.trigger('voiceRecord:start');
  };

  handleCenterTouchEnd = () => {
    if (TABS[this.state.selected]?.key !== 'bill') return;
    Taro.eventCenter.trigger('voiceRecord:stop');
  };

  handleCenterClick(index: number, path: string) {
    if (this.state.selected === index) return;
    this.switchTab(index, path);
  }

  hide = () => {
    this.setState({ hidden: true });
  };

  show = () => {
    this.setState({ hidden: false });
  };

  render() {
    const { selected, hidden } = this.state;
    return (
      <View className='custom-tab-bar' style={hidden ? { display: 'none' } : {}}>
        {TABS.map((tab, idx) => (
          <View
            key={tab.path}
            className={`ctb-item${tab.isCenter ? ' ctb-item--center' : ''}`}
            onTouchStart={tab.isCenter ? this.handleCenterTouchStart : undefined}
            onTouchEnd={tab.isCenter ? this.handleCenterTouchEnd : undefined}
            onTouchCancel={tab.isCenter ? this.handleCenterTouchEnd : undefined}
            onClick={() => tab.isCenter ? this.handleCenterClick(idx, tab.path) : this.switchTab(idx, tab.path)}
          >
            {tab.isCenter ? (
              <View className='ctb-fab'>
                {selected === idx ? (
                  <View className='ctb-mic-icon'>
                    <View className='ctb-mic-head' />
                    <View className='ctb-mic-stem' />
                    <View className='ctb-mic-base' />
                  </View>
                ) : (
                  <Text className='ctb-fab-icon'>+</Text>
                )}
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
