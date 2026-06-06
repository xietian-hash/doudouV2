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
  formatMonth,
  getDaysInMonth,
  getFirstDayOfWeek,
  buildCalendarDays,
};
