import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PinchGestureHandler,
  TapGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { Colors } from '../../styles/colors';

const ImagePickerField = ({
  label,
  images = [],
  onChange,
  maxImages = 10,
  coverIndex: coverIndexProp = 0,
  onCoverIndexChange,
}) => {
  const [selectedImages, setSelectedImages] = useState(images);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImage, setViewerImage] = useState(null);
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const lastScale = useRef(1);
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastTranslate = useRef({ x: 0, y: 0 });
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const tapRef = useRef(null);
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const fallbackImage = require('../../../assets/icon.png');
  const fallbackImageUri = Image.resolveAssetSource(fallbackImage).uri;
  const zoomScale = useMemo(
    () => Animated.multiply(baseScale, pinchScale),
    [baseScale, pinchScale]
  );

  // Sync internal state when parent updates images (e.g., editing existing event)
  useEffect(() => {
    setSelectedImages(images);
  }, [images]);

  const clamp = useCallback((value, min, max) => Math.min(Math.max(value, min), max), []);
  const clampTranslate = useCallback(
    (scale, nextX, nextY) => {
      const boundedScale = Math.max(1, scale || 1);
      const maxX = ((boundedScale - 1) * screenWidth) / 2 + screenWidth / 2;
      const maxY = ((boundedScale - 1) * screenHeight) / 2 + screenHeight / 2;
      return {
        x: clamp(nextX, -maxX, maxX),
        y: clamp(nextY, -maxY, maxY),
      };
    },
    [clamp, screenWidth, screenHeight]
  );

  const resetZoom = useCallback(() => {
    lastScale.current = 1;
    baseScale.setValue(1);
    pinchScale.setValue(1);
    lastTranslate.current = { x: 0, y: 0 };
    translateX.setOffset(0);
    translateY.setOffset(0);
    translateX.setValue(0);
    translateY.setValue(0);
  }, [baseScale, pinchScale, translateX, translateY]);

  const openViewer = useCallback(
    (uri) => {
      resetZoom();
      setViewerImage(uri);
      setViewerVisible(true);
    },
    [resetZoom]
  );

  const closeViewer = useCallback(() => {
    setViewerVisible(false);
  }, []);

  const onPinchGestureEvent = useMemo(
    () => Animated.event([{ nativeEvent: { scale: pinchScale } }], { useNativeDriver: true }),
    [pinchScale]
  );

  const onPinchStateChange = useCallback(
    ({ nativeEvent }) => {
      if (nativeEvent.state === State.END || nativeEvent.state === State.CANCELLED) {
        const nextScale = Math.max(1, Math.min(3, lastScale.current * nativeEvent.scale));
        lastScale.current = nextScale;
        baseScale.setValue(nextScale);
        pinchScale.setValue(1);
        const clamped = clampTranslate(nextScale, lastTranslate.current.x, lastTranslate.current.y);
        lastTranslate.current = clamped;
        translateX.setOffset(clamped.x);
        translateY.setOffset(clamped.y);
        translateX.setValue(0);
        translateY.setValue(0);
      }
    },
    [baseScale, pinchScale, clampTranslate, translateX, translateY]
  );

  const onPanGestureEvent = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
        { useNativeDriver: true }
      ),
    [translateX, translateY]
  );

  const onPanStateChange = useCallback(
    ({ nativeEvent }) => {
      if (nativeEvent.state === State.END || nativeEvent.state === State.CANCELLED) {
        const nextX = lastTranslate.current.x + nativeEvent.translationX;
        const nextY = lastTranslate.current.y + nativeEvent.translationY;
        const clamped = clampTranslate(lastScale.current, nextX, nextY);
        lastTranslate.current = clamped;
        translateX.setOffset(clamped.x);
        translateY.setOffset(clamped.y);
        translateX.setValue(0);
        translateY.setValue(0);
      }
    },
    [clampTranslate, translateX, translateY]
  );

  const onDoubleTap = useCallback(
    (tapX, tapY) => {
      const nextScale = lastScale.current > 1 ? 1 : 2;
      const centerX = screenWidth / 2;
      const centerY = screenHeight / 2;
      const deltaX = (centerX - tapX) * (nextScale - 1);
      const deltaY = (centerY - tapY) * (nextScale - 1);
      lastScale.current = nextScale;
      baseScale.setValue(nextScale);
      pinchScale.setValue(1);
      const clamped = clampTranslate(nextScale, deltaX, deltaY);
      lastTranslate.current = clamped;
      translateX.setOffset(clamped.x);
      translateY.setOffset(clamped.y);
      translateX.setValue(0);
      translateY.setValue(0);
    },
    [baseScale, pinchScale, clampTranslate, translateX, translateY, screenWidth, screenHeight]
  );

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Brak uprawnień',
        'Potrzebujemy dostępu do galerii, aby dodać zdjęcia.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    if (selectedImages.length >= maxImages) {
      Alert.alert('Limit', `Możesz dodać maksymalnie ${maxImages} zdjęć`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newImage = result.assets[0].uri;
        const updatedImages = [...selectedImages, newImage];
        setSelectedImages(updatedImages);
        onChange(updatedImages);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Błąd', 'Nie udało się wybrać zdjęcia');
    }
  };

  const removeImage = (index) => {
    const updatedImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(updatedImages);
    onChange(updatedImages);
    if (onCoverIndexChange) {
      let next = coverIndexProp;
      if (index < coverIndexProp) next = coverIndexProp - 1;
      else if (index === coverIndexProp) next = Math.min(coverIndexProp, updatedImages.length - 1);
      else next = coverIndexProp;
      onCoverIndexChange(Math.max(0, next));
    }
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      
      <TouchableOpacity
        style={styles.addButton}
        onPress={pickImage}
        activeOpacity={0.7}
      >
        <Ionicons name="camera-outline" size={24} color={Colors.primary} />
        <Text style={styles.addButtonText}>
          {selectedImages.length > 0
            ? `Dodaj więcej (${selectedImages.length}/${maxImages})`
            : 'Dodaj zdjęcia'}
        </Text>
      </TouchableOpacity>

      {selectedImages.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageContainer}
          contentContainerStyle={styles.imageList}
        >
          {selectedImages.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => openViewer(uri)}>
                <Image source={{ uri }} style={styles.image} />
              </TouchableOpacity>
              {onCoverIndexChange ? (
                <TouchableOpacity
                  style={styles.coverStar}
                  onPress={() => onCoverIndexChange(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={index === coverIndexProp ? 'star' : 'star-outline'}
                    size={22}
                    color={index === coverIndexProp ? Colors.primary : Colors.textSecondary}
                  />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(index)}
              >
                <Ionicons name="close-circle" size={24} color={Colors.accent} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={closeViewer}
      >
        <GestureHandlerRootView style={styles.viewerRoot}>
          <View style={[styles.viewerSafeArea, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity
              style={[styles.viewerClose, { top: insets.top + 8 }]}
              onPress={closeViewer}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={28} color={Colors.surface} />
            </TouchableOpacity>
            <PanGestureHandler
              ref={panRef}
              onGestureEvent={onPanGestureEvent}
              onHandlerStateChange={onPanStateChange}
              simultaneousHandlers={[pinchRef, tapRef]}
            >
              <Animated.View style={styles.viewerGestureArea}>
                <TapGestureHandler
                  ref={tapRef}
                  numberOfTaps={2}
                  onHandlerStateChange={({ nativeEvent }) => {
                    if (nativeEvent.state === State.END) {
                      onDoubleTap(nativeEvent.x, nativeEvent.y);
                    }
                  }}
                  simultaneousHandlers={[panRef, pinchRef]}
                >
                  <Animated.View style={styles.viewerTapArea}>
                    <PinchGestureHandler
                      ref={pinchRef}
                      onGestureEvent={onPinchGestureEvent}
                      onHandlerStateChange={onPinchStateChange}
                      simultaneousHandlers={[panRef, tapRef]}
                    >
                      <Animated.View style={styles.viewerImageWrap} collapsable={false}>
                        <Animated.Image
                          source={{ uri: viewerImage || fallbackImageUri }}
                          style={[
                            styles.viewerImage,
                            { transform: [{ translateX }, { translateY }, { scale: zoomScale }] },
                          ]}
                          resizeMode="contain"
                        />
                      </Animated.View>
                    </PinchGestureHandler>
                  </Animated.View>
                </TapGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          </View>
        </GestureHandlerRootView>
      </Modal>
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
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
  },
  addButtonText: {
    marginLeft: 8,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  imageContainer: {
    marginTop: 12,
  },
  imageList: {
    paddingRight: 16,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
    paddingTop: 8,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: Colors.border,
  },
  coverStar: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 14,
    padding: 4,
  },
  removeButton: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: 'rgba(255, 255, 255)', // темный фон для читаемости
    borderRadius: 12,
    
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  viewerRoot: {
    flex: 1,
  },
  viewerSafeArea: {
    flex: 1,
    backgroundColor: 'rgba(7, 12, 24, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  viewerGestureArea: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerTapArea: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  viewerImageWrap: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerClose: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    elevation: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 18,
    padding: 6,
  },
});

export default ImagePickerField;


