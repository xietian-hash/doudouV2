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
});
