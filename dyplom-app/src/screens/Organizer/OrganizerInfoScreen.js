import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Colors } from '../../styles/colors';

const OrganizerInfoScreen = ({ route }) => {
  const organizer = useMemo(
    () => route?.params?.organizer || {},
    [route?.params?.organizer]
  );
  const address = useMemo(() => {
    if (!organizer?.address) return '';
    if (typeof organizer.address === 'string') return organizer.address;
    const { street, city, zipCode, country } = organizer.address || {};
    return [street, city, zipCode, country].filter(Boolean).join(', ');
  }, [organizer]);

  const openUrl = (url) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Informacje o organizatorze</Text>
        <View style={styles.card}>
          {organizer.logoUrl ? (
            <Image source={{ uri: organizer.logoUrl }} style={styles.logoTop} />
          ) : null}
          <View style={styles.headerText}>
            <Text style={styles.name}>{organizer.name || 'Organizator'}</Text>
            {organizer.city ? <Text style={styles.city}>{organizer.city}</Text> : null}
          </View>

          {organizer.description ? (
            <Text style={styles.description}>{organizer.description}</Text>
          ) : null}

          {address ? (
            <View style={styles.row}>
              <Text style={styles.label}>Adres</Text>
              <Text style={styles.value} numberOfLines={2}>
                {address}
              </Text>
            </View>
          ) : null}
          {organizer.contactEmail ? (
            <View style={styles.row}>
              <Text style={styles.label}>E-mail</Text>
              <Text style={styles.value}>{organizer.contactEmail}</Text>
            </View>
          ) : null}
          {organizer.contactPhone ? (
            <View style={styles.row}>
              <Text style={styles.label}>Telefon</Text>
              <Text style={styles.value}>{organizer.contactPhone}</Text>
            </View>
          ) : null}
          {organizer.website ? (
            <TouchableOpacity style={styles.row} onPress={() => openUrl(organizer.website)}>
              <Text style={styles.label}>Strona</Text>
              <Text style={styles.link} numberOfLines={1}>
                {organizer.website}
              </Text>
            </TouchableOpacity>
          ) : null}
          {organizer.facebook ? (
            <TouchableOpacity style={styles.row} onPress={() => openUrl(organizer.facebook)}>
              <Text style={styles.label}>Facebook</Text>
              <Text style={styles.link} numberOfLines={1}>
                {organizer.facebook}
              </Text>
            </TouchableOpacity>
          ) : null}
          {organizer.instagram ? (
            <TouchableOpacity style={styles.row} onPress={() => openUrl(organizer.instagram)}>
              <Text style={styles.label}>Instagram</Text>
              <Text style={styles.link} numberOfLines={1}>
                {organizer.instagram}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 16) : 16,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerText: {
    marginBottom: 8,
  },
  logoTop: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: 'center',
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  city: {
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  description: {
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
    textAlign: 'right',
  },
  link: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
    textAlign: 'right',
  },
});

export default OrganizerInfoScreen;

