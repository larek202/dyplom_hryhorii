import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../styles/colors';

const DateTimePickerField = ({
  label,
  value,
  onChange,
  mode = 'datetime',
  minimumDate,
  placeholder = 'Wybierz datę i czas',
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(value ? new Date(value) : new Date());

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date && event.type !== 'dismissed') {
      if (mode === 'datetime') {
        setTempDate(date);
        if (Platform.OS === 'android') {
          // На Android показываем пикер времени после выбора даты
          setTimeout(() => {
            setShowTimePicker(true);
          }, 300);
        } else {
          // iOS показывает оба сразу
          onChange(date);
        }
      } else {
        onChange(date);
      }
    }
  };

  const handleTimeChange = (event, time) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (time && event.type !== 'dismissed') {
      const finalDate = new Date(tempDate);
      finalDate.setHours(time.getHours());
      finalDate.setMinutes(time.getMinutes());
      onChange(finalDate);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    if (mode === 'date') {
      return `${day}.${month}.${year}`;
    } else if (mode === 'time') {
      return `${hours}:${minutes}`;
    }
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={styles.input}
        onPress={() => {
          if (mode === 'datetime' && Platform.OS === 'android') {
            setShowDatePicker(true);
          } else {
            setShowDatePicker(true);
          }
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {value ? formatDate(value) : placeholder}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.pickerContainer}>
        {showDatePicker && (
          <DateTimePicker
            key="date-picker"
            value={value ? new Date(value) : tempDate}
            mode={mode === 'datetime' ? 'date' : mode}
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={minimumDate === undefined ? undefined : minimumDate}
            locale="pl_PL"
          />
        )}
        
        {showTimePicker && Platform.OS === 'android' && mode === 'datetime' && (
          <DateTimePicker
            key="time-picker"
            value={tempDate}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={handleTimeChange}
          />
        )}
        
        {Platform.OS === 'ios' && showDatePicker && (
          <View key="ios-buttons" style={styles.iosButtons}>
            <TouchableOpacity
              style={styles.iosButton}
              onPress={() => {
                setShowDatePicker(false);
              }}
            >
              <Text style={styles.iosButtonText}>Gotowe</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  placeholder: {
    color: Colors.border,
  },
  pickerContainer: {
    // Container for pickers to avoid key prop warnings
  },
  iosButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  iosButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iosButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DateTimePickerField;




