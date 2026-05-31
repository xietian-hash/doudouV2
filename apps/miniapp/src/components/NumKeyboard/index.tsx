import { View, Text } from '@tarojs/components';
import './index.scss';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onConfirm: () => void;
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '00'],
];

export default function NumKeyboard({ value, onChange, onConfirm }: Props) {
  const handleKey = (key: string) => {
    if (key === 'backspace') {
      onChange(value.length <= 1 ? '0' : value.slice(0, -1));
      return;
    }
    if (value === '0' && key !== '.') {
      onChange(key === '00' ? '0' : key);
      return;
    }
    if (key === '.' && value.includes('.')) return;

    const next = value + key;
    const [integer, decimal] = next.split('.');
    if (decimal && decimal.length > 2) return;
    if (integer.length > 8) return;
    onChange(next);
  };

  return (
    <View className='keyboard'>
      <View className='keyboard-main'>
        <View className='keyboard-left'>
          {KEYS.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} className='keyboard-row'>
              {row.map(k => (
                <View key={k} className='key' onClick={() => handleKey(k)}>
                  <Text className='key-text'>{k}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
        <View className='keyboard-right'>
          <View className='key key--delete' onClick={() => handleKey('backspace')}>
            <Text className='key-delete-text'>⌫</Text>
          </View>
          <View className='key key--confirm' onClick={onConfirm}>
            <Text className='key-confirm-icon'>✓</Text>
            <Text className='key-confirm-text'>完成</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
