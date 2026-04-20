import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/colors';

const CategorySelect = ({
  label,
  value = [],
  onSelect,
  placeholder = 'Wybierz kategorię',
  required = false,
  categories = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!value || value.length === 0) {
      return placeholder;
    }
    if (value.length === 1) {
      return value[0];
    }
    if (value.length === 2) {
      return `${value[0]}, ${value[1]}`;
    }
    return `${value[0]}, +${value.length - 1}`;
  }, [value, placeholder]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = (category) => {
    const exists = value.includes(category);
    const nextValue = exists
      ? value.filter((item) => item !== category)
      : [...value, category];
    onSelect?.(nextValue);
  };

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}>*</Text>}
        </Text>
      ) : null}
      <TouchableOpacity
        style={styles.input}
        activeOpacity={0.75}
        onPress={toggleOpen}
      >
        <Text style={[styles.inputText, value.length === 0 && styles.placeholder]}>
          {selectedLabel}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.textSecondary}
        />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.listContainer}>
          <ScrollView
            style={styles.list}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={styles.listItem}
                onPress={() => handleSelect(category)}
                activeOpacity={0.7}
              >
                <View style={styles.listItemContent}>
                  <View
                    style={[
                      styles.listItemCheckbox,
                      value.includes(category) && styles.listItemCheckboxActive,
                    ]}
                  >
                    {value.includes(category) && (
                      <Ionicons name="checkmark" size={14} color={Colors.surface} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.listItemText,
                      value.includes(category) && styles.listItemTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    color: Colors.textSecondary,
    marginBottom: 6,
    fontSize: 12,
  },
  required: {
    color: Colors.accent,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
  },
  inputText: {
    color: Colors.textPrimary,
    fontSize: 16,
  },
  placeholder: {
    color: Colors.textSecondary,
  },
  listContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    maxHeight: 200,
    backgroundColor: Colors.surface,
  },
  list: {
    paddingVertical: 4,
  },
  listItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemText: {
    color: Colors.textPrimary,
  },
  listItemTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  listItemCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    marginRight: 12,
  },
  listItemCheckboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});

export default CategorySelect;




