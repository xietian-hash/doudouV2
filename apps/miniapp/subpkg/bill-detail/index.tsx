import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getBillDetail, deleteBill } from '../../src/services/bills';
import type { BillDetail } from '../../src/services/types';
import { showToast } from '../../src/utils/toast';
import Modal from '../../src/components/Modal';
import './index.scss';

const TYPE_LABEL: Record<number, string> = { 1: '支出', 2: '收入' };
const SOURCE_LABEL: Record<number, string> = { 1: '手动记账', 2: '语音记账' };

export default function BillDetailPage() {
  const [bill, setBill] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const pages = Taro.getCurrentPages();
    const curr = pages[pages.length - 1];
    const id = (curr as unknown as { options: Record<string, string> }).options?.id;
    if (id) loadDetail(id);
    else setLoading(false);
  }, []);

  async function loadDetail(id: string) {
    setLoading(true);
    try {
      setBill(await getBillDetail(id));
    } catch (e) {
      console.error(e);
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = () => {
    if (!bill) return;
    Taro.setStorageSync('editBillDraft', bill);
    Taro.switchTab({ url: '/pages/bill/index' });
  };

  const handleDelete = async () => {
    if (!bill) return;
    setDeleting(true);
    try {
      await deleteBill(bill.id);
      showToast('删除成功');
      setShowDeleteModal(false);
      Taro.navigateBack({ delta: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View className='detail-loading'>
        <Text className='detail-loading-text'>加载中...</Text>
      </View>
    );
  }

  if (!bill) {
    return (
      <View className='detail-loading'>
        <Text className='detail-loading-text'>账单不存在</Text>
      </View>
    );
  }

  const isIncome = bill.type === 2;

  return (
    <View className='detail-page'>
      <View className={`detail-header${isIncome ? ' detail-header--income' : ''}`}>
        <Text className='detail-type-label'>{TYPE_LABEL[bill.type]}</Text>
        <Text className='detail-amount'>{isIncome ? '+' : '-'}{Number(bill.amount).toFixed(2)}</Text>
        <Text className='detail-cat'>{bill.categoryIcon || '□'} {bill.categoryName}</Text>
      </View>

      <ScrollView scrollY className='detail-scroll'>
        <View className='detail-card'>
          <DetailRow label='账户' value={bill.accountName} />
          <DetailRow label='日期' value={bill.billDate.slice(0, 10)} />
          <DetailRow label='备注' value={bill.remark || '无'} />
          <DetailRow label='来源' value={SOURCE_LABEL[bill.source] || '手动记账'} />
          {bill.voiceText && <DetailRow label='语音原文' value={bill.voiceText} />}
          {bill.tags && bill.tags.length > 0 && (
            <View className='detail-row'>
              <Text className='detail-row-label'>标签</Text>
              <View className='detail-tags'>
                {bill.tags.map(tag => (
                  <View key={tag.id} className='detail-tag'>
                    <Text>{tag.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          <DetailRow label='创建时间' value={formatDateTime(bill.createdAt)} />
          <DetailRow label='更新时间' value={formatDateTime(bill.updatedAt)} />
        </View>

        <View className='detail-actions'>
          <View className='action-btn action-btn--edit' onClick={handleEdit}>
            <Text>编辑</Text>
          </View>
          <View className='action-btn action-btn--delete' onClick={() => setShowDeleteModal(true)}>
            <Text>删除</Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showDeleteModal}
        title='确认删除'
        confirmDanger
        confirmText={deleting ? '删除中...' : '删除'}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      >
        <Text>删除后不可恢复，请确认是否删除这条账单。</Text>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className='detail-row'>
      <Text className='detail-row-label'>{label}</Text>
      <Text className='detail-row-value'>{value}</Text>
    </View>
  );
}

function formatDateTime(str: string): string {
  if (!str) return '';
  const d = new Date(str);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}
