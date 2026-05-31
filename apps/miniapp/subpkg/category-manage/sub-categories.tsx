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
import './sub-categories.scss';

interface FormData {
  name: string;
  icon: string;
}

const DEFAULT_FORM: FormData = { name: '', icon: '' };

export default function SubCategoriesPage() {
  const [parentId, setParentId] = useState('');
  const [parentName, setParentName] = useState('');
  const [type, setType] = useState(1);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [icons, setIcons] = useState<CategoryIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormDrawer, setShowFormDrawer] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const pages = Taro.getCurrentPages();
    const curr = pages[pages.length - 1];
    const options = (curr as unknown as { options: Record<string, string> }).options;
    if (options?.parentId) {
      setParentId(options.parentId);
      setParentName(decodeURIComponent(options.parentName || ''));
      setType(Number(options.type) || 1);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!parentId) return;
    setLoading(true);
    try {
      const [cats, iconData] = await Promise.all([
        getCategories({ type }),
        getCategoryIcons(),
      ]);
      const subs = cats.filter(c => c.parentId === parentId);
      setSubCategories(subs);
      setIcons(iconData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [parentId, type]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAddDrawer = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setShowFormDrawer(true);
  };

  const openEditDrawer = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, icon: cat.icon || '' });
    setShowFormDrawer(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('请输入分类名称', 'error'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, {
          name: form.name.trim(),
          icon: form.icon || null,
        });
        showToast('修改成功');
      } else {
        await createCategory({
          name: form.name.trim(),
          type,
          parentId,
          icon: form.icon || null,
        });
        showToast('添加成功');
      }
      setShowFormDrawer(false);
      loadData();
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
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
      setDeletingId(null);
    }
  };

  return (
    <View className='sub-cat-page'>
      <View className='page-header'>
        <Text className='page-title'>{parentName} · 子分类</Text>
        <View className='add-btn' onClick={openAddDrawer}>
          <Text className='add-btn-text'>+ 添加</Text>
        </View>
      </View>

      <ScrollView scrollY className='sub-cat-list'>
        {loading && (
          <View className='list-loading'>
            <Text>加载中...</Text>
          </View>
        )}
        {!loading && subCategories.length === 0 && (
          <View className='list-empty'>
            <Text className='list-empty-icon'>📂</Text>
            <Text className='list-empty-text'>暂无子分类</Text>
          </View>
        )}
        {subCategories.map(cat => (
          <View key={cat.id} className='sub-item'>
            <Text className='sub-item-icon'>{cat.icon || '📄'}</Text>
            <Text className='sub-item-name'>{cat.name}</Text>
            <View className='sub-item-actions'>
              <View className='action-btn' onClick={() => openEditDrawer(cat)}>
                <Text className='action-text'>编辑</Text>
              </View>
              <View className='action-btn action-btn--delete' onClick={() => confirmDelete(cat.id)}>
                <Text className='action-text action-text--delete'>删除</Text>
              </View>
            </View>
          </View>
        ))}
        <View style={{ height: '40rpx' }} />
      </ScrollView>

      {/* 添加/编辑抽屉 */}
      <Drawer
        visible={showFormDrawer}
        title={editingId ? '编辑子分类' : '添加子分类'}
        onClose={() => setShowFormDrawer(false)}
        footer={
          <View
            className={`form-save-btn${saving ? ' form-save-btn--disabled' : ''}`}
            onClick={handleSave}
          >
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
              onInput={e => setForm(f => ({ ...f, name: e.detail.value }))}
              placeholder='请输入分类名称'
              maxlength={20}
            />
          </View>
          <View className='form-row'>
            <Text className='form-label'>选择图标（可选）</Text>
            <ScrollView scrollY style={{ maxHeight: '300rpx' }}>
              <View className='icon-grid'>
                {icons.map(ic => (
                  <View
                    key={ic.id}
                    className={`icon-item${form.icon === ic.icon ? ' icon-item--active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, icon: ic.icon }))}
                  >
                    <Text className='icon-item-text'>{ic.icon}</Text>
                    <Text className='icon-item-name'>{ic.name}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Drawer>

      {/* 删除确认弹窗 */}
      <Modal
        visible={showDeleteModal}
        title='确认删除'
        confirmDanger
        confirmText={deleting ? '删除中...' : '删除'}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      >
        <Text>确认删除该子分类？删除后历史账单保留。</Text>
      </Modal>
    </View>
  );
}
