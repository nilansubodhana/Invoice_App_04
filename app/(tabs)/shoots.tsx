import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Alert,
  Platform,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import DatePicker from '@/components/DatePicker';
import TimePicker from '@/components/TimePicker';
import { useTheme } from '@/lib/theme-context';
import {
  ShootEntry,
  ShootType,
  SHOOT_TYPES,
  getAllShoots,
  saveShoot,
  updateShoot,
  deleteShoot,
  searchShoots,
  formatCurrency,
  formatDate,
} from '@/lib/storage';

const SHOOT_TYPE_COLORS: Record<ShootType, string> = {
  'Bridal': '#8B1A4A',
  'Wedding': '#1B4332',
  'Birthday': '#D4531A',
  'Pre-shoot': '#C8A951',
  'Events': '#5B2C8E',
  'Casual': '#6B6560',
  'Commercial': '#2C1810',
};

export default function ShootsTab() {
  const insets = useSafeAreaInsets();
  const { colors: themeColors, invoiceColors } = useTheme();
  const [shoots, setShoots] = useState<ShootEntry[]>([]);
  const [filtered, setFiltered] = useState<ShootEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [clientName, setClientName] = useState('');
  const [shootDate, setShootDate] = useState('');
  const [shootTime, setShootTime] = useState('');
  const [shootLocation, setShootLocation] = useState('');
  const [salonName, setSalonName] = useState('');
  const [modelName, setModelName] = useState('');
  const [shootType, setShootType] = useState<ShootType>('Wedding');
  const [price, setPrice] = useState('');
  const [advancePaid, setAdvancePaid] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');

  const loadShoots = useCallback(async () => {
    const data = await getAllShoots();
    setShoots(data);
    setFiltered(searchQuery ? searchShoots(data, searchQuery) : data);
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadShoots();
    }, [loadShoots])
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setFiltered(text ? searchShoots(shoots, text) : shoots);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShoots();
    setRefreshing(false);
  };

  const resetForm = () => {
    const now = new Date();
    setClientName('');
    setShootDate(now.toISOString().split('T')[0]);
    setShootTime('');
    setShootLocation('');
    setSalonName('');
    setModelName('');
    setShootType('Wedding');
    setPrice('');
    setAdvancePaid('');
    setPhoneNumbers(['']);
    setNotes('');
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const openEditModal = (shoot: ShootEntry) => {
    setEditingId(shoot.id);
    setClientName(shoot.clientName || '');
    setShootDate(shoot.shootDate);
    setShootTime(shoot.shootTime || '');
    setShootLocation(shoot.shootLocation);
    setSalonName(shoot.salonName || '');
    setModelName(shoot.modelName || '');
    setShootType(shoot.shootType);
    setPrice(shoot.price);
    setAdvancePaid(shoot.advancePaid || '');
    const nums = shoot.phoneNumber ? shoot.phoneNumber.split(',').map(n => n.trim()) : [''];
    setPhoneNumbers(nums.length > 0 ? nums : ['']);
    setNotes(shoot.notes);
    setModalVisible(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateShoot(editingId, {
          clientName: clientName.trim(),
          shootDate,
          shootTime: shootTime.trim(),
          shootLocation: shootLocation.trim(),
          salonName: salonName.trim(),
          modelName: modelName.trim(),
          shootType,
          price,
          advancePaid,
          phoneNumber: phoneNumbers.map(n => n.trim()).filter(n => n).join(', '),
          notes: notes.trim(),
        });
      } else {
        await saveShoot({
          clientName: clientName.trim(),
          shootDate,
          shootTime: shootTime.trim(),
          shootLocation: shootLocation.trim(),
          salonName: salonName.trim(),
          modelName: modelName.trim(),
          shootType,
          price,
          advancePaid,
          phoneNumber: phoneNumbers.map(n => n.trim()).filter(n => n).join(', '),
          notes: notes.trim(),
        });
      }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      loadShoots();
    } catch {
      Alert.alert('Error', 'Failed to save shoot entry');
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Shoot',
      `Delete the shoot entry for ${name || 'this shoot'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteShoot(id);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadShoots();
          },
        },
      ]
    );
  };

  const totalIncome = shoots.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const renderShootCard = ({ item }: { item: ShootEntry }) => {
    const shootPrice = parseFloat(item.price) || 0;
    const advance = parseFloat(item.advancePaid) || 0;
    const balance = shootPrice - advance;
    const typeColor = SHOOT_TYPE_COLORS[item.shootType] || Colors.primary;

    return (
      <Pressable
        style={({ pressed }) => [styles.shootCard, { backgroundColor: themeColors.cardBackground, shadowColor: themeColors.shadow }, pressed && styles.cardPressed]}
        onPress={() => openEditModal(item)}
        onLongPress={() => handleDelete(item.id, item.clientName || item.shootLocation)}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={[styles.typeIndicator, { backgroundColor: typeColor }]}>
              <MaterialCommunityIcons
                name={item.shootType === 'Bridal' ? 'crown' : item.shootType === 'Wedding' ? 'heart' : item.shootType === 'Birthday' ? 'cake-variant' : item.shootType === 'Pre-shoot' ? 'camera-iris' : item.shootType === 'Events' ? 'party-popper' : item.shootType === 'Commercial' ? 'briefcase' : 'account'}
                size={16}
                color={Colors.white}
              />
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardModel, { color: themeColors.textPrimary }]} numberOfLines={1}>
                {item.clientName || item.shootLocation}
              </Text>
              <View style={styles.typeDateRow}>
                <View style={styles.typeBadge}>
                  <Text style={[styles.typeBadgeText, { color: typeColor }]}>{item.shootType}</Text>
                </View>
                <Text style={[styles.cardDateText, { color: themeColors.textMuted }]}>{formatDate(item.shootDate)}</Text>
                {item.shootTime ? <Text style={[styles.cardTimeText, { color: themeColors.textMuted }]}>{item.shootTime}</Text> : null}
              </View>
            </View>
          </View>
        </View>
        <View style={[styles.cardBottom, { borderTopColor: themeColors.border }]}>
          {item.shootLocation ? (
            <View style={styles.cardMeta}>
              <Feather name="map-pin" size={12} color={themeColors.textMuted} />
              <Text style={[styles.metaText, { color: themeColors.textMuted }]} numberOfLines={1}>{item.shootLocation}</Text>
            </View>
          ) : null}
          {item.salonName ? (
            <View style={styles.cardMeta}>
              <MaterialCommunityIcons name="store" size={12} color={themeColors.textMuted} />
              <Text style={[styles.metaText, { color: themeColors.textMuted }]} numberOfLines={1}>{item.salonName}</Text>
            </View>
          ) : null}
          {item.modelName ? (
            <View style={styles.cardMeta}>
              <Feather name="user" size={12} color={themeColors.textMuted} />
              <Text style={[styles.metaText, { color: themeColors.textMuted }]} numberOfLines={1}>{item.modelName}</Text>
            </View>
          ) : null}
          {item.phoneNumber ? (
            <View style={styles.cardMeta}>
              <Feather name="phone" size={12} color={themeColors.textMuted} />
              <Text style={[styles.metaText, { color: themeColors.textMuted }]}>{item.phoneNumber}</Text>
            </View>
          ) : null}
          {shootPrice > 0 && (
            <View style={styles.priceRow}>
              <View style={styles.cardMeta}>
                <MaterialCommunityIcons name="cash" size={13} color={themeColors.textMuted} />
                <Text style={[styles.cardPrice, { color: invoiceColors.darkGreen }]}>LKR {formatCurrency(shootPrice)}</Text>
              </View>
              {advance > 0 && (
                <Text style={[styles.balanceText, { color: balance > 0 ? Colors.danger : '#27AE60' }]}>
                  {balance > 0 ? `Bal: ${formatCurrency(balance)}` : 'Paid'}
                </Text>
              )}
            </View>
          )}
          <View style={styles.cardActions}>
            <Pressable onPress={() => openEditModal(item)} hitSlop={10}>
              <Feather name="edit-2" size={16} color={themeColors.textMuted} />
            </Pressable>
            <Pressable onPress={() => handleDelete(item.id, item.clientName || item.shootLocation)} hitSlop={10}>
              <Feather name="trash-2" size={16} color={Colors.danger} />
            </Pressable>
          </View>
        </View>
        {item.notes ? (
          <Text style={[styles.notesText, { color: themeColors.textMuted, borderTopColor: themeColors.border }]} numberOfLines={2}>{item.notes}</Text>
        ) : null}
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="camera-off" size={48} color={themeColors.textMuted} />
      <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>No Shoots Logged</Text>
      <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>Tap + to add your first daily shoot</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Daily Shoots</Text>
          <Text style={styles.headerSub}>SHOOT LOG</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => setShowSearch(!showSearch)} hitSlop={8}>
            <Feather name="search" size={20} color={themeColors.textPrimary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            onPress={openAddModal}
          >
            <Ionicons name="add" size={24} color={Colors.white} />
          </Pressable>
        </View>
      </View>

      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border }]}>
          <Feather name="search" size={16} color={themeColors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.textPrimary }]}
            placeholder="Search by location, model, type..."
            placeholderTextColor={themeColors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => handleSearch('')} hitSlop={8}>
              <Feather name="x" size={16} color={themeColors.textMuted} />
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: themeColors.cardBackground, shadowColor: themeColors.shadow }]}>
          <View style={styles.statIconWrap}>
            <MaterialCommunityIcons name="camera" size={18} color={Colors.darkGreen} />
          </View>
          <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{shoots.length}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Total Shoots</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: themeColors.cardBackground, shadowColor: themeColors.shadow }]}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.cream }]}>
            <MaterialCommunityIcons name="cash-multiple" size={18} color={Colors.goldDark} />
          </View>
          <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{formatCurrency(totalIncome)}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Total Income</Text>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={[styles.listTitle, { color: themeColors.textPrimary }]}>{searchQuery ? 'Search Results' : 'Recent Shoots'}</Text>
        <Text style={[styles.listCount, { color: themeColors.textMuted }]}>{filtered.length} entries</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderShootCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 20 },
          filtered.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor: themeColors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'web' ? 20 : insets.top + 10, borderBottomColor: themeColors.border }]}>
            <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={themeColors.textPrimary} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>{editingId ? 'Edit Shoot' : 'New Shoot'}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Client Info</Text>
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Client Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border, color: themeColors.textPrimary }]}
                  value={clientName}
                  onChangeText={setClientName}
                  placeholder="Client or couple name"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Salon Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border, color: themeColors.textPrimary }]}
                    value={salonName}
                    onChangeText={setSalonName}
                    placeholder="Salon (optional)"
                    placeholderTextColor={themeColors.textMuted}
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Model Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border, color: themeColors.textPrimary }]}
                    value={modelName}
                    onChangeText={setModelName}
                    placeholder="Model (optional)"
                    placeholderTextColor={themeColors.textMuted}
                  />
                </View>
              </View>
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Contact Numbers</Text>
                {phoneNumbers.map((num, idx) => (
                  <View key={idx} style={styles.phoneRow}>
                    <TextInput
                      style={[styles.input, styles.phoneInput, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border, color: themeColors.textPrimary }]}
                      value={num}
                      onChangeText={(text) => {
                        const updated = [...phoneNumbers];
                        updated[idx] = text;
                        setPhoneNumbers(updated);
                      }}
                      placeholder={idx === 0 ? "Phone number" : "Additional number"}
                      placeholderTextColor={themeColors.textMuted}
                      keyboardType="phone-pad"
                    />
                    {phoneNumbers.length > 1 && (
                      <TouchableOpacity
                        onPress={() => {
                          const updated = phoneNumbers.filter((_, i) => i !== idx);
                          setPhoneNumbers(updated);
                        }}
                        style={styles.phoneRemoveBtn}
                      >
                        <Ionicons name="close-circle" size={22} color={themeColors.danger || '#e74c3c'} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity
                  onPress={() => setPhoneNumbers([...phoneNumbers, ''])}
                  style={[styles.addPhoneBtn, { borderColor: themeColors.accent }]}
                >
                  <Ionicons name="add-circle-outline" size={18} color={themeColors.accent} />
                  <Text style={[styles.addPhoneText, { color: themeColors.accent }]}>Add Number</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Schedule</Text>
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Shoot Date</Text>
                  <DatePicker
                    value={shootDate}
                    onChange={setShootDate}
                    placeholder="Select date"
                    colors={{
                      background: themeColors.background,
                      cardBackground: themeColors.cardBackground,
                      textPrimary: themeColors.textPrimary,
                      textSecondary: themeColors.textSecondary,
                      textMuted: themeColors.textMuted,
                      border: themeColors.border,
                      accent: invoiceColors.gold,
                      accentDark: invoiceColors.darkGreen,
                    }}
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Time</Text>
                  <TimePicker
                    value={shootTime}
                    onChange={setShootTime}
                    placeholder="Select time"
                    colors={{
                      background: themeColors.background,
                      cardBackground: themeColors.cardBackground,
                      textPrimary: themeColors.textPrimary,
                      textSecondary: themeColors.textSecondary,
                      textMuted: themeColors.textMuted,
                      border: themeColors.border,
                      accent: invoiceColors.gold,
                    }}
                  />
                </View>
              </View>
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Location</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border, color: themeColors.textPrimary }]}
                  value={shootLocation}
                  onChangeText={setShootLocation}
                  placeholder="Venue or location"
                  placeholderTextColor={themeColors.textMuted}
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Shoot Type</Text>
              <View style={styles.typeGrid}>
                {SHOOT_TYPES.map(type => (
                  <Pressable
                    key={type}
                    style={[
                      styles.typeChip,
                      { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border },
                      shootType === type && { backgroundColor: SHOOT_TYPE_COLORS[type], borderColor: SHOOT_TYPE_COLORS[type] },
                    ]}
                    onPress={() => {
                      setShootType(type);
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={[
                      styles.typeChipText,
                      { color: themeColors.textSecondary },
                      shootType === type && { color: Colors.white },
                    ]}>
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Pricing</Text>
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Package Price (LKR)</Text>
                  <TextInput
                    style={[styles.input, styles.priceInput, { backgroundColor: themeColors.cardBackground, color: themeColors.textPrimary, borderColor: invoiceColors.gold }]}
                    value={price}
                    onChangeText={setPrice}
                    placeholder="0.00"
                    placeholderTextColor={themeColors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Advance Paid (LKR)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border, color: themeColors.textPrimary }]}
                    value={advancePaid}
                    onChangeText={setAdvancePaid}
                    placeholder="0.00"
                    placeholderTextColor={themeColors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border, color: themeColors.textPrimary }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Special instructions, reminders..."
                placeholderTextColor={themeColors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 10, backgroundColor: themeColors.background, borderTopColor: themeColors.border }]}>
            <Pressable
              style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
              onPress={handleSave}
            >
              <MaterialCommunityIcons name={editingId ? 'check' : 'plus'} size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>{editingId ? 'Update Shoot' : 'Add Shoot'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: Colors.primary,
  },
  headerSub: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.gold,
    letterSpacing: 4,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.darkGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  listCount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  emptyList: {
    flex: 1,
  },
  shootCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIndicator: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardModel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  typeDateRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  typeBadge: {
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  cardPrice: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: Colors.darkGreen,
  },
  cardDateText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
  },
  cardTimeText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
  },
  priceRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between' as const,
    flex: 1,
  },
  balanceText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  cardBottom: {
    flexDirection: 'column' as const,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    gap: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row' as const,
    gap: 14,
    alignSelf: 'flex-end' as const,
  },
  notesText: {
    fontSize: 11,
    fontFamily: 'Inter_300Light',
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    marginTop: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  fieldWrap: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  phoneRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  phoneInput: {
    flex: 1,
  },
  phoneRemoveBtn: {
    marginLeft: 8,
    padding: 4,
  },
  addPhoneBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    alignSelf: 'flex-start' as const,
    marginTop: 4,
  },
  addPhoneText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginLeft: 6,
  },
  priceInput: {
    borderColor: Colors.gold,
    borderWidth: 1.5,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    paddingVertical: 14,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.darkGreen,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.darkGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
});
