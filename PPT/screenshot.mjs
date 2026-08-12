import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'index-mobile.html');
const outDir = path.join(__dirname, 'slides-export');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

// 9:16 尺寸，适合公众号上传
const W = 1080;
const H = 1920;
const TOTAL = 10;

const browser = await puppeteer.launch({
  headless: true,
  args: [`--window-size=${W},${H}`, '--no-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });

// 等待字体和 WebGL 初始化
await new Promise(r => setTimeout(r, 2500));

// 隐藏截图提示条和导航
await page.evaluate(() => {
  const tip = document.getElementById('screenshot-tip');
  if (tip) tip.style.display = 'none';
  const nav = document.getElementById('nav');
  if (nav) nav.style.display = 'none';
  const hint = document.getElementById('hint');
  if (hint) hint.style.display = 'none';
  // 关闭动效，让所有元素直接可见
  document.body.classList.remove('motion-ready');
  document.querySelectorAll('[data-anim]').forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
});

for (let i = 0; i < TOTAL; i++) {
  // 跳到第 i 张
  await page.evaluate((idx) => {
    if (typeof go === 'function') go(idx);
  }, i);

  await new Promise(r => setTimeout(r, 1000));

  // 只截取幻灯片区域（左侧第一张）
  const slideW = Math.min(W, Math.round(H * 9 / 16));
  const slideH = Math.min(H, Math.round(W * 16 / 9));

  const filename = path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`);
  await page.screenshot({
    path: filename,
    clip: { x: 0, y: 0, width: slideW, height: slideH },
  });

  console.log(`✓ slide-${String(i + 1).padStart(2, '0')}.png  (${slideW}×${slideH})`);
}

await browser.close();
console.log(`\n全部完成，图片已保存到：${outDir}`);
