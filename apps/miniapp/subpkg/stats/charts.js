// 原生 canvas 图表绘制工具
// 所有函数接受 canvas 2d ctx + 配置项，单位均为 px（已按 dpr 缩放）

const PALETTE = [
  '#5DBE88', // 品牌主绿
  '#6BCBD3', // 青
  '#F0B05A', // 暖橙
  '#E78A82', // 珊瑚红
  '#B098D6', // 淡紫
  '#82C0E2', // 天蓝
  '#95C994', // 春绿
  '#F4D06F', // 暖黄
];
const OTHER_COLOR = '#B5D0C6';

function palette(i) {
  return PALETTE[i % PALETTE.length];
}

function clearCanvas(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
}

/**
 * 环形图
 * @param ctx canvas 2d 上下文
 * @param opts { width, height, items: [{ value, color? }], maxSlices, centerTexts: [{ text, font, color, dy }] }
 */
function drawRing(ctx, opts) {
  const { width: w, height: h, items, maxSlices = 7 } = opts;
  clearCanvas(ctx, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - 4;
  const innerR = r * 0.62;

  const positiveItems = (items || []).filter((it) => Number(it.value) > 0);
  if (positiveItems.length === 0) {
    // 空环
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#F2F7F4';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    drawCenterTexts(ctx, cx, cy, opts.centerTexts);
    return;
  }

  // 大于 maxSlices 合并"其他"
  let slices = positiveItems.slice();
  if (slices.length > maxSlices) {
    const top = slices.slice(0, maxSlices - 1);
    const rest = slices.slice(maxSlices - 1);
    const otherValue = rest.reduce((s, it) => s + Number(it.value), 0);
    slices = [...top, { value: otherValue, color: OTHER_COLOR, isOther: true }];
  }
  const total = slices.reduce((s, it) => s + Number(it.value), 0);
  if (total === 0) return;

  let start = -Math.PI / 2;
  slices.forEach((it, i) => {
    const angle = (Number(it.value) / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = it.color || palette(i);
    ctx.fill();
    start += angle;
  });

  // 镂空中心
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  drawCenterTexts(ctx, cx, cy, opts.centerTexts);
}

function drawCenterTexts(ctx, cx, cy, centerTexts) {
  if (!centerTexts || !centerTexts.length) return;
  centerTexts.forEach((t) => {
    ctx.save();
    ctx.fillStyle = t.color || '#1F2A24';
    ctx.font = t.font || '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.text, cx, cy + (t.dy || 0));
    ctx.restore();
  });
}

/**
 * mini 横向柱状图（6 个月迷你柱）
 * @param ctx
 * @param opts { width, height, values: number[], color }
 */
function drawMiniBars(ctx, opts) {
  const { width: w, height: h, values = [], color = '#5DBE88' } = opts;
  clearCanvas(ctx, w, h);
  if (!values.length) return;
  const max = Math.max(...values, 1);
  const gap = 2;
  const barW = (w - gap * (values.length - 1)) / values.length;
  values.forEach((v, i) => {
    const barH = (v / max) * (h - 2);
    const x = i * (barW + gap);
    const y = h - barH;
    ctx.fillStyle = i === values.length - 1 ? color : '#D5E9DD';
    ctx.fillRect(x, y, barW, Math.max(barH, 1));
  });
}

/**
 * 折线图（日均消费）
 * @param ctx
 * @param opts { width, height, labels: string[], values: number[], color }
 */
function drawLine(ctx, opts) {
  const { width: w, height: h, values = [], color = '#5DBE88' } = opts;
  clearCanvas(ctx, w, h);
  if (values.length < 2) {
    // 单点画不出折线，画底线
    ctx.strokeStyle = '#E8F3EE';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, h - 20);
    ctx.lineTo(w - 8, h - 20);
    ctx.stroke();
    return;
  }
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 20;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const max = Math.max(...values, 1);
  const min = 0;
  const range = max - min || 1;
  const dx = innerW / (values.length - 1);

  // 网格基线
  ctx.strokeStyle = '#E8F3EE';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, padT + innerH);
  ctx.lineTo(padL + innerW, padT + innerH);
  ctx.stroke();

  // 折线
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = padL + dx * i;
    const y = padT + innerH - ((v - min) / range) * innerH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // 填充渐变
  ctx.lineTo(padL + innerW, padT + innerH);
  ctx.lineTo(padL, padT + innerH);
  ctx.closePath();
  const gradient = ctx.createLinearGradient(0, padT, 0, padT + innerH);
  gradient.addColorStop(0, color + '55');
  gradient.addColorStop(1, color + '00');
  ctx.fillStyle = gradient;
  ctx.fill();

  // 点
  values.forEach((v, i) => {
    const x = padL + dx * i;
    const y = padT + innerH - ((v - min) / range) * innerH;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
}

/**
 * 日历热力图（月模式：当月每天一格）
 * @param ctx
 * @param opts { width, height, days: [{ date, amount }], color }
 */
function drawHeatmap(ctx, opts) {
  const { width: w, height: h, days = [], color = '#5DBE88' } = opts;
  clearCanvas(ctx, w, h);
  if (!days.length) return;

  const cols = 7;
  const rows = Math.ceil(days.length / cols);
  const gap = 4;
  const cellW = (w - gap * (cols - 1)) / cols;
  const cellH = (h - gap * (rows - 1)) / rows;

  const max = Math.max(...days.map((d) => Number(d.amount) || 0), 1);

  days.forEach((d, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = col * (cellW + gap);
    const y = row * (cellH + gap);
    const amt = Number(d.amount) || 0;
    const ratio = amt / max;
    let fill = '#F2F7F4';
    if (ratio > 0) {
      // 透明度阶梯
      const alpha = Math.max(0.15, Math.min(1, ratio));
      fill = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
    }
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, cellW, cellH);
    // 日期数字
    ctx.fillStyle = ratio > 0.5 ? '#FFFFFF' : '#7A9E8E';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const dayNum = Number((d.date || '').split('-')[2]) || i + 1;
    ctx.fillText(String(dayNum), x + cellW / 2, y + cellH / 2);
  });
}

module.exports = {
  PALETTE,
  OTHER_COLOR,
  palette,
  drawRing,
  drawMiniBars,
  drawLine,
  drawHeatmap,
};
