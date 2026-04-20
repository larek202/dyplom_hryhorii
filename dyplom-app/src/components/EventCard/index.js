import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/colors';
import { getEventCoverImageUri } from '../../utils/eventCoverImage';

const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const EventCard = ({
  item,
  onPress,
  isFavorite,
  onFavoriteToggle,
  onBook,
  bookingState = 'free', // 'free' | 'booked'
}) => {
  const fallbackImage = require('../../../assets/icon.png');
  const imageUri = getEventCoverImageUri(item);
  const imageSource = imageUri ? { uri: imageUri } : fallbackImage;
  
  // Используем _id для MongoDB или id для других источников
  const eventId = item._id || item.id;

  const categories = Array.isArray(item.categories) && item.categories.length > 0
    ? item.categories.filter(Boolean)
    : item.category
      ? [item.category]
      : [];
  const visibleCategories = categories.slice(0, 2);
  const categoryLabel = visibleCategories.length
    ? `${visibleCategories.join(', ')}${categories.length > 2 ? ' +' : ''}`
    : '';

  return (
    <View style={styles.card}>
      <Image
        source={imageSource}
        style={styles.image}
        resizeMode="cover"
        onError={(error) => {
          console.log('❌ Error loading image in EventCard:', imageUri);
          console.log('Error details:', error.nativeEvent?.error);
        }}
        onLoad={() => {
          console.log('✅ Image loaded successfully:', imageUri);
        }}
      />
      <TouchableOpacity
        style={styles.favoriteToggle}
        onPress={() => onFavoriteToggle?.(eventId)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={22}
          color={isFavorite ? Colors.danger : Colors.surface}
        />
      </TouchableOpacity>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.category}>
            {categoryLabel}
          </Text>
          <Text style={styles.city}>{item.city}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.date}>{formatDateTime(item.date)}</Text>
          <Text style={styles.slots}>
            {item.booked}/{item.slots} zajęte
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.viewButton} onPress={() => onPress?.(item)}>
            <Text style={styles.viewButtonText}>Zobacz szczegóły</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.bookButton,
              bookingState === 'booked' && styles.bookedButton,
            ]}
            onPress={() => onBook?.(item)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.bookButtonText,
                bookingState === 'booked' && styles.bookedButtonText,
              ]}
            >
              {bookingState === 'booked' ? 'Zarezerwowane' : 'Rezerwuj'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: Colors.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: 16,
  },
  favoriteToggle: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(15,23,42,0.6)',
    padding: 6,
    borderRadius: 22,
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  category: {
    color: Colors.secondary,
    fontWeight: '600',
  },
  city: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  date: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  slots: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  viewButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    marginRight: 8,
  },
  viewButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  bookButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  bookedButton: {
    backgroundColor: Colors.primary + '22',
  },
  bookButtonText: {
    color: Colors.surface,
    fontWeight: '600',
  },
  bookedButtonText: {
    color: Colors.textPrimary,
  },
});

export default EventCard;

