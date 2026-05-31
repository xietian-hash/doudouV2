import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getCategories, createCategory } from '../../services/categories';
import { getAccounts } from '../../services/accounts';
import { getTags, createTag } from '../../services/tags';
import { createBill, createBillBatch, updateBill } from '../../services/bills';
import { uploadAudioAndParse } from '../../services/voice';
import type { Category, Account, Tag, VoiceParsedBill, BillDetail } from '../../services/types';
import { formatDate, getDaysInMonth, getFirstDayOfWeek } from '../../utils/date';
import { showToast } from '../../utils/toast';
import NumKeyboard from '../../components/NumKeyboard';
import Drawer from '../../components/Drawer';
import Modal from '../../components/Modal';
import BottomNav from '../../components/BottomNav';
import './index.scss';

type BillType = 1 | 2;

interface ParsedItem extends VoiceParsedBill {
  _localId: string;
  accountId?: string;
  tagIds?: string[];
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export default function BillPage() {
  const [type, setType] = useState<BillType>(1);
  const [amount, setAmount] = useState('0');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [remark, setRemark] = useState('');
  const [billDate, setBillDate] = useState(formatDate(new Date()));
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [showAccountDrawer, setShowAccountDrawer] = useState(false);
  const [showTagDrawer, setShowTagDrawer] = useState(false);
  const [showDateDrawer, setShowDateDrawer] = useState(false);
  const [showRemarkDrawer, setShowRemarkDrawer] = useState(false);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [showNewTagDrawer, setShowNewTagDrawer] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [showAddSubCatDialog, setShowAddSubCatDialog] = useState(false);
  const [addSubCatParentId, setAddSubCatParentId] = useState<string | null>(null);
  const [addSubCatParentName, setAddSubCatParentName] = useState('');
  const [newSubCatName, setNewSubCatName] = useState('');
  const [submittingSubCat, setSubmittingSubCat] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);

  const [recording, setRecording] = useState(false);
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [voiceParsedItems, setVoiceParsedItems] = useState<ParsedItem[]>([]);
  const [showVoiceConfirmDrawer, setShowVoiceConfirmDrawer] = useState(false);
  const recorderRef = useRef<Taro.RecorderManager | null>(null);

  useEffect(() => {
    loadBaseData();
    initRecorder();
    loadEditDraft();
  }, []);

  useEffect(() => {
    loadCategories();
  }, [type]);

