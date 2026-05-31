import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getCategories } from '../../services/categories';
import { getAccounts } from '../../services/accounts';
import { getTags } from '../../services/tags';
import { createBill, createBillBatch, updateBill } from '../../services/bills';
import { uploadAudioAndParse } from '../../services/voice';
import type { Category, Account, Tag, VoiceParsedBill } from '../../services/types';
import { formatDate, getDaysInMonth, getFirstDayOfWeek } from '../../utils/date';
import { showToast } from '../../utils/toast';
import NumKeyboard from '../../components/NumKeyboard';
import Drawer from '../../components/Drawer';
import Modal from '../../components/Modal';
import './index.scss';

type BillType = 1 | 2; // 1=支出 2=收入

interface ParsedItem extends VoiceParsedBill {
  _localId: string;
  accountId?: string;
  tagIds?: string[];
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function BillPage() {
  const [type, setType] = useState<BillType>(1);
  const [amount, setAmount] = useState('0');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [remark, setRemark] = useState('');
  const [billDate, setBillDate] = useState(formatDate(new Date()));
  const [saving, setSaving] = useState(false);

  // 抽屉控制
  const [showAccountDrawer, setShowAccountDrawer] = useState(false);
  const [showTagDrawer, setShowTagDrawer] = useState(false);
  const [showDateDrawer, setShowDateDrawer] = useState(false);
  const [showRemarkDrawer, setShowRemarkDrawer] = useState(false);

  // 日历选择器状态
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);

  // 语音相关
  const [recording, setRecording] = useState(false);
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [voiceParsedItems, setVoiceParsedItems] = useState<ParsedItem[]>([]);
  const [showVoiceConfirmDrawer, setShowVoiceConfirmDrawer] = useState(false);
  const recorderRef = useRef<Taro.RecorderManager | null>(null);

