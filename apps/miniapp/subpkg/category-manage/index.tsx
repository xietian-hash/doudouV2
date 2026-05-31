import { useState, useEffect, useCallback } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryIcons,
} from '../../src/services/categories';
import type { Category, CategoryIcon } from '../../src/services/types';
import { showToast } from '../../src/utils/toast';
import Modal from '../../src/components/Modal';
import Drawer from '../../src/components/Drawer';
import './index.scss';

type TabType = 1 | 2;

interface FormData {
  name: string;
  icon: string;
  parentId: string | null;
}

const DEFAULT_FORM: FormData = { name: '', icon: '', parentId: null };

export default function CategoryManagePage() {
  const [activeTab, setActiveTab] = useState<TabType>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [icons, setIcons] = useState<CategoryIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormDrawer, setShowFormDrawer] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, iconRes] = await Promise.all([
        getCategories({ type: activeTab }),
        getCategoryIcons(),
      ]);
      setIcons(iconRes);
      const topLevel = catRes.filter(cat => !cat.parentId);
      setCategories(topLevel.map(parent => ({
        ...parent,
        children: catRes.filter(cat => cat.parentId === parent.id),
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);
  Taro.useDidShow(() => { loadData(); });

  const openAddDrawer = (parentId: string | null = null) => {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM, parentId });
    setShowFormDrawer(true);
  };

  const openEditDrawer = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, icon: cat.icon || '', parentId: cat.parentId });
    setShowFormDrawer(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) { showToast('请输入分类名称', 'error'); return; }

    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, { name, icon: form.icon || null });
        showToast('修改成功');
      } else {
        await createCategory({
          name,
          type: activeTab,
          parentId: form.parentId,
          icon: form.icon || null,
        });
        showToast('添加成功');
      }
      setShowFormDrawer(false);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await deleteCategory(deletingId);
      showToast('删除成功');
      setShowDeleteModal(false);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
      setDeletingId(null);
    }
  };

  const goSubCategories = (cat: Category) => {
    Taro.navigateTo({
      url: `/subpkg/category-manage/sub-categories?parentId=${cat.id}&parentName=${encodeURIComponent(cat.name)}&type=${activeTab}`,
    });
  };

  return (
    <View className='cat-manage-page'>
      <View className='tab-bar-custom'>
        <View className={`tab-btn${activeTab === 1 ? ' tab-btn--active' : ''}`} onClick={() => setActiveTab(1)}>
          <Text>支出分类</Text>
        </View>
        <View className={`tab-btn${activeTab === 2 ? ' tab-btn--active' : ''}`} onClick={() => setActiveTab(2)}>
          <Text>收入分类</Text>
        </View>
      </View>

      <View className='page-actions'>
        <View className='add-btn' onClick={() => openAddDrawer(null)}>
          <Text className='add-btn-text'>+ 添加一级分类</Text>
        </View>
      </View>

      <ScrollView scrollY className='cat-list'>
        {loading && (
          <View className='list-loading'>
            <Text className='list-loading-text'>加载中...</Text>
          </View>
        )}
        {!loading && categories.length === 0 && (
          <View className='list-empty'>
            <Text className='list-empty-icon'>□</Text>
            <Text className='list-empty-text'>暂无分类</Text>
          </View>
        )}
        {categories.map(cat => (
          <View key={cat.id} className='cat-card'>
            <View className='cat-parent-row' onClick={() => goSubCategories(cat)}>
              <View className='cat-parent-left'>
                <Text className='cat-icon'>{cat.icon || '□'}</Text>
                <View>
                  <Text className='cat-parent-name'>{cat.name}</Text>
                  <Text className='cat-sub-count'>{cat.children?.length || 0} 个子分类</Text>
                </View>
              </View>
              <View className='cat-parent-actions'>
                <View className='cat-action-btn' onClick={e => { e.stopPropagation(); openAddDrawer(cat.id); }}>
                  <Text className='cat-action-text'>+子类</Text>
                </View>
                <View className='cat-action-btn' onClick={e => { e.stopPropagation(); openEditDrawer(cat); }}>
                  <Text className='cat-action-text'>编辑</Text>
                </View>
                <View className='cat-action-btn cat-action-btn--delete' onClick={e => { e.stopPropagation(); confirmDelete(cat.id); }}>
                  <Text className='cat-action-text cat-action-text--delete'>删除</Text>
                </View>
              </View>
            </View>

            {cat.children && cat.children.length > 0 && (
              <View className='sub-cat-list'>
                {cat.children.slice(0, 6).map(sub => (
                  <View key={sub.id} className='sub-cat-item'>
                    <Text className='sub-cat-icon'>{sub.icon || '□'}</Text>
                    <Text className='sub-cat-name'>{sub.name}</Text>
                    <View className='sub-cat-actions'>
                      <View className='cat-action-btn' onClick={() => openEditDrawer(sub)}>
                        <Text className='cat-action-text'>编辑</Text>
                      </View>
                      <View className='cat-action-btn cat-action-btn--delete' onClick={() => confirmDelete(sub.id)}>
                        <Text className='cat-action-text cat-action-text--delete'>删除</Text>
                      </View>
                    </View>
                  </View>
                ))}
                {cat.children.length > 6 && (
                  <View className='sub-cat-more' onClick={() => goSubCategories(cat)}>
                    <Text>查看全部 {cat.children.length} 个</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
        <View style={{ height: '40rpx' }} />
      </ScrollView>

      <Drawer
        visible={showFormDrawer}
        title={editingId ? '编辑分类' : (form.parentId ? '添加子分类' : '添加一级分类')}
        onClose={() => setShowFormDrawer(false)}
        footer={
          <View className={`form-save-btn${saving ? ' form-save-btn--disabled' : ''}`} onClick={handleSave}>
            <Text>{saving ? '保存中...' : '保存'}</Text>
          </View>
        }
      >
        <View className='cat-form'>
          <View className='form-row'>
            <Text className='form-label'>分类名称</Text>
            <Input
              className='form-input'
              value={form.name}
              onInput={e => setForm(prev => ({ ...prev, name: e.detail.value }))}
              placeholder='请输入分类名称'
              maxlength={20}
            />
          </View>
          <View className='form-row'>
            <Text className='form-label'>选择图标</Text>
            <ScrollView scrollY style={{ maxHeight: '320rpx' }}>
              <View className='icon-grid'>
                {icons.map(icon => (
                  <View
                    key={icon.id}
                    className={`icon-item${form.icon === icon.icon ? ' icon-item--active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, icon: icon.icon }))}
                  >
                    <Text className='icon-item-text'>{icon.icon}</Text>
                    <Text className='icon-item-name'>{icon.name}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Drawer>

      <Modal
        visible={showDeleteModal}
        title='确认删除'
        confirmDanger
        confirmText={deleting ? '删除中...' : '删除'}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      >
        <Text>有子分类或关联账单时，分类可能无法删除，请确认是否继续。</Text>
      </Modal>
    </View>
  );
}
