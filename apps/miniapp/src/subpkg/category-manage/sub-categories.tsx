import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import {
  getCategories,
  getCategoryIcons,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../services/categories';
import { ApiError } from '../../services/request';
import type { Category, CategoryIcon } from '../../services/types';
import { showToast } from '../../utils/toast';
import './sub-categories.scss';

type DialogMode = 'add' | 'edit' | 'delete' | null;

interface DialogState {
  mode: DialogMode;
  id: string;
  name: string;
  icon: string;
}

const INIT_DIALOG: DialogState = { mode: null, id: '', name: '', icon: '' };

export default function SubCategories() {
  const router = useRouter();
  const { parentId, parentName, type: typeStr } = router.params;
  const type = parseInt(typeStr || '1', 10) as 1 | 2;
  const decodedParentName = decodeURIComponent(parentName || '');

  const [children, setChildren] = useState<Category[]>([]);
  const [icons, setIcons] = useState<CategoryIcon[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(INIT_DIALOG);
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: decodedParentName || '子分类' });
    getCategoryIcons().then(setIcons).catch(() => {});
    loadChildren();
  }, []);

  async function loadChildren() {
    if (!parentId) return;
    setLoading(true);
    try {
      const cats = await getCategories({ type });
      const parent = cats.find(c => c.id === parentId);
      setChildren(parent?.children ?? []);
    } catch {
      // toast already shown
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setActiveSwipeId(null);
    setDialog({ mode: 'add', id: '', name: '', icon: icons[0]?.icon || '' });
  }

  function openEdit(cat: Category, e: any) {
    e.stopPropagation();
    setActiveSwipeId(null);
    setDialog({ mode: 'edit', id: cat.id, name: cat.name, icon: cat.icon || '' });
  }

  function openDelete(cat: Category, e: any) {
    e.stopPropagation();
    setActiveSwipeId(null);
    setDialog({ mode: 'delete', id: cat.id, name: cat.name, icon: cat.icon || '' });
  }

  async function handleSubmit() {
    if (submitting) return;
    const { mode, id, name, icon } = dialog;
    if (!name.trim()) {
      showToast('请输入分类名称', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'add') {
        await createCategory({
          name: name.trim(),
          type,
          parentId: parentId || null,
          icon: icon || null,
        });
        showToast('添加成功');
      } else if (mode === 'edit') {
        await updateCategory(id, { name: name.trim(), icon: icon || null });
        showToast('保存成功');
      }
      setDialog(INIT_DIALOG);
      await loadChildren();
    } catch {
      // toast already shown
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await deleteCategory(dialog.id);
      showToast('删除成功');
      setDialog(INIT_DIALOG);
      await loadChildren();
    } catch (e) {
      if (e instanceof ApiError) showToast(e.message, 'error');
      setDialog(INIT_DIALOG);
    } finally {
      setSubmitting(false);
    }
  }

  function onTouchStart(id: string, e: any) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function onTouchEnd(id: string, e: any) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < Math.abs(dy)) return;
    if (dx < -50) setActiveSwipeId(id);
    else if (dx > 20) setActiveSwipeId(null);
  }

  const isSwiped = (id: string) => activeSwipeId === id;

  return (
    <View className='sc-page'>
      {/* Parent info */}
      <View className='sc-parent-bar'>
        <Text className='sc-parent-label'>父分类：</Text>
        <Text className='sc-parent-name'>{decodedParentName}</Text>
      </View>

      <ScrollView scrollY className='sc-list' onClick={() => setActiveSwipeId(null)}>
        {loading && (
          <View className='sc-empty'><Text className='sc-empty-text'>加载中...</Text></View>
        )}
        {!loading && children.length === 0 && (
          <View className='sc-empty'><Text className='sc-empty-text'>暂无子分类，点击 + 添加</Text></View>
        )}
        {!loading && children.map(cat => (
          <View key={cat.id} className='swipe-wrap'>
            <View
              className={`swipe-track${isSwiped(cat.id) ? ' swipe-track--swiped' : ''}`}
              onTouchStart={e => onTouchStart(cat.id, e)}
              onTouchEnd={e => onTouchEnd(cat.id, e)}
            >
              <View className='sc-card'>
                <View className='sc-icon-circle'>
                  <Text className='sc-icon-text'>{cat.icon || '📁'}</Text>
                </View>
                <Text className='sc-name'>{cat.name}</Text>
              </View>
              <View className='swipe-actions'>
                <View className='swipe-btn swipe-btn--edit' onClick={e => openEdit(cat, e)}>
                  <Text className='swipe-btn-text'>编辑</Text>
                </View>
                <View className='swipe-btn swipe-btn--delete' onClick={e => openDelete(cat, e)}>
                  <Text className='swipe-btn-text'>删除</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
        <View className='sc-list-bottom' />
      </ScrollView>

      {/* FAB */}
      <View className='sc-fab' onClick={openAdd}>
        <Text className='sc-fab-icon'>+</Text>
      </View>

      {/* Add / Edit dialog */}
      {(dialog.mode === 'add' || dialog.mode === 'edit') && (
        <View className='dialog-mask' onClick={() => setDialog(INIT_DIALOG)}>
          <View className='dialog-box' onClick={e => e.stopPropagation()}>
            <View className='dialog-header'>
              <Text className='dialog-title'>
                {dialog.mode === 'add' ? '添加子分类' : '编辑子分类'}
              </Text>
              <Text className='dialog-close' onClick={() => setDialog(INIT_DIALOG)}>×</Text>
            </View>
            <View className='dialog-body'>
              <Text className='dialog-label'>父分类</Text>
              <View className='dialog-readonly'>
                <Text className='dialog-readonly-text'>{decodedParentName}</Text>
              </View>
              <Text className='dialog-label'>分类名称</Text>
              <Input
                className='dialog-input'
                value={dialog.name}
                placeholder='请输入分类名称'
                placeholderStyle='color:#B5D0C6'
                onInput={e => setDialog(d => ({ ...d, name: e.detail.value }))}
              />
              <Text className='dialog-label'>选择图标</Text>
              <ScrollView scrollX className='icon-picker'>
                <View className='icon-picker-row'>
                  {icons.map(ic => (
                    <View
                      key={ic.id}
                      className={`icon-item${dialog.icon === ic.icon ? ' icon-item--selected' : ''}`}
                      onClick={() => setDialog(d => ({ ...d, icon: ic.icon }))}
                    >
                      <Text className='icon-item-emoji'>{ic.icon}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View className='dialog-footer'>
              <View className='dialog-btn dialog-btn--cancel' onClick={() => setDialog(INIT_DIALOG)}>
                <Text>取消</Text>
              </View>
              <View className='dialog-btn dialog-btn--confirm' onClick={handleSubmit}>
                <Text>确认</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Delete confirm dialog */}
      {dialog.mode === 'delete' && (
        <View className='dialog-mask' onClick={() => setDialog(INIT_DIALOG)}>
          <View className='dialog-box dialog-box--delete' onClick={e => e.stopPropagation()}>
            <View className='del-icon-circle'>
              <Text className='del-icon-emoji'>{dialog.icon || '📁'}</Text>
            </View>
            <Text className='del-title'>删除子分类</Text>
            <View className='del-msg-box'>
              <Text className='del-msg'>
                确认删除「{dialog.name}」？删除后相关账单的分类将丢失。
              </Text>
            </View>
            <View className='dialog-footer'>
              <View className='dialog-btn dialog-btn--cancel' onClick={() => setDialog(INIT_DIALOG)}>
                <Text>取消</Text>
              </View>
              <View className='dialog-btn dialog-btn--delete' onClick={handleDelete}>
                <Text>删除</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
