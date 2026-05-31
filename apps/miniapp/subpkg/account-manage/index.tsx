import { useState, useEffect } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  setDefaultAccount,
} from '../../src/services/accounts';
import type { Account } from '../../src/services/types';
import { showToast } from '../../src/utils/toast';
import Modal from '../../src/components/Modal';
import Drawer from '../../src/components/Drawer';
import './index.scss';

const ACCOUNT_TYPES = [
  { value: 1, label: '现金', icon: '💵' },
  { value: 2, label: '银行卡', icon: '💳' },
  { value: 3, label: '支付宝', icon: '🔵' },
  { value: 4, label: '微信', icon: '💚' },
  { value: 5, label: '其他', icon: '🏦' },
];

interface FormData {
  name: string;
  type: number;
  icon: string;
}

const DEFAULT_FORM: FormData = { name: '', type: 1, icon: '' };

export default function AccountManagePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormDrawer, setShowFormDrawer] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadAccounts(); }, []);

  async function loadAccounts() {
    setLoading(true);
    try {
      const data = await getAccounts();
      setAccounts(data.sort((a, b) => a.sort - b.sort));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const openAddDrawer = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setShowFormDrawer(true);
  };

  const openEditDrawer = (acc: Account) => {
    setEditingId(acc.id);
    setForm({ name: acc.name, type: acc.type, icon: acc.icon || '' });
    setShowFormDrawer(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('请输入账户名称', 'error'); return; }
    setSaving(true);
    try {
      const typeItem = ACCOUNT_TYPES.find(t => t.value === form.type);
      const icon = form.icon || typeItem?.icon || '';
      if (editingId) {
        await updateAccount(editingId, { name: form.name.trim(), type: form.type, icon });
        showToast('修改成功');
      } else {
        await createAccount({ name: form.name.trim(), type: form.type, icon });
        showToast('添加成功');
      }
      setShowFormDrawer(false);
      loadAccounts();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAccount(id);
      showToast('设为默认成功');
      loadAccounts();
    } catch (e) {
      console.error(e);
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
      await deleteAccount(deletingId);
      showToast('删除成功');
      setShowDeleteModal(false);
      loadAccounts();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
      setDeletingId(null);
    }
  };

  const getTypeIcon = (type: number) => {
    return ACCOUNT_TYPES.find(t => t.value === type)?.icon || '🏦';
  };

  const getTypeLabel = (type: number) => {
    return ACCOUNT_TYPES.find(t => t.value === type)?.label || '其他';
  };

  return (
    <View className='account-page'>
      <View className='page-header'>
        <Text className='page-title'>账户管理</Text>
        <View className='add-btn' onClick={openAddDrawer}>
          <Text className='add-btn-text'>+ 添加</Text>
        </View>
      </View>

      <ScrollView scrollY className='account-list'>
        {loading && (
          <View className='list-loading'>
            <Text className='list-loading-text'>加载中...</Text>
          </View>
        )}
        {!loading && accounts.length === 0 && (
          <View className='list-empty'>
            <Text className='list-empty-icon'>🏦</Text>
            <Text className='list-empty-text'>暂无账户，点击右上角添加</Text>
          </View>
        )}
        {accounts.map(acc => (
          <View key={acc.id} className='account-card'>
            <View className='account-left'>
              <Text className='account-icon'>{acc.icon || getTypeIcon(acc.type)}</Text>
              <View className='account-info'>
                <View className='account-name-row'>
                  <Text className='account-name'>{acc.name}</Text>
                  {acc.isDefault && <View className='default-badge'><Text>默认</Text></View>}
                </View>
                <Text className='account-type-label'>{getTypeLabel(acc.type)}</Text>
                <Text className='account-balance'>
                  余额 ¥{parseFloat(acc.balance).toFixed(2)}
                </Text>
              </View>
            </View>
            <View className='account-actions'>
              {!acc.isDefault && (
                <View className='acc-action-btn' onClick={() => handleSetDefault(acc.id)}>
                  <Text className='acc-action-text'>设默认</Text>
                </View>
              )}
              <View className='acc-action-btn' onClick={() => openEditDrawer(acc)}>
                <Text className='acc-action-text'>编辑</Text>
              </View>
              <View className='acc-action-btn acc-action-btn--delete' onClick={() => confirmDelete(acc.id)}>
                <Text className='acc-action-text acc-action-text--delete'>删除</Text>
              </View>
            </View>
          </View>
        ))}
        <View style={{ height: '40rpx' }} />
      </ScrollView>

      {/* 添加/编辑账户抽屉 */}
      <Drawer
        visible={showFormDrawer}
        title={editingId ? '编辑账户' : '添加账户'}
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
        <View className='account-form'>
          <View className='form-row'>
            <Text className='form-label'>账户名称</Text>
            <Input
              className='form-input'
              value={form.name}
              onInput={e => setForm(f => ({ ...f, name: e.detail.value }))}
              placeholder='例如：招商银行'
              maxlength={20}
            />
          </View>
          <View className='form-row'>
            <Text className='form-label'>账户类型</Text>
            <View className='type-grid'>
              {ACCOUNT_TYPES.map(t => (
                <View
                  key={t.value}
                  className={`type-option${form.type === t.value ? ' type-option--active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, type: t.value, icon: t.icon }))}
                >
                  <Text className='type-option-icon'>{t.icon}</Text>
                  <Text className='type-option-label'>{t.label}</Text>
                </View>
              ))}
            </View>
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
        <Text>删除账户后，相关账单不受影响，确认删除？</Text>
      </Modal>
    </View>
  );
}