  async function loadBaseData() {
    try {
      const [accRes, tagRes] = await Promise.all([getAccounts(), getTags()]);
      setAccounts(accRes);
      setSelectedAccount(accRes.find(item => item.isDefault) || accRes[0] || null);
      setTags(tagRes);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadCategories() {
    try {
      const [cats, tree] = await Promise.all([
        getCategories({ type, onlyLeaf: true }),
        getCategories({ type }),
      ]);
      const sorted = [...cats].sort((a, b) => {
        if (a.lastUsedAt && b.lastUsedAt) return b.lastUsedAt.localeCompare(a.lastUsedAt);
        if (a.lastUsedAt) return -1;
        if (b.lastUsedAt) return 1;
        return a.sort - b.sort;
      });
      setCategories(sorted);
      setCategoryTree(tree);
      setSelectedCat(prev => {
        if (prev && prev.type === type && sorted.some(cat => cat.id === prev.id)) return prev;
        return sorted[0] || null;
      });
    } catch (e) {
      console.error(e);
    }
  }

  function loadEditDraft() {
    const draft = Taro.getStorageSync<BillDetail | ''>('editBillDraft');
    if (!draft) return;
    Taro.removeStorageSync('editBillDraft');
    setEditId(draft.id);
    setType(draft.type as BillType);
    setAmount(draft.amount);
    setBillDate(draft.billDate.slice(0, 10));
    setRemark(draft.remark || '');
    setSelectedTagIds(draft.tags?.map(tag => tag.id) || []);
  }

  function initRecorder() {
    const rm = Taro.getRecorderManager();
    recorderRef.current = rm;
    rm.onStop(async (res) => {
      setRecording(false);
      if (!res.tempFilePath) return;
      setVoiceParsing(true);
      try {
        const parsed = await uploadAudioAndParse(res.tempFilePath);
        const items = parsed.map((item, index) => ({
          ...item,
          _localId: `voice_${Date.now()}_${index}`,
          accountId: selectedAccount?.id,
          tagIds: [],
        }));
        setVoiceParsedItems(items);
        setShowVoiceConfirmDrawer(true);
      } catch (e) {
        console.error(e);
        showToast('语音解析失败，请重试', 'error');
      } finally {
        setVoiceParsing(false);
      }
    });
    rm.onError((err) => {
      setRecording(false);
      console.error(err);
      showToast('录音失败，请重试', 'error');
    });
  }

  const startRecording = () => {
    if (!recorderRef.current || voiceParsing) return;
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
        showToast('记账成功');
      }
      resetForm();
      Taro.switchTab({ url: '/pages/record/index' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setAmount('0');
    setRemark('');
    setSelectedTagIds([]);
    setBillDate(formatDate(new Date()));
  };

  const handleVoiceConfirm = async () => {
    if (!selectedAccount) { showToast('请先选择账户', 'error'); return; }
    const items = voiceParsedItems
      .map(item => ({
        accountId: item.accountId || selectedAccount.id,
        categoryId: item.categoryId || '',
        type: item.type as BillType,
        amount: item.amount,
        billDate: item.billDate || formatDate(new Date()),
        remark: item.remark || undefined,
        tagIds: item.tagIds,
        source: 2,
      }))
      .filter(item => item.categoryId);

    if (items.length === 0) {
      showToast('请先完善分类信息', 'error');
      return;
    }

    setSaving(true);
    try {
      await createBillBatch(items);
      showToast('保存成功');
      setVoiceParsedItems([]);
      setShowVoiceConfirmDrawer(false);
      Taro.switchTab({ url: '/pages/record/index' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) { showToast('请输入标签名称', 'error'); return; }
    if (tags.some(tag => tag.name === name)) { showToast('标签名称已存在', 'error'); return; }
    try {
      const tag = await createTag(name);
      setTags(prev => [...prev, tag]);
      setSelectedTagIds([tag.id]);
      setNewTagName('');
      setShowNewTagDrawer(false);
      setShowTagDrawer(false);
      showToast('标签已创建');
    } catch (e) {
      console.error(e);
    }
  };

  const selectDate = (dateStr: string) => {
    setBillDate(dateStr);
    setShowDateDrawer(false);
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds(prev => prev.includes(id) ? [] : [id]);
  };

  const openCategoryDrawer = () => {
    Taro.eventCenter.trigger('tabBar:hide');
    setShowCategoryDrawer(true);
  };

  const closeCategoryDrawer = () => {
    setShowCategoryDrawer(false);
    Taro.eventCenter.trigger('tabBar:show');
  };

  const selectCategory = (cat: Category) => {
    setSelectedCat(cat);
    closeCategoryDrawer();
  };

  const selectedTagNames = tags.filter(tag => selectedTagIds.includes(tag.id)).map(tag => tag.name);
  const hasMoreCategories = categories.length > 24;
  const displayCategories = hasMoreCategories ? categories.slice(0, 23) : categories.slice(0, 24);
  const categorySections = (() => {
    const usedIds = new Set<string>();
    const sections = categoryTree
      .filter(parent => !parent.parentId && parent.children?.length)
      .map(parent => {
        const items = (parent.children || [])
          .filter(child => categories.some(cat => cat.id === child.id))
          .sort((a, b) => a.sort - b.sort);
        items.forEach(item => usedIds.add(item.id));
        return { title: parent.name, parentId: parent.id, items };
      })
      .filter(section => section.items.length > 0);
    const rest = categories.filter(cat => !usedIds.has(cat.id));
    if (rest.length > 0) sections.push({ title: '其他', parentId: undefined as string | undefined, items: rest });
    return sections.length > 0 ? sections : [{ title: '分类', parentId: undefined as string | undefined, items: categories }];
  })();

  const openAddSubCat = (parentId: string, parentName: string) => {
    setAddSubCatParentId(parentId);
    setAddSubCatParentName(parentName);
    setNewSubCatName('');
    setShowAddSubCatDialog(true);
  };

  const handleAddSubCat = async () => {
    const name = newSubCatName.trim();
    if (!name) { showToast('请输入分类名称', 'error'); return; }
    if (!addSubCatParentId) return;
    setSubmittingSubCat(true);
    try {
      await createCategory({ name, type, parentId: addSubCatParentId });
      setShowAddSubCatDialog(false);
      setNewSubCatName('');
      await loadCategories();
      showToast('分类已添加');
    } catch (e) {
      console.error(e);
      showToast('添加失败，请重试', 'error');
    } finally {
      setSubmittingSubCat(false);
    }
  };
  const categoryLabel = selectedCat?.name || '选择分类';
  const categoryIcon = selectedCat?.icon || '📝';
  const displayDate = (() => {
    const [, m, d] = billDate.split('-');
    return m && d ? `${Number(m)}月${Number(d)}日` : billDate;
  })();
  const calendarDays: (number | null)[] = [
    ...Array(getFirstDayOfWeek(calYear, calMonth)).fill(null),
    ...Array.from({ length: getDaysInMonth(calYear, calMonth) }, (_, i) => i + 1),
  ];

  return (
    <View className='bill-page'>
      <View className='type-switch'>
        <View className={`type-btn${type === 1 ? ' type-btn--active-expense' : ''}`} onClick={() => setType(1)}>
          <Text className='type-text'>支出</Text>
          {type === 1 && <View className='type-underline' />}
        </View>
        <View className={`type-btn${type === 2 ? ' type-btn--active-income' : ''}`} onClick={() => setType(2)}>
          <Text className='type-text'>收入</Text>
          {type === 2 && <View className='type-underline' />}
        </View>
      </View>

      <View className='amount-category-row'>
        <View className='amount-display'>
          <Text className='amount-unit'>¥</Text>
          <Text className={`amount-value${amount === '0' ? ' amount-value--placeholder' : ''}`}>
            {amount === '0' ? '0.00' : amount}
          </Text>
        </View>
        <View className='selected-category' onClick={() => openCategoryDrawer()}>
          <View className='selected-category-icon'>
            <Text>{categoryIcon}</Text>
          </View>
          <View className='selected-category-text'>
            <Text>{categoryLabel} ▾</Text>
          </View>
        </View>
      </View>

      <ScrollView scrollY className='cat-scroll-area'>
        <View className='cat-grid-card'>
          <View className='cat-grid'>
            {displayCategories.map(cat => (
              <View
                key={cat.id}
                className={`cat-item${selectedCat?.id === cat.id ? ' cat-item--active' : ''}`}
                onClick={() => setSelectedCat(cat)}
              >
                <Text className='cat-icon'>{cat.icon || '📝'}</Text>
                <Text className='cat-name'>{cat.name}</Text>
              </View>
            ))}
            {categories.length === 0 && (
              <View className='cat-empty' onClick={() => Taro.navigateTo({ url: '/subpkg/category-manage/index' })}>
                <Text className='cat-empty-icon'>＋</Text>
                <Text className='cat-empty-text'>添加分类</Text>
              </View>
            )}
            {hasMoreCategories && (
              <View className='cat-item cat-item--add' onClick={() => openCategoryDrawer()}>
                <Text className='cat-icon'>＋</Text>
                <Text className='cat-name'>更多</Text>
              </View>
            )}
            {categories.length > 0 && categories.length < 24 && (
              <View className='cat-item cat-item--add' onClick={() => Taro.navigateTo({ url: '/subpkg/category-manage/index' })}>
                <Text className='cat-icon'>＋</Text>
                <Text className='cat-name'>添加</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View className='bill-bottom-bar'>
        <View className='meta-row'>
          <View className='meta-pill' onClick={() => setShowAccountDrawer(true)}>
            <Text className='meta-icon'>▣</Text>
            <Text className='meta-value'>{selectedAccount?.name || '选择账户'}</Text>
            <Text className='meta-chev'>⌄</Text>
          </View>
          <View className='meta-pill' onClick={() => setShowTagDrawer(true)}>
            <Text className='meta-icon'>⌗</Text>
            <Text className='meta-value'>{selectedTagNames[0] || '标签'}</Text>
          </View>
          <View className='meta-pill' onClick={() => setShowDateDrawer(true)}>
            <Text className='meta-icon'>□</Text>
            <Text className='meta-value'>{displayDate}</Text>
          </View>
          <View className='meta-pill meta-pill--remark' onClick={() => setShowRemarkDrawer(true)}>
            <Text className='meta-icon'>✎</Text>
            <Text className='meta-value'>{remark || '备注'}</Text>
          </View>
        </View>
        <NumKeyboard value={amount} onChange={setAmount} onConfirm={handleSave} />
      </View>

      <BottomNav
        centerBusy={voiceParsing}
        onCenterTouchStart={startRecording}
        onCenterTouchEnd={stopRecording}
      />

      {showCategoryDrawer && (
        <View className='category-sheet-mask' onClick={() => closeCategoryDrawer()}>
          <View className='category-sheet' onClick={e => e.stopPropagation()}>
            <View className='category-sheet-handle-wrap'>
              <View className='category-sheet-handle' />
            </View>
            <View className='category-sheet-title-row'>
              <Text className='category-sheet-title'>选择分类</Text>
              <Text className='category-sheet-close' onClick={() => closeCategoryDrawer()}>×</Text>
            </View>
            <ScrollView scrollY className='category-sheet-scroll'>
              {categorySections.map(section => (
                <View key={section.title} className='category-section'>
                  <View className='category-section-header'>
                    <Text className='category-section-title'>{section.title}</Text>
                    <View className='category-section-line' />
                  </View>
                  <View className='category-section-grid'>
                    {section.items.map(cat => (
                      <View
                        key={cat.id}
                        className={`category-section-item${selectedCat?.id === cat.id ? ' category-section-item--active' : ''}`}
                        onClick={() => selectCategory(cat)}
                      >
                        <Text className='category-section-icon'>{cat.icon || '📝'}</Text>
                        <Text className='category-section-name'>{cat.name}</Text>
                      </View>
                    ))}
                    {section.parentId && (
                      <View
                        className='category-section-item category-section-item--add'
                        onClick={() => openAddSubCat(section.parentId!, section.title)}
                      >
                        <Text className='category-section-add-icon'>＋</Text>
                        <Text className='category-section-name'>添加</Text>
                      </View>
                    )}
                    {section.parentId && (4 - ((section.items.length + 1) % 4)) % 4 >= 1 && (
                      <View className='category-section-empty' />
                    )}
                    {section.parentId && (4 - ((section.items.length + 1) % 4)) % 4 >= 2 && (
                      <View className='category-section-empty' />
                    )}
                    {section.parentId && (4 - ((section.items.length + 1) % 4)) % 4 >= 3 && (
                      <View className='category-section-empty' />
                    )}
                  </View>
                </View>
              ))}
              <View className='category-section-grid category-section-grid--last'>
                <View className='category-section-item category-section-item--add' onClick={() => Taro.navigateTo({ url: '/subpkg/category-manage/index' })}>
                  <Text className='category-section-add-icon'>＋</Text>
                  <Text className='category-section-name'>添加</Text>
                </View>
                <View className='category-section-empty' />
                <View className='category-section-empty' />
                <View className='category-section-empty' />
              </View>
            </ScrollView>
            <View className='category-sheet-footer'>
              <View className='category-sheet-cancel' onClick={() => closeCategoryDrawer()}>
                <Text>取消</Text>
              </View>
              <View className='category-sheet-manage' onClick={() => Taro.navigateTo({ url: '/subpkg/category-manage/index' })}>
                <Text>管理分类</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <Modal
        visible={showAddSubCatDialog}
        title='添加二级分类'
        cancelText='取消'
        confirmText={submittingSubCat ? '添加中...' : '确认'}
        onCancel={() => setShowAddSubCatDialog(false)}
        onConfirm={handleAddSubCat}
      >
        <View className='add-subcat-form'>
          <View className='add-subcat-field'>
            <Text className='add-subcat-label'>分类名称</Text>
            <View className='add-subcat-input-wrap'>
              <Input
                className='add-subcat-input'
                value={newSubCatName}
                onInput={e => setNewSubCatName(e.detail.value)}
                placeholder='请输入分类名称'
                maxlength={10}
              />
            </View>
          </View>
          <View className='add-subcat-field'>
            <Text className='add-subcat-label'>所属分类</Text>
            <View className='add-subcat-parent-display'>
              <Text className='add-subcat-parent-text'>{addSubCatParentName}</Text>
              <Text className='add-subcat-chevron'>⌄</Text>
            </View>
          </View>
        </View>
      </Modal>

      <Drawer visible={showAccountDrawer} title='选择账户' onClose={() => setShowAccountDrawer(false)}>
        <View className='account-list'>
          {accounts.map(acc => (
            <View
              key={acc.id}
              className={`account-item${selectedAccount?.id === acc.id ? ' account-item--active' : ''}`}
              onClick={() => { setSelectedAccount(acc); setShowAccountDrawer(false); }}
            >
              <Text className='account-icon'>{acc.icon || '□'}</Text>
              <View className='account-info'>
                <Text className='account-name'>{acc.name}</Text>
                <Text className='account-balance'>余额 ¥{Number(acc.balance).toFixed(2)}</Text>
              </View>
              {selectedAccount?.id === acc.id && <Text className='account-check'>✓</Text>}
            </View>
          ))}
        </View>
      </Drawer>

      <Drawer
        visible={showTagDrawer}
        title='选择标签'
        onClose={() => setShowTagDrawer(false)}
        footer={
          <View className='voice-confirm-footer'>
            <View className='voice-cancel-btn' onClick={() => setShowNewTagDrawer(true)}>
              <Text>新建标签</Text>
            </View>
            <View className='voice-save-btn' onClick={() => setShowTagDrawer(false)}>
              <Text>完成</Text>
            </View>
          </View>
        }
      >
        <View className='tag-list'>
          <View className={`tag-item${selectedTagIds.length === 0 ? ' tag-item--active' : ''}`} onClick={() => setSelectedTagIds([])}>
            <Text>不选择标签</Text>
          </View>
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

      <Drawer visible={showNewTagDrawer} title='新建标签' onClose={() => setShowNewTagDrawer(false)} footer={
        <View className='drawer-confirm-btn' onClick={handleCreateTag}><Text>保存</Text></View>
      }>
        <View className='remark-input-wrap'>
          <Input
            className='remark-input'
            value={newTagName}
            onInput={e => setNewTagName(e.detail.value)}
            placeholder='输入标签名称'
            maxlength={10}
            focus={showNewTagDrawer}
          />
        </View>
      </Drawer>

      <Drawer visible={showDateDrawer} title='选择日期' onClose={() => setShowDateDrawer(false)} height='70vh'>
        <View className='date-picker'>
          <View className='date-picker-header'>
            <View className='date-picker-nav' onClick={() => {
              if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
              else setCalMonth(m => m - 1);
            }}>
              <Text>‹</Text>
            </View>
            <Text className='date-picker-title'>{calYear}年{calMonth}月</Text>
            <View className='date-picker-nav' onClick={() => {
              if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
              else setCalMonth(m => m + 1);
            }}>
              <Text>›</Text>
            </View>
          </View>
          <View className='date-picker-weekdays'>
            {WEEKDAYS.map(day => <Text key={day} className='date-picker-wd'>{day}</Text>)}
          </View>
          <View className='date-picker-days'>
            {calendarDays.map((day, idx) => {
              if (!day) return <View key={`empty-${idx}`} className='date-picker-day' />;
              const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              return (
                <View
                  key={dateStr}
                  className={`date-picker-day${billDate === dateStr ? ' date-picker-day--selected' : ''}${dateStr === formatDate(new Date()) ? ' date-picker-day--today' : ''}`}
                  onClick={() => selectDate(dateStr)}
                >
                  <Text className='date-picker-day-num'>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </Drawer>

      <Drawer visible={showRemarkDrawer} title='添加备注' onClose={() => setShowRemarkDrawer(false)} footer={
        <View className='drawer-confirm-btn' onClick={() => setShowRemarkDrawer(false)}><Text>完成</Text></View>
      }>
        <View className='remark-input-wrap'>
          <Input
            className='remark-input'
            value={remark}
            onInput={e => setRemark(e.detail.value)}
            placeholder='写点备注'
            maxlength={100}
            focus={showRemarkDrawer}
          />
          <Text className='remark-count'>{remark.length}/100</Text>
        </View>
      </Drawer>

      <Drawer
        visible={showVoiceConfirmDrawer}
        title='确认记账'
        onClose={() => setShowVoiceConfirmDrawer(false)}
        height='75vh'
        footer={
          <View className='voice-confirm-footer'>
            <View className='voice-cancel-btn' onClick={() => { setShowVoiceConfirmDrawer(false); setVoiceParsedItems([]); }}>
              <Text>取消</Text>
            </View>
            <View className={`voice-save-btn${saving ? ' voice-save-btn--disabled' : ''}`} onClick={handleVoiceConfirm}>
              <Text>{saving ? '保存中...' : `确认保存 (${voiceParsedItems.length}笔)`}</Text>
            </View>
          </View>
        }
      >
        <ScrollView scrollY style={{ maxHeight: '430rpx' }}>
          {voiceParsedItems.map(item => (
            <View key={item._localId} className='voice-item'>
              <View className='voice-item-info'>
                <Text className='voice-item-cat'>{item.categoryIcon || '□'} {item.categoryName || '未匹配分类'}</Text>
                <Text className={`voice-item-amount${item.type === 2 ? ' voice-item-amount--income' : ''}`}>
                  {item.type === 1 ? '-' : '+'}{Number(item.amount).toFixed(2)}
                </Text>
              </View>
              {item.remark && <Text className='voice-item-remark'>{item.remark}</Text>}
              {item.needsConfirm && <Text className='voice-item-warn'>需要确认分类或金额</Text>}
              <View className='voice-item-delete' onClick={() => setVoiceParsedItems(prev => prev.filter(p => p._localId !== item._localId))}>
                <Text>×</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </Drawer>

      {recording && (
        <View className='recording-mask'>
          <View className='recording-box'>
            <Text className='recording-icon'>🎙</Text>
            <Text className='recording-text'>正在录音</Text>
            <Text className='recording-hint'>松开手指完成录音</Text>
          </View>
        </View>
      )}
    </View>
  );
}
