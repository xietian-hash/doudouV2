import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  setDefaultAccount,
} from '../../services/accounts';
import { ApiError } from '../../services/request';
import type { Account } from '../../services/types';
import { showToast } from '../../utils/toast';
import './index.scss';

interface AccountTypeConfig {
  value: number;
  label: string;
  icon: string;
  bg: string;
}

const ACCOUNT_TYPES: AccountTypeConfig[] = [
  { value: 1, label: '现金', icon: '💵', bg: '#F3E5F5' },
  { value: 2, label: '银行卡', icon: '🏦', bg: '#E3F2FD' },
  { value: 3, label: '支付宝', icon: '📱', bg: '#FFF9E0' },
  { value: 4, label: '微信', icon: '💬', bg: '#E8F5E9' },
  { value: 5, label: '其他', icon: '💰', bg: '#F8F3FF' },
];

function getTypeConfig(type: number): AccountTypeConfig {
  return ACCOUNT_TYPES.find(t => t.value === type) ?? ACCOUNT_TYPES[4];
}

type DialogMode = 'add' | 'edit' | 'delete' | null;

interface DialogState {
  mode: DialogMode;
  id: string;
  name: string;
  type: number;
  isDefault: boolean;
}

const INIT_DIALOG: DialogState = { mode: null, id: '', name: '', type: 1, isDefault: false };

