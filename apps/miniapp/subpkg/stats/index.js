const statsService = require('./stats.service');
const billsService = require('../../services/bills');
const charts = require('./charts');

function pad2(n) {
  return String(n).padStart(2, '0');
}

function monthStr(y, m) {
  return `${y}-${pad2(m)}`;
}

function formatChange(percent) {
  if (percent == null) return '';
  const abs = Math.abs(percent).toFixed(1);
  return percent >= 0 ? `↑${abs}%` : `↓${abs}%`;
}

function changeDir(percent, type) {
  // type=1 支出：升=坏（红）/降=好（绿）；type=2 收入相反
  if (percent == null) return 'down';
  if (type === 1) return percent >= 0 ? 'up' : 'down';
  return percent >= 0 ? 'down' : 'up';
}

Page({
  data: {
    period: 'month',
    level: 1,
    type: 1,

    year: 0,
    month: 0,

    periodLabel: '',
    periodLabelShort: '',
    prevLabel: '上月',
    typeLabel: '支出',
    canNext: false,

    loading: false,
    isEmpty: false,
    emptyHint: '本月还没有支出记录',

    summary: { total: '0.00', count: 0, dailyAvg: '', changeText: '', changeDir: 'down' },
    ringImageSrc: '',
    lineImageSrc: '',
    heatmapImageSrc: '',
    ringLegend: [],
    insights: [],
    rankItems: [],
    topBills: [],

    showLine: false,
    lineTitle: '',
    showHeatmap: false,

    // 弹层
    sheetVisible: false,
    sheetCategoryName: '',
    sheetBills: [],
    sheetLoading: false,

    // 内部缓存
    _ringItems: [],
    _lineSeries: null,
    _heatmapDays: null,
  },

  onLoad() {
    const now = new Date();
    this.setData(
      { year: now.getFullYear(), month: now.getMonth() + 1 },
      () => this.loadAll(),
    );
  },

  // ============ 切换 ============

  onPeriodChange(e) {
    const value = e.currentTarget.dataset.value;
    if (value === this.data.period) return;
    this.setData({ period: value }, () => this.loadAll());
  },

  onLevelChange(e) {
    const value = Number(e.currentTarget.dataset.value);
    if (value === this.data.level) return;
    this.setData({ level: value }, () => this.loadAll());
  },

  onTypeChange(e) {
    const value = Number(e.currentTarget.dataset.value);
    if (value === this.data.type) return;
    this.setData({ type: value }, () => this.loadAll());
  },

  onPrevPeriod() {
    if (this.data.period === 'month') {
      let y = this.data.year;
      let m = this.data.month - 1;
      if (m < 1) { m = 12; y -= 1; }
      this.setData({ year: y, month: m }, () => this.loadAll());
    } else if (this.data.period === 'year') {
      this.setData({ year: this.data.year - 1 }, () => this.loadAll());
    }
  },

  onNextPeriod() {
    if (!this.data.canNext) return;
    if (this.data.period === 'month') {
      let y = this.data.year;
      let m = this.data.month + 1;
      if (m > 12) { m = 1; y += 1; }
      this.setData({ year: y, month: m }, () => this.loadAll());
    } else if (this.data.period === 'year') {
      this.setData({ year: this.data.year + 1 }, () => this.loadAll());
    }
  },

  // ============ 主加载 ============

  updateLabels() {
    const { period, year, month, type } = this.data;
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const typeLabel = type === 1 ? '支出' : '收入';

    let periodLabel = '';
    let periodLabelShort = '';
    let prevLabel = '';
    let canNext = false;

    if (period === 'month') {
      periodLabel = monthStr(year, month);
      periodLabelShort = year === curY && month === curM ? '本月' : `${month}月`;
      prevLabel = '上月';
      canNext = year < curY || (year === curY && month < curM);
    } else if (period === 'year') {
      periodLabel = String(year);
      periodLabelShort = year === curY ? '本年' : `${year}年`;
      prevLabel = '去年';
      canNext = year < curY;
    } else {
      periodLabel = '全部';
      periodLabelShort = '全部时段';
      prevLabel = '';
      canNext = false;
    }

    this.setData({
      periodLabel, periodLabelShort, prevLabel, canNext, typeLabel,
      emptyHint: `${periodLabelShort}还没有${typeLabel}记录`,
    });
  },

  async loadAll() {
    this.updateLabels();
    this.setData({ loading: true });

    const { period, level, type, year, month } = this.data;
    const params = { period, type };
    if (period === 'month') params.month = monthStr(year, month);
    if (period === 'year') params.year = String(year);

    try {
      const [overview, trend, dailySeries, topBillsRes] = await Promise.all([
        statsService.getOverview({ ...params, level }),
        statsService.getCategoryTrend({ level, type }),
        period !== 'all'
          ? statsService.getDailySeries(params)
          : Promise.resolve({ granularity: 'month', points: [] }),
        statsService.getTopBills({ ...params, limit: 5 }),
      ]);

      this.applyOverview(overview, trend);
      this.applyTopBills(topBillsRes && topBillsRes.bills);
      this.applyDailySeries(dailySeries);
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false }, () => this.renderCanvases());
    }
  },

  applyOverview(overview, trend) {
    const { type, period } = this.data;
    const categories = (overview && overview.categories) || [];

    // 颜色分配
    const palette = charts.PALETTE;
    const colored = categories.map((c, i) => ({ ...c, color: palette[i % palette.length] }));

    // 摘要
    const summary = (overview && overview.summary) || { total: '0.00', count: 0 };
    const changeText = summary.changePercent != null
      ? formatChange(summary.changePercent)
      : '';
    const summaryView = {
      total: summary.total,
      count: summary.count,
      dailyAvg: summary.dailyAvg || '',
      changeText,
      changeDir: changeDir(summary.changePercent, type),
    };

    // 环形图数据 & 图例（前 7 个，超过合"其他"）
    const ringItems = colored.slice(0, 7).map((c) => ({
      value: Number(c.amount),
      color: c.color,
    }));
    const ringLegend = colored.slice(0, 7).map((c) => ({
      categoryId: c.categoryId,
      name: c.categoryName,
      percent: c.percent,
      color: c.color,
    }));
    if (colored.length > 7) {
      const other = colored.slice(7);
      const sum = other.reduce((s, c) => s + Number(c.amount), 0);
      const percent = other.reduce((s, c) => s + c.percent, 0).toFixed(2);
      ringItems[6] = { value: sum, color: charts.OTHER_COLOR };
      ringLegend.push({
        categoryId: '_other',
        name: `其他 ${other.length} 项`,
        percent,
        color: charts.OTHER_COLOR,
      });
    }

    // 排行榜（含 mini 柱）
    const trendMap = new Map();
    if (trend && trend.data) {
      trend.data.forEach((row) => {
        trendMap.set(row.categoryId, row.amounts.map((s) => Number(s)));
      });
    }
    const rankItems = colored.map((c) => {
      const amounts = trendMap.get(c.categoryId) || [0, 0, 0, 0, 0, 0];
      const max = Math.max(...amounts, 1);
      const miniBars = amounts.map((v, i) => ({
        height: max > 0 ? Math.max((v / max) * 100, 4) : 4,
        isLast: i === amounts.length - 1,
      }));
      return {
        ...c,
        changeText: c.changePercent != null ? formatChange(c.changePercent) : '',
        changeDir: changeDir(c.changePercent, type),
        miniBars,
      };
    });

    this.setData({
      summary: summaryView,
      ringLegend,
      ringImageSrc: '',
      insights: (overview && overview.insights) || [],
      rankItems,
      isEmpty: rankItems.length === 0,
      _ringItems: ringItems,
    });
  },

  applyTopBills(bills) {
    this.setData({ topBills: bills || [] });
  },

  applyDailySeries(series) {
    const { period } = this.data;
    if (period === 'all') {
      this.setData({
        showLine: false,
        showHeatmap: false,
        lineImageSrc: '',
        heatmapImageSrc: '',
        _lineSeries: null,
        _heatmapDays: null,
      });
      return;
    }
    const points = (series && series.points) || [];
    const showHeatmap = period === 'month' && (series && series.granularity === 'day');
    const lineTitle = period === 'month' ? `${this.data.periodLabelShort}每日趋势` : `${this.data.periodLabelShort}每日趋势`;
    this.setData({
      showLine: points.length > 0,
      lineTitle,
      showHeatmap,
      lineImageSrc: '',
      heatmapImageSrc: '',
      _lineSeries: points,
      _heatmapDays: showHeatmap ? points : null,
    });
  },

  // ============ Canvas 渲染 ============

  renderCanvases() {
    if (this.data.isEmpty) return;
    this.renderRing();
    if (this.data.showLine) this.renderLine();
    if (this.data.showHeatmap) this.renderHeatmap();
  },

  withCanvas(selector, draw) {
    wx.createSelectorQuery()
      .in(this)
      .select(selector)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const node = res[0].node;
        const ctx = node.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 1;
        const w = res[0].width;
        const h = res[0].height;
        node.width = w * dpr;
        node.height = h * dpr;
        ctx.scale(dpr, dpr);
        draw(ctx, w, h, node);
      });
  },

  renderRing() {
    this.withCanvas('#ring-canvas', (ctx, w, h, node) => {
      const total = this.data.summary.total;
      const count = this.data.summary.count;
      charts.drawRing(ctx, {
        width: w,
        height: h,
        items: this.data._ringItems,
        maxSlices: 7,
        centerTexts: [
          { text: `¥${total}`, font: 'bold 22px sans-serif', color: '#1F2A24', dy: -10 },
          { text: `${this.data.typeLabel} · ${count}笔`, font: '12px sans-serif', color: '#7A9E8E', dy: 14 },
        ],
      });
      this.updateCanvasImage(node, 'ringImageSrc');
    });
  },

  updateCanvasImage(canvas, imageKey) {
    if (!canvas || !wx.canvasToTempFilePath) return;
    wx.canvasToTempFilePath({
      canvas,
      success: (res) => {
        if (res && res.tempFilePath) {
          this.setData({ [imageKey]: res.tempFilePath });
        }
      },
      fail: () => {
        this.setData({ [imageKey]: '' });
      },
    }, this);
  },

  renderLine() {
    this.withCanvas('#line-canvas', (ctx, w, h, node) => {
      const points = this.data._lineSeries || [];
      const values = points.map((p) => Number(p.amount));
      charts.drawLine(ctx, {
        width: w,
        height: h,
        values,
        color: this.data.type === 1 ? '#E78A82' : '#5DBE88',
      });
      this.updateCanvasImage(node, 'lineImageSrc');
    });
  },

  renderHeatmap() {
    this.withCanvas('#heatmap-canvas', (ctx, w, h, node) => {
      charts.drawHeatmap(ctx, {
        width: w,
        height: h,
        days: this.data._heatmapDays || [],
        color: this.data.type === 1 ? '#E78A82' : '#5DBE88',
      });
      this.updateCanvasImage(node, 'heatmapImageSrc');
    });
  },

  // ============ 分类详情弹层 ============

  async onRankTap(e) {
    if (this.data.level !== 2) {
      wx.showToast({ title: '一级分类暂不支持下钻，切换到二级看看', icon: 'none' });
      return;
    }
    const categoryId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    this.setData({ sheetVisible: true, sheetCategoryName: name, sheetBills: [], sheetLoading: true });

    const { period, type, year, month } = this.data;
    const params = { categoryId, type, pageSize: 200 };
    if (period === 'month') params.month = monthStr(year, month);
    else if (period === 'year') params.year = String(year);
    // period=all：不传时间字段

    try {
      const res = await billsService.getBills(params);
      const list = (res && res.list) || [];
      const bills = list.map((b) => ({
        id: b.id,
        amount: Number(b.amount).toFixed(2),
        billDate: String(b.billDate).slice(0, 10),
        categoryName: b.categoryName,
        categoryIcon: b.categoryIcon,
        accountName: b.accountName,
        remark: b.remark,
      }));
      this.setData({ sheetBills: bills });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ sheetLoading: false });
    }
  },

  closeSheet() {
    this.setData({ sheetVisible: false, sheetBills: [], sheetCategoryName: '' });
  },

  openBillDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/subpkg/bill-detail/index?id=${id}` });
  },

  goRecord() {
    wx.switchTab({ url: '/pages/bill/index' });
  },
});
