import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getBills, getCalendarSummary } from '../../services/bills';
import type { Bill, CalendarSummaryItem } from '../../services/types';
import { formatDate, getDaysInMonth, getFirstDayOfWeek } from '../../utils/date';
import { formatAmount } from '../../utils/format';
import BottomNav from '../../components/BottomNav';
import './index.scss';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

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

  Taro.useDidShow(() => { loadData(); });

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  const toggleDate = (dateStr: string) => {
    setSelectedDate(prev => prev === dateStr ? null : dateStr);
  };

  // 按日期分组账单
  const grouped = bills.reduce<Record<string, Bill[]>>((acc, b) => {
    const d = b.billDate.slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(b);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const summaryMap = summary.reduce<Record<string, CalendarSummaryItem>>((acc, s) => {
    acc[s.date] = s;
    return acc;
  }, {});

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const calendarDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayStr = formatDate(new Date());
  const totalExpense = bills.filter(b => b.type === 1).reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalIncome = bills.filter(b => b.type === 2).reduce((s, b) => s + parseFloat(b.amount), 0);

  return (
    <View className='record-page'>
      {/* 月份导航头部 */}
      <View className='month-header'>
        <View className='month-nav' onClick={prevMonth}>
          <Text className='month-nav-icon'>‹</Text>
        </View>
        <View className='month-title'>
          <Text className='month-text'>{year}年{month}月</Text>
          <Text className='month-summary'>
            支出 ¥{totalExpense.toFixed(2)} · 收入 ¥{totalIncome.toFixed(2)}
          </Text>
        </View>
        <View className='month-nav' onClick={nextMonth}>
          <Text className='month-nav-icon'>›</Text>
        </View>
      </View>

      {/* 日历 */}
      <View className='calendar'>
        <View className='cal-weekdays'>
          {WEEKDAYS.map(w => <Text key={w} className='cal-wd'>{w}</Text>)}
        </View>
        <View className='cal-days'>
          {calendarDays.map((day, idx) => {
            if (!day) return <View key={`empty-${idx}`} className='cal-day cal-day--empty' />;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const s = summaryMap[dateStr];
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === todayStr;
            return (
              <View
                key={dateStr}
                className={`cal-day${isSelected ? ' cal-day--selected' : ''}${isToday ? ' cal-day--today' : ''}`}
                onClick={() => toggleDate(dateStr)}
              >
                <Text className='cal-day-num'>{day}</Text>
                {s && parseFloat(s.expenseAmount) > 0 && (
                  <Text className='cal-amount cal-amount--expense'>
                    {parseFloat(s.expenseAmount).toFixed(0)}
                  </Text>
                )}
                {s && parseFloat(s.incomeAmount) > 0 && (
                  <Text className='cal-amount cal-amount--income'>
                    {parseFloat(s.incomeAmount).toFixed(0)}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* 账单列表 */}
      <ScrollView scrollY className='bill-list'>
        {sortedDates.length === 0 && !loading && (
          <View className='empty'>
            <Text className='empty-icon'>📭</Text>
            <Text className='empty-text'>暂无账单</Text>
          </View>
        )}
        {sortedDates.map(date => {
          const dayBills = grouped[date];
          const dayExpense = dayBills.filter(b => b.type === 1).reduce((s, b) => s + parseFloat(b.amount), 0);
          const dayIncome = dayBills.filter(b => b.type === 2).reduce((s, b) => s + parseFloat(b.amount), 0);
          const [, mm, dd] = date.split('-');
          return (
            <View key={date} className='bill-group'>
              <View className='bill-group-header'>
                <Text className='group-date'>{mm}/{dd}</Text>
                <View className='group-summary'>
                  {dayExpense > 0 && <Text className='group-expense'>支 {dayExpense.toFixed(2)}</Text>}
                  {dayIncome > 0 && <Text className='group-income'>收 {dayIncome.toFixed(2)}</Text>}
                </View>
              </View>
              {dayBills.map(bill => (
                <View
                  key={bill.id}
                  className='bill-item'
                  onClick={() => Taro.navigateTo({ url: `/subpkg/bill-detail/index?id=${bill.id}` })}
                >
                  <View className='bill-icon-wrap'>
                    <Text className='bill-icon'>{bill.categoryIcon || '📁'}</Text>
                  </View>
                  <View className='bill-info'>
                    <Text className='bill-cat'>{bill.categoryName}</Text>
                    {bill.remark && <Text className='bill-remark'>{bill.remark}</Text>}
                    <Text className='bill-account'>{bill.accountName}</Text>
                  </View>
                  <Text className={`bill-amount${bill.type === 2 ? ' bill-amount--income' : ''}`}>
                    {bill.type === 1 ? '-' : '+'}{formatAmount(bill.amount)}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
        <View style={{ height: '160rpx' }} />
      </ScrollView>

      <BottomNav />
    </View>
  );
}
