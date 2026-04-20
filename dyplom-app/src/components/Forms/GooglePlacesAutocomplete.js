import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../styles/colors';

// ВАЖНО: Замените на ваш Google Places API ключ
// Получить можно здесь: https://console.cloud.google.com/google/maps-apis
const GOOGLE_PLACES_API_KEY = 'AIzaSyAk3sGZ7Upt7fmpnTERopgsohBSuDvsW0c';

const GooglePlacesAutocomplete = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'cities', // 'cities' для городов, 'address' для адресов
  onPlaceSelect,
  required = false,
  disableValidation = false,
}) => {
  const [query, setQuery] = useState(value || '');
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef(null);
  const isSelectingRef = useRef(false);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const fetchPredictions = async (input) => {
    if (!input || input.length < 2) {
      setPredictions([]);
      setShowSuggestions(false);
      return;
    }

    if (GOOGLE_PLACES_API_KEY === 'YOUR_GOOGLE_PLACES_API_KEY') {
      console.warn('Google Places API key not configured');
      return;
    }

    setIsLoading(true);
    try {
      // Для городов используем тип (cities) для фильтрации
      // Для адресов используем более широкий поиск
      const types = type === 'cities' ? '(cities)' : 'address';
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=${types}&language=pl&key=${GOOGLE_PLACES_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.predictions) {
        setPredictions(data.predictions);
        setShowSuggestions(true);
      } else {
        setPredictions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
      setPredictions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextChange = (text) => {
    setQuery(text);
    onChange(text);

    // Очищаем предыдущий таймер
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Устанавливаем новый таймер для debounce
    debounceTimer.current = setTimeout(() => {
      fetchPredictions(text);
    }, 300);
  };

  // Функция для парсинга address_components
  const parseAddressComponents = (components) => {
    const result = {
      city: '',
      street: '',
      postalCode: '',
    };

    if (!components || !Array.isArray(components)) {
      return result;
    }

    components.forEach((component) => {
      const types = component.types || [];

      // Город
      if (!result.city) {
        if (types.includes('locality')) {
          result.city = component.long_name;
        } else if (types.includes('administrative_area_level_2')) {
          result.city = component.long_name;
        }
      }

      // Почтовый код
      if (types.includes('postal_code')) {
        result.postalCode = component.long_name;
      }

      // Улица
      if (types.includes('route')) {
        result.street = component.long_name;
      }

      // Номер дома
      if (types.includes('street_number')) {
        result.street = result.street
          ? `${result.street} ${component.long_name}`
          : component.long_name;
      }
    });

    return result;
  };

  const handleSelectPlace = async (prediction) => {
    isSelectingRef.current = true;
    // оставляем suggestions видимыми до завершения выбора
    setShowSuggestions(true);
    const selectedText = prediction.description;
    setQuery(selectedText);
    setShowSuggestions(false);
    setPredictions([]);
    onChange(selectedText);

    // Получаем детали места для координат
    if (onPlaceSelect && GOOGLE_PLACES_API_KEY !== 'YOUR_GOOGLE_PLACES_API_KEY') {
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address,address_components&key=${GOOGLE_PLACES_API_KEY}`;
        const response = await fetch(detailsUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.result) {
          const parsed = parseAddressComponents(data.result.address_components);
          
          onPlaceSelect({
            description: selectedText,
            placeId: prediction.place_id,
            address: data.result.formatted_address,
            location: data.result.geometry?.location,
            addressComponents: data.result.address_components,
            // Парсированные данные
            city: parsed.city,
            street: parsed.street,
            postalCode: parsed.postalCode,
          });
        }
      } catch (error) {
        console.error('Error fetching place details:', error);
        onPlaceSelect({
          description: selectedText,
          placeId: prediction.place_id,
        });
      }
    } else {
      onPlaceSelect?.({
        description: selectedText,
        placeId: prediction.place_id,
      });
    }
  };

  // Проверяем, что выбранное значение есть в списке предложений
  const validateSelection = () => {
    if (query && predictions.length > 0) {
      const isValid = predictions.some(
        (pred) => pred.description.toLowerCase() === query.toLowerCase()
      );
      if (!isValid && query.length >= 2) {
        // Если значение не найдено в списке, очищаем его
        setQuery('');
        onChange('');
      }
    }
  };


  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      ) : null}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.border}
          onFocus={() => {
            if (query.length >= 2) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            // Увеличиваем задержку для обработки onPress в списке
            setTimeout(() => {
              if (!isSelectingRef.current) {
                setShowSuggestions(false);
                if (!disableValidation) {
                  validateSelection();
                }
              }
              isSelectingRef.current = false;
            }, 300);
          }}
          editable={true}
        />
        {isLoading && (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}
      </View>
      {showSuggestions && predictions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {predictions.map((item, index) => (
            <TouchableOpacity
              key={item.place_id}
              style={[
                styles.suggestionItem,
                index === predictions.length - 1 && styles.suggestionItemLast,
              ]}
              onPressIn={() => {
                isSelectingRef.current = true;
              }}
              onPress={() => {
                handleSelectPlace(item);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionText}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 16,
    position: 'relative',
    zIndex: 50,
  },
  label: {
    color: Colors.textSecondary,
    marginBottom: 6,
    fontSize: 12,
  },
  required: {
    color: Colors.accent,
  },
  inputContainer: {
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: Colors.textPrimary,
    fontSize: 16,
    minHeight: 50,
  },
  loader: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 240,
    zIndex: 3000,
    elevation: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionText: {
    color: Colors.textPrimary,
    fontSize: 16,
  },
});

export default GooglePlacesAutocomplete;




