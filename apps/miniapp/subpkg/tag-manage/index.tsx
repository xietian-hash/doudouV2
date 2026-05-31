import { useState, useEffect } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import { getTags, createTag, updateTag, deleteTag } from '../../src/services/tags';
import type { Tag } from '../../src/services/types';
import { showToast } from '../../src/utils/toast';
import Modal from '../../src/components/Modal';
import Drawer from '../../src/components/Drawer';
import './index.scss';

export default function TagManagePage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormDrawer, setShowFormDrawer] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadTags(); }, []);

  async function loadTags() {
    setLoading(true);
    try {
      const data = await getTags();
      setTags(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const openAddDrawer = () => {
    setEditingId(null);
    setFormName('');
    setShowFormDrawer(true);
  };

  const openEditDrawer = (tag: Tag) => {
    setEditingId(tag.id);
    setFormName(tag.name);
    setShowFormDrawer(true);
  };

  const handleSave = async () => {
    const name = formName.trim();
    if (!name) { showToast('请输入标签名称', 'error'); return; }
    // 重名校验
    const isDuplicate = tags.some(t => t.name === name && t.id !== editingId);
    if (isDuplicate) { showToast('标签名称已存在', 'error'); return; }

    setSaving(true);
    try {
      if (editingId) {
        await updateTag(editingId, name);
        showToast('修改成功');
      } else {
        await createTag(name);
        showToast('添加成功');
      }
      setShowFormDrawer(false);
      loadTags();
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
      await deleteTag(deletingId);
      showToast('删除成功');
      setShowDeleteModal(false);
      loadTags();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
      setDeletingId(null);
    }
  };

  return (
    <View className='tag-page'>
      <View className='page-header'>
        <Text className='page-title'>标签管理</Text>
        <View className='add-btn' onClick={openAddDrawer}>
          <Text className='add-btn-text'>+ 添加</Text>
        </View>
      </View>

      <ScrollView scrollY className='tag-list'>
        {loading && (
          <View className='list-loading'>
            <Text className='list-loading-text'>加载中...</Text>
          </View>
        )}
        {!loading && tags.length === 0 && (
          <View className='list-empty'>
            <Text className='list-empty-icon'>🏷️</Text>
            <Text className='list-empty-text'>暂无标签，点击右上角添加</Text>
          </View>
        )}
        <View className='tag-grid'>
          {tags.map(tag => (
            <View key={tag.id} className='tag-card'>
              <Text className='tag-name'>{tag.name}</Text>
              <View className='tag-actions'>
                <View className='tag-action-btn' onClick={() => openEditDrawer(tag)}>
                  <Text className='tag-action-text'>编辑</Text>
                </View>
                <View className='tag-action-btn tag-action-btn--delete' onClick={() => confirmDelete(tag.id)}>
                  <Text className='tag-action-text tag-action-text--delete'>删除</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>

      {/* 添加/编辑抽屉 */}
      <Drawer
        visible={showFormDrawer}
        title={editingId ? '编辑标签' : '添加标签'}
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
        <View className='tag-form'>
          <View className='form-row'>
            <Text className='form-label'>标签名称</Text>
            <Input
              className='form-input'
              value={formName}
              onInput={e => setFormName(e.detail.value)}
              placeholder='请输入标签名称（最多10字）'
              maxlength={10}
              focus={showFormDrawer}
            />
            <Text className='form-count'>{formName.length}/10</Text>
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
        <Text>删除标签后，已标记该标签的账单不受影响，确认删除？</Text>
      </Modal>
    </View>
  );
}
