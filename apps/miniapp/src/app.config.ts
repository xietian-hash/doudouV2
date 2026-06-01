export default defineAppConfig({
  pages: [
    'pages/record/index',
    'pages/bill/index',
    'pages/mine/index',
  ],
  subPackages: [
    {
      root: 'subpkg/account-manage',
      pages: ['index'],
    },
    {
      root: 'subpkg/category-manage',
      pages: ['index', 'sub-categories'],
    },
    {
      root: 'subpkg/tag-manage',
      pages: ['index'],
    },
    {
      root: 'subpkg/bill-detail',
      pages: ['index'],
    },
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#F0FBF5',
    navigationBarTitleText: '兜兜有钱',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#5DBE88',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/record/index', text: '记录', iconPath: 'assets/icons/record-normal.png', selectedIconPath: 'assets/icons/record-active.png' },
      { pagePath: 'pages/bill/index', text: '' },
      { pagePath: 'pages/mine/index', text: '我的', iconPath: 'assets/icons/mine-normal.png', selectedIconPath: 'assets/icons/mine-active.png' },
    ],
  },
});
