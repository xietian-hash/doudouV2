import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getCategories, deleteCategory } from '../../services/categories';
import { ApiError } from '../../services/request';
import type { Category } from '../../services/types';
import { showToast } from '../../utils/toast';
import Modal from '../../components/Modal';
import './index.scss';

const CODE_CATEGORY_HAS_BILLS = 10008;

interface DeleteDialog {
  visible: boolean;
  id: string;
  message: string;
}

export default function CategoryManage() {
  const [type, setType] = useState<1 | 2>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialog, setDialog] = useState<DeleteDialog>({ visible: false, id: '', message: '' });

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: '分类管理' });
  }, []);

  useEffect(() => {
    loadCategories();
  }, [type]);

  async function loadCategories() {
    setLoading(true);
    try {
      const cats = await getCategories({ type });
      setCategories(cats);
      const allIds = new Set(cats.map(c => c.id));
      setExpanded(allIds);
    } catch {
      // toast already shown
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(id: string) {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteCategory(id);
      showToast('删除成功');
      await loadCategories();
    } catch (e) {
      if (e instanceof ApiError && e.code === CODE_CATEGORY_HAS_BILLS) {
        setDialog({ visible: true, id, message: e.message });
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleForceDelete() {
    const { id } = dialog;
    setDialog(d => ({ ...d, visible: false }));
    setDeleting(true);
    try {
      await deleteCategory(id, true);
      showToast('删除成功');
      await loadCategories();
    } catch {
      // toast already shown
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View className='cat-manage-page'>
      <View className='type-tabs'>
        <View
          className={`type-tab${type === 1 ? ' type-tab--active' : ''}`}
          onClick={() => setType(1)}
        >
          <Text>支出</Text>
        </View>
        <View
          className={`type-tab${type === 2 ? ' type-tab--active' : ''}`}
          onClick={() => setType(2)}
        >
          <Text>收入</Text>
        </View>
      </View>

      <ScrollView scrollY className='cat-list'>
        {loading && (
          <View className='cat-placeholder'>
            <Text className='cat-placeholder-text'>加载中...</Text>
          </View>
        )}
        {!loading && categories.length === 0 && (
          <View className='cat-placeholder'>
            <Text className='cat-placeholder-text'>暂无分类</Text>
          </View>
        )}
        {!loading && categories.map(parent => (
          <View key={parent.id} className='cat-group'>
            <View className='cat-row cat-row--parent'>
              <View
                className='cat-row-main'
                onClick={() => (parent.children?.length ?? 0) > 0 && toggleExpand(parent.id)}
              >
                <Text className='cat-icon'>{parent.icon || '📁'}</Text>
                <Text className='cat-name'>{parent.name}</Text>
                {(parent.children?.length ?? 0) > 0 && (
                  <Text className='cat-chevron'>
                    {expanded.has(parent.id) ? '▾' : '▸'}
                  </Text>
                )}
              </View>
              <View className='cat-del-btn' onClick={() => handleDelete(parent.id)}>
                <Text className='cat-del-icon'>🗑</Text>
              </View>
            </View>

            {expanded.has(parent.id) && parent.children?.map(child => (
              <View key={child.id} className='cat-row cat-row--child'>
                <View className='cat-row-main'>
                  <Text className='cat-icon'>{child.icon || '📁'}</Text>
                  <Text className='cat-name'>{child.name}</Text>
                </View>
                <View className='cat-del-btn' onClick={() => handleDelete(child.id)}>
                  <Text className='cat-del-icon'>🗑</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={dialog.visible}
        title='删除分类'
        confirmText='确认删除'
        confirmDanger
        onCancel={() => setDialog(d => ({ ...d, visible: false }))}
        onConfirm={handleForceDelete}
      >
        <Text>{dialog.message}</Text>
      </Modal>
    </View>
  );
}