export default function AccountManage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(INIT_DIALOG);
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: '账户管理' });
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoading(true);
    try {
      const list = await getAccounts();
      setAccounts(list);
    } catch {
      // toast already shown
    } finally {
      setLoading(false);
    }
  }

  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance || '0'), 0);

  function openAdd() {
    setActiveSwipeId(null);
    setDialog({ mode: 'add', id: '', name: '', type: 1, isDefault: false });
  }

  function openEdit(acc: Account, e: any) {
    e.stopPropagation();
    setActiveSwipeId(null);
    setDialog({ mode: 'edit', id: acc.id, name: acc.name, type: acc.type, isDefault: acc.isDefault });
  }

  function openDelete(acc: Account, e: any) {
    e.stopPropagation();
    setActiveSwipeId(null);
    setDialog({ mode: 'delete', id: acc.id, name: acc.name, type: acc.type, isDefault: false });
  }

  async function handleSubmit() {
    if (submitting) return;
    const { mode, id, name, type, isDefault } = dialog;
    if (!name.trim()) {
      showToast('请输入账户名称', 'error');
      return;
    }
    const cfg = getTypeConfig(type);
    setSubmitting(true);
    try {
      if (mode === 'add') {
        await createAccount({ name: name.trim(), type, icon: cfg.icon });
        showToast('添加成功');
      } else if (mode === 'edit') {
        await updateAccount(id, { name: name.trim(), type, icon: cfg.icon });
        if (isDefault) {
          await setDefaultAccount(id);
        }
        showToast('保存成功');
      }
      setDialog(INIT_DIALOG);
      await loadAccounts();
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
      await deleteAccount(dialog.id);
      showToast('删除成功');
      setDialog(INIT_DIALOG);
      await loadAccounts();
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

  const isEditSelf = (acc: Account) => dialog.mode === 'edit' && dialog.id === acc.id;

  return (
    <View className='am-page'>
      {/* 净资产 */}
      <View className='am-total-card'>
        <Text className='am-total-label'>净资产</Text>
        <Text className='am-total-value'>
          ¥{totalBalance.toFixed(2)}
        </Text>
      </View>

      <ScrollView scrollY className='am-list' onClick={() => setActiveSwipeId(null)}>
        {loading && (
          <View className='am-empty'><Text className='am-empty-text'>加载中...</Text></View>
        )}
        {!loading && accounts.length === 0 && (
          <View className='am-empty'><Text className='am-empty-text'>暂无账户，点击 + 添加</Text></View>
        )}
        {!loading && accounts.map(acc => {
          const cfg = getTypeConfig(acc.type);
          const bal = parseFloat(acc.balance || '0');
          return (
            <View key={acc.id} className='swipe-wrap'>
              <View
                className={`swipe-track${isSwiped(acc.id) ? ' swipe-track--swiped' : ''}`}
                onTouchStart={e => onTouchStart(acc.id, e)}
                onTouchEnd={e => onTouchEnd(acc.id, e)}
              >
                <View className='am-card'>
                  <View className='am-icon-circle' style={{ background: cfg.bg }}>
                    <Text className='am-icon-text'>{acc.icon || cfg.icon}</Text>
                  </View>
                  <View className='am-card-info'>
                    <View className='am-name-row'>
                      <Text className='am-name'>{acc.name}</Text>
                      {acc.isDefault && (
                        <View className='am-default-badge'>
                          <Text className='am-default-text'>默认</Text>
                        </View>
                      )}
                    </View>
                    <Text className='am-type-label'>{cfg.label}</Text>
                  </View>
                  <Text className={`am-balance${bal < 0 ? ' am-balance--negative' : ''}`}>
                    ¥{bal.toFixed(2)}
                  </Text>
                </View>
                <View className='swipe-actions'>
                  <View className='swipe-btn swipe-btn--edit' onClick={e => openEdit(acc, e)}>
                    <Text className='swipe-btn-text'>编辑</Text>
                  </View>
                  <View className='swipe-btn swipe-btn--delete' onClick={e => openDelete(acc, e)}>
                    <Text className='swipe-btn-text'>删除</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
        <View className='am-list-bottom' />
      </ScrollView>

      {/* FAB */}
      <View className='am-fab' onClick={openAdd}>
        <Text className='am-fab-icon'>+</Text>
      </View>

      {/* Add / Edit dialog */}
      {(dialog.mode === 'add' || dialog.mode === 'edit') && (
        <View className='dialog-mask' onClick={() => setDialog(INIT_DIALOG)}>
          <View className='dialog-box' onClick={e => e.stopPropagation()}>
            <View className='dialog-header'>
              <Text className='dialog-title'>
                {dialog.mode === 'add' ? '添加账户' : '编辑账户'}
              </Text>
              <Text className='dialog-close' onClick={() => setDialog(INIT_DIALOG)}>×</Text>
            </View>
            <View className='dialog-body'>
              <Text className='dialog-label'>账户名称</Text>
              <Input
                className='dialog-input'
                value={dialog.name}
                placeholder='请输入账户名称'
                placeholderStyle='color:#B5D0C6'
                onInput={e => setDialog(d => ({ ...d, name: e.detail.value }))}
              />
              <Text className='dialog-label'>账户类型</Text>
              <View className='type-grid'>
                {ACCOUNT_TYPES.map(t => (
                  <View
                    key={t.value}
                    className={`type-grid-item${dialog.type === t.value ? ' type-grid-item--selected' : ''}`}
                    onClick={() => setDialog(d => ({ ...d, type: t.value }))}
                  >
                    <View className='type-grid-icon' style={{ background: t.bg }}>
                      <Text className='type-grid-emoji'>{t.icon}</Text>
                    </View>
                    <Text className='type-grid-label'>{t.label}</Text>
                  </View>
                ))}
              </View>
              {dialog.mode === 'edit' && (
                <View
                  className={`default-toggle${dialog.isDefault ? ' default-toggle--active' : ''}`}
                  onClick={() => setDialog(d => ({ ...d, isDefault: !d.isDefault }))}
                >
                  <Text className='default-toggle-text'>设为默认账户</Text>
                  <View className={`toggle-switch${dialog.isDefault ? ' toggle-switch--on' : ''}`}>
                    <View className='toggle-knob' />
                  </View>
                </View>
              )}
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
            <View className='del-icon-circle' style={{ background: getTypeConfig(dialog.type).bg }}>
              <Text className='del-icon-emoji'>{getTypeConfig(dialog.type).icon}</Text>
            </View>
            <Text className='del-title'>删除账户</Text>
            <View className='del-msg-box'>
              <Text className='del-msg'>
                确认删除账户「{dialog.name}」？删除后该账户下的账单记录将受影响。
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