  // 编辑模式（从账单详情页跳转过来）
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    loadBaseData();
    checkEditMode();
    initRecorder();
  }, []);

  // 切换类型时重置分类
  useEffect(() => {
    setSelectedCat(null);
    loadCategories();
  }, [type]);

  async function loadBaseData() {
    try {
      const [accRes, tagRes] = await Promise.all([getAccounts(), getTags()]);
      setAccounts(accRes);
      const defaultAcc = accRes.find(a => a.isDefault) || accRes[0] || null;
      setSelectedAccount(defaultAcc);
      setTags(tagRes);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadCategories() {
    try {
      const cats = await getCategories({ type, onlyLeaf: true });
      // 按 lastUsedAt 降序排序
      const sorted = [...cats].sort((a, b) => {
        if (a.lastUsedAt && b.lastUsedAt) return b.lastUsedAt.localeCompare(a.lastUsedAt);
        if (a.lastUsedAt) return -1;
        if (b.lastUsedAt) return 1;
        return a.sort - b.sort;
      });
      setCategories(sorted);
      if (sorted.length > 0 && !selectedCat) {
        setSelectedCat(sorted[0]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function checkEditMode() {
    const pages = Taro.getCurrentPages();
    const curr = pages[pages.length - 1];
    const options = (curr as unknown as { options: Record<string, string> }).options;
    if (options?.editId) {
      setEditId(options.editId);
      if (options.type) setType(Number(options.type) as BillType);
      if (options.amount) setAmount(options.amount);
      if (options.billDate) setBillDate(options.billDate);
      if (options.remark) setRemark(decodeURIComponent(options.remark));
    }
  }

  function initRecorder() {
    const rm = Taro.getRecorderManager();
    recorderRef.current = rm;
    rm.onStop(async (res) => {
      setRecording(false);
      if (res.tempFilePath) {
        setVoiceParsing(true);
        try {
          const parsed = await uploadAudioAndParse(res.tempFilePath);
          const items: ParsedItem[] = parsed.map((p, i) => ({
            ...p,
            _localId: `voice_${Date.now()}_${i}`,
            accountId: selectedAccount?.id,
            tagIds: [],
          }));
          setVoiceParsedItems(items);
          setShowVoiceConfirmDrawer(true);
        } catch (e) {
          showToast('语音解析失败，请重试', 'error');
        } finally {
          setVoiceParsing(false);
        }
      }
    });
    rm.onError((err) => {
      setRecording(false);
      showToast('录音出错，请重试', 'error');
      console.error(err);
    });
  }

  const startRecording = () => {
    if (!recorderRef.current) return;
    setRecording(true);
    recorderRef.current.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3',
    });
  };

  const stopRecording = () => {
    if (!recorderRef.current || !recording) return;
    recorderRef.current.stop();
  };

  const handleSave = async () => {
    if (!selectedAccount) { showToast('请选择账户', 'error'); return; }
    if (!selectedCat) { showToast('请选择分类', 'error'); return; }
    if (!amount || amount === '0') { showToast('请输入金额', 'error'); return; }

    setSaving(true);
    try {
      const data = {
        accountId: selectedAccount.id,
        categoryId: selectedCat.id,
        type,
        amount,
        billDate,
        remark: remark || undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        source: 1,
      };

      if (editId) {
        await updateBill(editId, data);
        showToast('修改成功');
      } else {
        await createBill(data);
        showToast('记录成功');
      }

      // 重置表单
      setAmount('0');
      setRemark('');
      setSelectedTagIds([]);
      setBillDate(formatDate(new Date()));
      Taro.navigateBack({ delta: 1 }).catch(() => {
        Taro.switchTab({ url: '/pages/record/index' });
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleVoiceConfirm = async () => {
    if (voiceParsedItems.length === 0) return;
    if (!selectedAccount) { showToast('请先选择账户', 'error'); return; }
    setSaving(true);
    try {
      const items = voiceParsedItems.map(p => ({
        accountId: p.accountId || selectedAccount.id,
        categoryId: p.categoryId || '',
        type: p.type as 1 | 2,
        amount: p.amount,
        billDate: p.billDate || formatDate(new Date()),
        remark: p.remark || undefined,
        tagIds: p.tagIds,
        source: 2,
      })).filter(it => it.categoryId);

      if (items.length === 0) {
        showToast('请完善分类信息', 'error');
        return;
      }

      await createBillBatch(items);
      showToast('保存成功');
      setShowVoiceConfirmDrawer(false);
      setVoiceParsedItems([]);
      Taro.switchTab({ url: '/pages/record/index' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const removeVoiceItem = (localId: string) => {
    setVoiceParsedItems(prev => prev.filter(p => p._localId !== localId));
  };

  // 日期选择器
  const selectDate = (dateStr: string) => {
    setBillDate(dateStr);
    setShowDateDrawer(false);
  };

  const daysInCalMonth = getDaysInMonth(calYear, calMonth);
  const firstDayOfCalMonth = getFirstDayOfWeek(calYear, calMonth);
  const calendarDays: (number | null)[] = [
    ...Array(firstDayOfCalMonth).fill(null),
    ...Array.from({ length: daysInCalMonth }, (_, i) => i + 1),
  ];

  const toggleTag = (id: string) => {
    setSelectedTagIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectedTagNames = tags.filter(t => selectedTagIds.includes(t.id)).map(t => t.name);

  return (
    <View className='bill-page'>
      {/* 收支类型切换 */}
      <View className='type-switch'>
        <View
          className={`type-btn${type === 1 ? ' type-btn--active-expense' : ''}`}
          onClick={() => setType(1)}
        >
          <Text>支出</Text>
        </View>
        <View
          className={`type-btn${type === 2 ? ' type-btn--active-income' : ''}`}
          onClick={() => setType(2)}
        >
          <Text>收入</Text>
        </View>
      </View>

      {/* 金额显示区 */}
      <View className='amount-area'>
        <Text className='amount-prefix'>{type === 1 ? '-' : '+'}</Text>
        <Text className={`amount-value${amount === '0' ? ' amount-value--placeholder' : ''}`}>
          {amount === '0' ? '0.00' : amount}
        </Text>
        <Text className='amount-unit'>元</Text>
      </View>

      {/* 分类网格 */}
      <View className='cat-section'>
        <ScrollView scrollY className='cat-scroll'>
          <View className='cat-grid'>
            {categories.map(cat => (
              <View
                key={cat.id}
                className={`cat-item${selectedCat?.id === cat.id ? ' cat-item--active' : ''}`}
                onClick={() => setSelectedCat(cat)}
              >
                <Text className='cat-icon'>{cat.icon || '📁'}</Text>
                <Text className='cat-name'>{cat.name}</Text>
              </View>
            ))}
            <View
              className='cat-item cat-item--add'
              onClick={() => Taro.navigateTo({ url: '/subpkg/category-manage/index' })}
            >
              <Text className='cat-icon'>+</Text>
              <Text className='cat-name'>添加</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* 元信息行 */}
      <View className='meta-row'>
        <View className='meta-item' onClick={() => setShowAccountDrawer(true)}>
          <Text className='meta-label'>账户</Text>
          <Text className='meta-value'>{selectedAccount?.name || '选择账户'}</Text>
        </View>
        <View className='meta-divider' />
        <View className='meta-item' onClick={() => setShowTagDrawer(true)}>
          <Text className='meta-label'>标签</Text>
          <Text className='meta-value'>
            {selectedTagNames.length > 0 ? selectedTagNames.join('、') : '无'}
          </Text>
        </View>
        <View className='meta-divider' />
        <View className='meta-item' onClick={() => setShowDateDrawer(true)}>
          <Text className='meta-label'>日期</Text>
          <Text className='meta-value'>{billDate}</Text>
        </View>
        <View className='meta-divider' />
        <View className='meta-item' onClick={() => setShowRemarkDrawer(true)}>
          <Text className='meta-label'>备注</Text>
          <Text className='meta-value meta-value--remark'>
            {remark || '无'}
          </Text>
        </View>
      </View>

      {/* 语音按钮 */}
      <View className='voice-btn-wrap'>
        <View
          className={`voice-btn${recording ? ' voice-btn--recording' : ''}`}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
        >
          <Text className='voice-btn-icon'>🎤</Text>
          <Text className='voice-btn-text'>
            {recording ? '松开停止' : voiceParsing ? '解析中...' : '按住语音记账'}
          </Text>
        </View>
      </View>

      {/* 数字键盘 */}
      <NumKeyboard
        value={amount}
        onChange={setAmount}
        onConfirm={handleSave}
      />

      {/* 账户选择抽屉 */}
      <Drawer
        visible={showAccountDrawer}
        title='选择账户'
        onClose={() => setShowAccountDrawer(false)}
      >
        <View className='account-list'>
          {accounts.map(acc => (
            <View
              key={acc.id}
              className={`account-item${selectedAccount?.id === acc.id ? ' account-item--active' : ''}`}
              onClick={() => { setSelectedAccount(acc); setShowAccountDrawer(false); }}
            >
              <Text className='account-icon'>{acc.icon || '🏦'}</Text>
              <View className='account-info'>
                <Text className='account-name'>{acc.name}</Text>
                <Text className='account-balance'>余额 ¥{parseFloat(acc.balance).toFixed(2)}</Text>
              </View>
              {selectedAccount?.id === acc.id && <Text className='account-check'>✓</Text>}
            </View>
          ))}
        </View>
      </Drawer>

      {/* 标签选择抽屉 */}
      <Drawer
        visible={showTagDrawer}
        title='选择标签'
        onClose={() => setShowTagDrawer(false)}
        footer={
          <View
            className='drawer-confirm-btn'
            onClick={() => setShowTagDrawer(false)}
          >
            <Text>确定</Text>
          </View>
        }
      >
        <View className='tag-list'>
          {tags.length === 0 && (
            <View className='tag-empty'>
              <Text className='tag-empty-text'>暂无标签，请先在"我的"中添加</Text>
            </View>
          )}
          {tags.map(tag => (
            <View
              key={tag.id}
              className={`tag-item${selectedTagIds.includes(tag.id) ? ' tag-item--active' : ''}`}
              onClick={() => toggleTag(tag.id)}
            >
              <Text>{tag.name}</Text>
            </View>
          ))}
        </View>
      </Drawer>

      {/* 日期选择抽屉 */}
      <Drawer
        visible={showDateDrawer}
        title='选择日期'
        onClose={() => setShowDateDrawer(false)}
        height='70vh'
      >
        <View className='date-picker'>
          <View className='date-picker-header'>
            <View
              className='date-picker-nav'
              onClick={() => {
                if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
                else setCalMonth(m => m - 1);
              }}
            >
              <Text>‹</Text>
            </View>
            <Text className='date-picker-title'>{calYear}年{calMonth}月</Text>
            <View
              className='date-picker-nav'
              onClick={() => {
                if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
                else setCalMonth(m => m + 1);
              }}
            >
              <Text>›</Text>
            </View>
          </View>
          <View className='date-picker-weekdays'>
            {WEEKDAYS.map(w => <Text key={w} className='date-picker-wd'>{w}</Text>)}
          </View>
          <View className='date-picker-days'>
            {calendarDays.map((day, idx) => {
              if (!day) return <View key={`empty-${idx}`} className='date-picker-day' />;
              const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = billDate === dateStr;
              const isToday = dateStr === formatDate(new Date());
              return (
                <View
                  key={dateStr}
                  className={`date-picker-day${isSelected ? ' date-picker-day--selected' : ''}${isToday ? ' date-picker-day--today' : ''}`}
                  onClick={() => selectDate(dateStr)}
                >
                  <Text className='date-picker-day-num'>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </Drawer>

      {/* 备注输入抽屉 */}
      <Drawer
        visible={showRemarkDrawer}
        title='添加备注'
        onClose={() => setShowRemarkDrawer(false)}
        footer={
          <View
            className='drawer-confirm-btn'
            onClick={() => setShowRemarkDrawer(false)}
          >
            <Text>确定</Text>
          </View>
        }
      >
        <View className='remark-input-wrap'>
          <Input
            className='remark-input'
            value={remark}
            onInput={e => setRemark(e.detail.value)}
            placeholder='写点什么...'
            maxlength={100}
            focus={showRemarkDrawer}
          />
          <Text className='remark-count'>{remark.length}/100</Text>
        </View>
      </Drawer>

      {/* 语音解析结果确认抽屉 */}
      <Drawer
        visible={showVoiceConfirmDrawer}
        title='确认记账'
        onClose={() => setShowVoiceConfirmDrawer(false)}
        height='75vh'
        footer={
          <View className='voice-confirm-footer'>
            <View
              className='voice-cancel-btn'
              onClick={() => { setShowVoiceConfirmDrawer(false); setVoiceParsedItems([]); }}
            >
              <Text>取消</Text>
            </View>
            <View
              className={`voice-save-btn${saving ? ' voice-save-btn--disabled' : ''}`}
              onClick={handleVoiceConfirm}
            >
              <Text>{saving ? '保存中...' : `确认保存 (${voiceParsedItems.length}笔)`}</Text>
            </View>
          </View>
        }
      >
        <ScrollView scrollY style={{ maxHeight: '400rpx' }}>
          {voiceParsedItems.map(item => (
            <View key={item._localId} className='voice-item'>
              <View className='voice-item-info'>
                <Text className='voice-item-cat'>
                  {item.categoryIcon || '📁'} {item.categoryName || '未知分类'}
                </Text>
                <Text className='voice-item-amount'>
                  {item.type === 1 ? '-' : '+'}{parseFloat(item.amount).toFixed(2)}
                </Text>
              </View>
              {item.remark && (
                <Text className='voice-item-remark'>{item.remark}</Text>
              )}
              {item.needsConfirm && (
                <Text className='voice-item-warn'>⚠ 需确认</Text>
              )}
              <View className='voice-item-delete' onClick={() => removeVoiceItem(item._localId)}>
                <Text>✕</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </Drawer>

      {/* 录音中遮罩 */}
      {recording && (
        <View className='recording-mask'>
          <View className='recording-box'>
            <Text className='recording-icon'>🎤</Text>
            <Text className='recording-text'>正在录音...</Text>
            <Text className='recording-hint'>松开手指完成录音</Text>
          </View>
        </View>
      )}
    </View>
  );
}
