import { View, Text } from '@tarojs/components';
import './index.scss';

interface Props {
  visible: boolean;
  title: string;
  children?: React.ReactNode;
  cancelText?: string;
  confirmText?: string;
  confirmDanger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function Modal({
  visible,
  title,
  children,
  cancelText = '取消',
  confirmText = '确认',
  confirmDanger,
  onCancel,
  onConfirm,
}: Props) {
  if (!visible) return null;
  return (
    <View className='modal-mask' onClick={onCancel}>
      <View className='modal-box' onClick={e => e.stopPropagation()}>
        <View className='modal-title-row'>
          <Text className='modal-title'>{title}</Text>
          <Text className='modal-close' onClick={onCancel}>×</Text>
        </View>
        {children && <View className='modal-body'>{children}</View>}
        <View className='modal-footer'>
          <View className='modal-btn modal-btn--cancel' onClick={onCancel}>
            <Text>{cancelText}</Text>
          </View>
          <View className={`modal-btn modal-btn--confirm${confirmDanger ? ' modal-btn--danger' : ''}`} onClick={onConfirm}>
            <Text>{confirmText}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
