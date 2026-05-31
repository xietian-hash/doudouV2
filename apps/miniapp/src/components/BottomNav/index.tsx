import { Component } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import './index.scss';

const TABS = [
  { path: '/pages/record/index', label: '记录', icon: '◷', key: 'record' },
  { path: '/pages/bill/index', label: '记账', icon: '+', activeIcon: '🎙', key: 'bill', isCenter: true },
  { path: '/pages/mine/index', label: '我的', icon: '◉', key: 'mine' },
];

interface Props {
  onCenterTouchStart?: () => void;
  onCenterTouchEnd?: () => void;
  centerBusy?: boolean;
}

interface State {
  selected: number;
  hidden: boolean;
}

export default class BottomNav extends Component<Props, State> {
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

  hide = () => {
    this.setState({ hidden: true });
  };

  show = () => {
    this.setState({ hidden: false });
  };

  syncSelected = (key?: string) => {
    const pages = Taro.getCurrentPages();
    const curr = key || pages[pages.length - 1]?.route || '';
    const idx = TABS.findIndex(t => curr.includes(t.key));
    this.setState({ selected: idx >= 0 ? idx : 0 });
  };

  switchTab(index: number, path: string) {
    this.setState({ selected: index });
    Taro.switchTab({ url: path });
  }

  render() {
    const { selected, hidden } = this.state;
    return (
      <View className='tab-bar' style={hidden ? { display: 'none' } : {}}>
        {TABS.map((tab, idx) => (
          <View
            key={tab.path}
            className={`tab-item${tab.isCenter ? ' tab-item--center' : ''}`}
            onTouchStart={tab.isCenter && selected === idx ? this.props.onCenterTouchStart : undefined}
            onTouchEnd={tab.isCenter && selected === idx ? this.props.onCenterTouchEnd : undefined}
            onClick={() => this.switchTab(idx, tab.path)}
          >
            {tab.isCenter ? (
              <View className={`fab${selected === idx ? ' fab--active' : ''}`}>
                <Text className='fab-icon'>{this.props.centerBusy ? '…' : selected === idx ? tab.activeIcon : tab.icon}</Text>
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
