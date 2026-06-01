import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getBills, getCalendarSummary } from '../../services/bills';
import type { Bill, CalendarSummaryItem } from '../../services/types';
import { formatDate, getDaysInMonth, getFirstDayOfWeek } from '../../utils/date';
import { formatAmount } from '../../utils/format';
import './index.scss';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export default function RecordPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [summary, setSummary] = useState<CalendarSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [billRes, summaryRes] = await Promise.all([
        getBills({
          month: selectedDate ? undefined : monthStr,
          date: selectedDate || undefined,
          pageSize: 200,
        }),
        getCalendarSummary(monthStr),
      ]);
      setBills(billRes.list);
      setSummary(summaryRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [monthStr, selectedDate]);

  useEffect(() => { loadData(); }, [loadData]);
  Taro.useDidShow(() => {
    Taro.eventCenter.trigger('tabBar:sync', 'record');
    Taro.eventCenter.trigger('tabBar:show');
    loadData();
  });

  const changeMonth = (step: number) => {
    const next = new Date(year, month - 1 + step, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
    setSelectedDate(null);
  };

  const grouped = bills.reduce<Record<string, Bill[]>>((acc, bill) => {
    const date = bill.billDate.slice(0, 10);
    if (!acc[date]) acc[date] = [];
    acc[date].push(bill);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const summaryMap = summary.reduce<Record<string, CalendarSummaryItem>>((acc, item) => {
    acc[item.date] = item;
    return acc;
  }, {});

  const calendarDays: (number | null)[] = [
    ...Array(getFirstDayOfWeek(year, month)).fill(null),
    ...Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1),
  ];

  const todayStr = formatDate(new Date());
  const totalExpense = bills
    .filter(bill => bill.type === 1)
    .reduce((sum, bill) => sum + Number(bill.amount), 0);
  const todayExpense = bills
    .filter(bill => bill.type === 1 && bill.billDate.slice(0, 10) === todayStr)
    .reduce((sum, bill) => sum + Number(bill.amount), 0);

  return (
    <View className='record-page'>
      <View className='record-content'>
        <View className='month-header'>
          <View className='month-nav' onClick={() => changeMonth(-1)}>
            <Text className='month-nav-icon'>‹</Text>
          </View>
          <View className='month-title'>
            <Text className='month-text'>{year}年{month}月</Text>
            <Text className='month-subtitle'>{selectedDate ? '已筛选单日账单' : '每一笔都是生活的印记'}</Text>
          </View>
          <View className='month-nav' onClick={() => changeMonth(1)}>
            <Text className='month-nav-icon'>›</Text>
          </View>
        </View>

        <View className='summary-row'>
          <View className='summary-card'>
            <View className='summary-card-top'>
              <Text className='summary-card-label'>今日支出</Text>
              <View className='summary-badge summary-badge--expense'>
                <Text className='summary-badge-icon'>☀️</Text>
              </View>
            </View>
            <Text className='summary-card-amount summary-card-amount--expense'>¥{todayExpense.toFixed(2)}</Text>
          </View>
          <View className='summary-card'>
            <View className='summary-card-top'>
              <Text className='summary-card-label'>本月支出</Text>
              <View className='summary-badge summary-badge--expense'>
                <Text className='summary-badge-icon'>🌿</Text>
              </View>
            </View>
            <Text className='summary-card-amount summary-card-amount--expense'>¥{totalExpense.toFixed(2)}</Text>
          </View>
        </View>

        <View className='calendar-card'>
          <View className='cal-weekdays'>
            {WEEKDAYS.map(day => <Text key={day} className='cal-wd'>{day}</Text>)}
          </View>
          <View className='cal-days'>
            {calendarDays.map((day, idx) => {
              if (!day) return <View key={`empty-${idx}`} className='cal-day cal-day--empty' />;
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const item = summaryMap[dateStr];
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === todayStr;
              const expense = Number(item?.expenseAmount || 0);
              const income = Number(item?.incomeAmount || 0);

              return (
                <View
                  key={dateStr}
                  className={`cal-day${isSelected ? ' cal-day--selected' : ''}${isToday ? ' cal-day--today' : ''}`}
                  onClick={() => setSelectedDate(prev => prev === dateStr ? null : dateStr)}
                >
                  <Text className='cal-day-num'>{day}</Text>
                  {expense > 0 && <Text className='cal-amount cal-amount--expense'>-{expense.toFixed(0)}</Text>}
                  {income > 0 && <Text className='cal-amount cal-amount--income'>+{income.toFixed(0)}</Text>}
                </View>
              );
            })}
          </View>
        </View>

        <ScrollView scrollY className='bill-list'>
          {sortedDates.length === 0 && !loading && (
            <View className='empty'>
              <Text className='empty-icon'>□</Text>
              <Text className='empty-text'>暂无账单</Text>
            </View>
          )}
          {sortedDates.map(date => {
            const dayBills = grouped[date];
            const dayExpense = dayBills
              .filter(bill => bill.type === 1)
              .reduce((sum, bill) => sum + Number(bill.amount), 0);
            const dayIncome = dayBills
              .filter(bill => bill.type === 2)
              .reduce((sum, bill) => sum + Number(bill.amount), 0);
            const [, mm, dd] = date.split('-');

            return (
              <View key={date} className='bill-group'>
                <View className='bill-group-header'>
                  <Text className='group-date'>{mm}月{dd}日</Text>
                  <View className='group-summary'>
                    {dayExpense > 0 && <Text className='group-expense'>支出 ¥{dayExpense.toFixed(2)}</Text>}
                    {dayIncome > 0 && <Text className='group-income'>收入 ¥{dayIncome.toFixed(2)}</Text>}
                  </View>
                </View>
                {dayBills.map(bill => (
                  <View
                    key={bill.id}
                    className='bill-item'
                    onClick={() => Taro.navigateTo({ url: `/subpkg/bill-detail/index?id=${bill.id}` })}
                  >
                    <View className='bill-icon-wrap'>
                      <Text className='bill-icon'>{bill.categoryIcon || '□'}</Text>
                    </View>
                    <View className='bill-info'>
                      <Text className='bill-cat'>{bill.categoryName}</Text>
                      <Text className='bill-meta'>{bill.remark || bill.accountName}</Text>
                      {bill.remark && <Text className='bill-account'>{bill.accountName}</Text>}
                    </View>
                    <Text className={`bill-amount${bill.type === 2 ? ' bill-amount--income' : ''}`}>
                      {bill.type === 1 ? '-' : '+'}{formatAmount(bill.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}
          <View className='list-spacer' />
        </ScrollView>
      </View>

    </View>
  );
}
