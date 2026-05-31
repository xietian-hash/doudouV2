import { View, Text } from '@tarojs/components';
import './index.scss';

interface Props {
  visible: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  height?: string;
}

export default function Drawer({ visible, title, children, onClose, footer, height }: Props) {
  if (!visible) return null;
  return (
    <View className='drawer-mask' onClick={onClose}>
      <View
        className='drawer-box'
        style={height ? { height } : {}}
        onClick={e => e.stopPropagation()}
      >
        <View className='drawer-handle' />
        {title && <Text className='drawer-title'>{title}</Text>}
        <View className='drawer-content'>{children}</View>
        {footer && <View className='drawer-footer'>{footer}</View>}
      </View>
    </View>
  );
}
