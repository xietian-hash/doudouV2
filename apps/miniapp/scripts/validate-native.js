const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'app.json',
  'app.js',
  'app.wxss',
  'project.config.json',
  'custom-tab-bar/index.json',
  'custom-tab-bar/index.wxml',
  'custom-tab-bar/index.wxss',
  'custom-tab-bar/index.js',
  'pages/record/index.json',
  'pages/record/index.wxml',
  'pages/record/index.wxss',
  'pages/record/index.js',
  'pages/bill/index.json',
  'pages/bill/index.wxml',
  'pages/bill/index.wxss',
  'pages/bill/index.js',
  'pages/mine/index.json',
  'pages/mine/index.wxml',
  'pages/mine/index.wxss',
  'pages/mine/index.js',
];

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`缺少小程序文件: ${file}`);
  }
}

for (const file of ['app.json', 'project.config.json', 'custom-tab-bar/index.json']) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  JSON.parse(content);
}

console.log('微信原生小程序工程校验通过');
