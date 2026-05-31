import { View, Text, ScrollView } from '@tarojs/components';
import type { Category } from '../../services/types';
import './index.scss';

interface Props {
  categories: Category[];
  selectedId: string | null;
  onSelect: (cat: Category) => void;
  onAdd?: () => void;
}

export default function CategoryGrid({ categories, selectedId, onSelect, onAdd }: Props) {
  return (
    <ScrollView scrollY className='cat-grid-scroll'>
      <View className='cat-grid'>
        {categories.map(cat => (
          <View
            key={cat.id}
            className={`cat-item${cat.id === selectedId ? ' cat-item--active' : ''}`}
            onClick={() => onSelect(cat)}
          >
            <Text className='cat-icon'>{cat.icon || '📁'}</Text>
            <Text className='cat-name'>{cat.name}</Text>
          </View>
        ))}
        {onAdd && (
          <View className='cat-item cat-item--add' onClick={onAdd}>
            <Text className='cat-icon'>+</Text>
            <Text className='cat-name'>添加</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
