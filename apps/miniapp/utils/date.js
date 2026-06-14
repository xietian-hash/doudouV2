function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDate(date) {
  const value = date instanceof Date ? date : new Date(date);
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function formatMonth(date) {
  const value = date instanceof Date ? date : new Date(date);
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}`;
}

function formatDisplayDate(date) {
  const value = date instanceof Date ? date : new Date(date);
  const target = formatDate(value);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (target === formatDate(today)) return '今天';
  if (target === formatDate(yesterday)) return '昨天';
  return `${value.getMonth() + 1}月${value.getDate()}日`;
}

function formatDayOfWeek(date) {
  const value = date instanceof Date ? date : new Date(date);
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][value.getDay()];
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function buildCalendarDays(year, month) {
  const prefix = Array(getFirstDayOfWeek(year, month)).fill(null);
  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, index) => index + 1);
  return prefix.concat(days);
}

module.exports = {
  formatDate,
  formatDisplayDate,
  formatDayOfWeek,
  formatMonth,
  getDaysInMonth,
  getFirstDayOfWeek,
  buildCalendarDays,
};
