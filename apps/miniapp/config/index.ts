import { defineConfig } from '@tarojs/cli';

export default defineConfig({
  projectName: '兜兜有钱',
  date: '2024-01-01',
  designWidth: 750,
  deviceRatio: { 640: 2.34, 750: 1, 828: 1.81 },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  defineConstants: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  copy: { patterns: [], options: {} },
  framework: 'react',
  compiler: 'webpack5',
  mini: {
    postcss: {
      pxtransform: { enable: true, config: {} },
      url: { enable: true },
      cssModules: { enable: false },
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      autoprefixer: { enable: true },
    },
  },
});
