import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getTags, createTag, updateTag, deleteTag } from '../../services/tags';
import { ApiError } from '../../services/request';
import type { Tag } from '../../services/types';
import { showToast } from '../../utils/toast';
import './index.scss';

type DialogMode = 'add' | 'edit' | 'delete' | null;

interface DialogState {
  mode: DialogMode;
  id: string;
  name: string;
}

const INIT_DIALOG: DialogState = { mode: null, id: '', name: '' };

export default function TagManage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(INIT_DIALOG);
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: '标签管理' });
    loadTags();
  }, []);

  async function loadTags() {
    setLoading(true);
    try {
      const list = await getTags();
      setTags(list);
    } catch {
      // toast already shown
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setActiveSwipeId(null);
    setDialog({ mode: 'add', id: '', name: '' });
  }

  function openEdit(tag: Tag, e: any) {
    e.stopPropagation();
    setActiveSwipeId(null);
    setDialog({ mode: 'edit', id: tag.id, name: tag.name });
  }

  function openDelete(tag: Tag, e: any) {
    e.stopPropagation();
    setActiveSwipeId(null);
    setDialog({ mode: 'delete', id: tag.id, name: tag.name });
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

  async function handleSubmit() {
    if (submitting) return;
    const { mode, id, name } = dialog;
    if (!name.trim()) {
      showToast('请输入标签名称', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'add') {
        await createTag(name.trim());
        showToast('添加成功');
      } else if (mode === 'edit') {
        await updateTag(id, name.trim());
        showToast('保存成功');
      }
      setDialog(INIT_DIALOG);
      await loadTags();
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
      await deleteTag(dialog.id);
      showToast('删除成功');
      setDialog(INIT_DIALOG);
      await loadTags();
    } catch (e) {
      if (e instanceof ApiError && e.code === 10009) {
        showToast(e.message, 'error');
      }
      setDialog(INIT_DIALOG);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className='tm-page'>
      <ScrollView scrollY className='tm-list' onClick={() => setActiveSwipeId(null)}>
        {loading && (
          <View className='tm-empty'><Text className='tm-empty-text'>加载中...</Text></View>
        )}
        {!loading && tags.length === 0 && (
          <View className='tm-empty'><Text className='tm-empty-text'>暂无标签，点击 + 添加</Text></View>
        )}
        {!loading && tags.map(tag => (
          <View key={tag.id} className='swipe-wrap'>
            <View
              className={`swipe-track${isSwiped(tag.id) ? ' swipe-track--swiped' : ''}`}
              onTouchStart={e => onTouchStart(tag.id, e)}
              onTouchEnd={e => onTouchEnd(tag.id, e)}
            >
              <View className='tm-card'>
                <View className='tm-hash'>
                  <Text className='tm-hash-text'>#</Text>
                </View>
                <Text className='tm-name'>{tag.name}</Text>
              </View>
              <View className='swipe-actions'>
                <View className='swipe-btn swipe-btn--edit' onClick={e => openEdit(tag, e)}>
                  <Text className='swipe-btn-text'>编辑</Text>
                </View>
                <View className='swipe-btn swipe-btn--delete' onClick={e => openDelete(tag, e)}>
                  <Text className='swipe-btn-text'>删除</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
        <View className='tm-list-bottom' />
      </ScrollView>

      {/* FAB */}
      <View className='tm-fab' onClick={openAdd}>
        <Text className='tm-fab-icon'>+</Text>
      </View>

      {/* Add / Edit dialog */}
      {(dialog.mode === 'add' || dialog.mode === 'edit') && (
        <View className='dialog-mask' onClick={() => setDialog(INIT_DIALOG)}>
          <View className='dialog-box' onClick={e => e.stopPropagation()}>
            <View className='dialog-header'>
              <Text className='dialog-title'>
                {dialog.mode === 'add' ? '添加标签' : '重命名标签'}
              </Text>
              <Text className='dialog-close' onClick={() => setDialog(INIT_DIALOG)}>×</Text>
            </View>
            <View className='dialog-body'>
              <Input
                className='dialog-input'
                value={dialog.name}
                placeholder='请输入标签名称'
                placeholderStyle='color:#B5D0C6'
                focus
                onInput={e => setDialog(d => ({ ...d, name: e.detail.value }))}
              />
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
              <Text className='del-hash'>#</Text>
            </View>
            <Text className='del-title'>删除标签</Text>
            <View className='del-msg-box'>
              <Text className='del-msg'>
                确认删除标签「{dialog.name}」？删除后账单中的该标签将一并移除。
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
