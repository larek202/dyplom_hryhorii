import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors } from '../../styles/colors';

const TextInputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  editable = true,
  keyboardType,
}) => (
  <View style={styles.wrapper}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      secureTextEntry={secureTextEntry}
      placeholderTextColor={Colors.border}
      style={[styles.input, !editable && styles.inputDisabled]}
      editable={editable}
      keyboardType={keyboardType}
    />
  </View>
);

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
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
  },
  inputDisabled: {
    backgroundColor: Colors.border + '20',
    color: Colors.textSecondary,
  },
});

export default TextInputField;




