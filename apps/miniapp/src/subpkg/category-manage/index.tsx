import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
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
import './index.scss';

type DialogMode = 'add' | 'edit' | 'delete' | null;

interface DialogState {
  mode: DialogMode;
  id: string;
  name: string;
  icon: string;
  hasSubCategories?: boolean;
}

const INIT_DIALOG: DialogState = { mode: null, id: '', name: '', icon: '' };

export default function CategoryManage() {
  const [type, setType] = useState<1 | 2>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [icons, setIcons] = useState<CategoryIcon[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(INIT_DIALOG);
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: '分类管理' });
    getCategoryIcons().then(setIcons).catch(() => {});
  }, []);

  useEffect(() => {
    loadCategories();
  }, [type]);

  async function loadCategories() {
    setLoading(true);
    try {
      const cats = await getCategories({ type });
      setCategories(cats);
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
    setDialog({
      mode: 'delete',
      id: cat.id,
      name: cat.name,
      icon: cat.icon || '',
      hasSubCategories: (cat.children?.length ?? 0) > 0,
    });
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
        await createCategory({ name: name.trim(), type, icon: icon || null });
        showToast('添加成功');
      } else if (mode === 'edit') {
        await updateCategory(id, { name: name.trim(), icon: icon || null });
        showToast('保存成功');
      }
      setDialog(INIT_DIALOG);
      await loadCategories();
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
      await loadCategories();
    } catch (e) {
      if (e instanceof ApiError && e.code === 10008) {
        showToast(e.message, 'error');
      }
      setDialog(INIT_DIALOG);
    } finally {
      setSubmitting(false);
    }
  }

  function goToSub(cat: Category) {
    if (activeSwipeId) {
      setActiveSwipeId(null);
      return;
    }
    Taro.navigateTo({
      url: `/subpkg/category-manage/sub-categories?parentId=${cat.id}&parentName=${encodeURIComponent(cat.name)}&type=${type}`,
    });
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
    <View className='cm-page'>
      {/* Type tabs */}
      <View className='cm-tabs'>
        <View
          className={`cm-tab${type === 1 ? ' cm-tab--active' : ''}`}
          onClick={() => { setType(1); setActiveSwipeId(null); }}
        >
          <Text className='cm-tab-text'>支出</Text>
        </View>
        <View
          className={`cm-tab${type === 2 ? ' cm-tab--active' : ''}`}
          onClick={() => { setType(2); setActiveSwipeId(null); }}
        >
          <Text className='cm-tab-text'>收入</Text>
        </View>
      </View>

      <ScrollView scrollY className='cm-list' onClick={() => setActiveSwipeId(null)}>
        {loading && (
          <View className='cm-empty'><Text className='cm-empty-text'>加载中...</Text></View>
        )}
        {!loading && categories.length === 0 && (
          <View className='cm-empty'><Text className='cm-empty-text'>暂无分类</Text></View>
        )}
        {!loading && categories.map(cat => (
          <View key={cat.id} className='swipe-wrap'>
            <View
              className={`swipe-track${isSwiped(cat.id) ? ' swipe-track--swiped' : ''}`}
              onTouchStart={e => onTouchStart(cat.id, e)}
              onTouchEnd={e => onTouchEnd(cat.id, e)}
            >
              {/* card */}
              <View className='cm-card' onClick={() => goToSub(cat)}>
                <View className='cm-card-left'>
                  <View className='cm-icon-circle'>
                    <Text className='cm-icon-text'>{cat.icon || '📁'}</Text>
                  </View>
                  <View className='cm-card-info'>
                    <Text className='cm-cat-name'>{cat.name}</Text>
                    <Text className='cm-cat-sub'>
                      {(cat.children?.length ?? 0) > 0
                        ? `${cat.children!.length}个子分类`
                        : '无子分类'}
                    </Text>
                  </View>
                </View>
                <Text className='cm-chevron'>›</Text>
              </View>
              {/* pills row */}
              {(cat.children?.length ?? 0) > 0 && (
                <View className='cm-pills'>
                  {cat.children!.slice(0, 6).map(child => (
                    <View key={child.id} className='cm-pill'>
                      <Text className='cm-pill-text'>{child.icon || ''} {child.name}</Text>
                    </View>
                  ))}
                  {cat.children!.length > 6 && (
                    <View className='cm-pill'>
                      <Text className='cm-pill-text'>+{cat.children!.length - 6}</Text>
                    </View>
                  )}
                </View>
              )}
              {/* swipe actions */}
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
        <View className='cm-list-bottom' />
      </ScrollView>

      {/* FAB */}
      <View className='cm-fab' onClick={openAdd}>
        <Text className='cm-fab-icon'>+</Text>
      </View>

      {/* Add / Edit dialog */}
      {(dialog.mode === 'add' || dialog.mode === 'edit') && (
        <View className='dialog-mask' onClick={() => setDialog(INIT_DIALOG)}>
          <View className='dialog-box' onClick={e => e.stopPropagation()}>
            <View className='dialog-header'>
              <Text className='dialog-title'>
                {dialog.mode === 'add' ? '添加分类' : '编辑分类'}
              </Text>
              <Text className='dialog-close' onClick={() => setDialog(INIT_DIALOG)}>×</Text>
            </View>
            <View className='dialog-body'>
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
            <Text className='del-title'>删除分类</Text>
            <View className='del-msg-box'>
              <Text className='del-msg'>
                确认删除「{dialog.name}」？
                {dialog.hasSubCategories ? '该分类包含子分类，删除后子分类也将一并删除。' : ''}
                删除后相关账单的分类将丢失。
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
