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
import { scheduleShootReminder, cancelReminder } from '@/lib/notifications';
import { useTheme } from '@/lib/theme-context';
import {
  UpcomingShoot,
  ShootType,
  SHOOT_TYPES,
  getAllUpcomingShoots,
  saveUpcomingShoot,
  updateUpcomingShoot,
  deleteUpcomingShoot,
  getUpcomingShootsFromToday,
  getDaysUntil,
  getDaysUntilLabel,
  formatCurrency,
  formatDate,
  saveShoot,
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

export default function UpcomingTab() {
  const insets = useSafeAreaInsets();
  const { colors: themeColors, invoiceColors } = useTheme();
  const [allShoots, setAllShoots] = useState<UpcomingShoot[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
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
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(['']);
  const [packagePrice, setPackagePrice] = useState('');
  const [advancePaid, setAdvancePaid] = useState('');
  const [notes, setNotes] = useState('');

  const loadShoots = useCallback(async () => {
    const data = await getAllUpcomingShoots();
    setAllShoots(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadShoots();
    }, [loadShoots])
  );

  const upcomingShoots = getUpcomingShootsFromToday(allShoots);
  const completedShoots = allShoots.filter(s => s.completed);
  const overdueShoots = allShoots.filter(s => !s.completed && getDaysUntil(s.shootDate) < 0);
  const displayList = showCompleted ? completedShoots : [...overdueShoots, ...upcomingShoots];

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShoots();
    setRefreshing(false);
  };

  const resetForm = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setClientName('');
    setShootDate(tomorrow.toISOString().split('T')[0]);
    setShootTime('');
    setShootLocation('');
    setSalonName('');
    setModelName('');
    setShootType('Wedding');
    setPhoneNumbers(['']);
    setPackagePrice('');
    setAdvancePaid('');
    setNotes('');
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const openEditModal = (shoot: UpcomingShoot) => {
    setEditingId(shoot.id);
    setClientName(shoot.clientName);
    setShootDate(shoot.shootDate);
    setShootTime(shoot.shootTime);
    setShootLocation(shoot.shootLocation);
    setSalonName(shoot.salonName || '');
    setModelName(shoot.modelName || '');
    setShootType(shoot.shootType);
    const nums = shoot.contactNumber ? shoot.contactNumber.split(',').map(n => n.trim()) : [''];
    setPhoneNumbers(nums.length > 0 ? nums : ['']);
    setPackagePrice(shoot.packagePrice);
    setAdvancePaid(shoot.advancePaid);
    setNotes(shoot.notes);
    setModalVisible(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateUpcomingShoot(editingId, {
          clientName: clientName.trim(),
          shootDate,
          shootTime: shootTime.trim(),
          shootLocation: shootLocation.trim(),
          salonName: salonName.trim(),
          modelName: modelName.trim(),
          shootType,
          contactNumber: phoneNumbers.map(n => n.trim()).filter(n => n).join(', '),
          packagePrice,
          advancePaid,
          notes: notes.trim(),
        });
        scheduleShootReminder(editingId, clientName.trim(), shootDate, shootTime.trim(), shootType, shootLocation.trim()).catch(() => {});
      } else {
        const newShoot = await saveUpcomingShoot({
          clientName: clientName.trim(),
          shootDate,
          shootTime: shootTime.trim(),
          shootLocation: shootLocation.trim(),
          salonName: salonName.trim(),
          modelName: modelName.trim(),
          shootType,
          contactNumber: phoneNumbers.map(n => n.trim()).filter(n => n).join(', '),
          packagePrice,
          advancePaid,
          notes: notes.trim(),
          completed: false,
        });
        scheduleShootReminder(newShoot.id, clientName.trim(), shootDate, shootTime.trim(), shootType, shootLocation.trim()).catch(() => {});
      }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      loadShoots();
    } catch {
      Alert.alert('Error', 'Failed to save upcoming shoot');
    }
  };

  const handleToggleComplete = async (shoot: UpcomingShoot) => {
    const markingComplete = !shoot.completed;
    await updateUpcomingShoot(shoot.id, { completed: markingComplete });
    if (markingComplete) {
      cancelReminder(`shoot_${shoot.id}`).catch(() => {});
      try {
        await saveShoot({
          clientName: shoot.clientName,
          shootDate: shoot.shootDate,
          shootTime: shoot.shootTime || '',
          shootLocation: shoot.shootLocation,
          salonName: shoot.salonName || '',
          modelName: shoot.modelName || '',
          shootType: shoot.shootType,
          price: shoot.packagePrice || '0',
          advancePaid: shoot.advancePaid || '',
          phoneNumber: shoot.contactNumber || '',
          notes: shoot.notes || '',
        });
      } catch {}
    } else {
      scheduleShootReminder(shoot.id, shoot.clientName, shoot.shootDate, shoot.shootTime, shoot.shootType, shoot.shootLocation).catch(() => {});
    }
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    loadShoots();
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Shoot',
      `Remove the upcoming shoot for ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteUpcomingShoot(id);
            cancelReminder(`shoot_${id}`).catch(() => {});
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadShoots();
          },
        },
      ]
    );
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const getCountdownStyle = (dateStr: string) => {
    const days = getDaysUntil(dateStr);
    if (days < 0) return { bg: '#FDEDEE', color: Colors.danger, label: 'OVERDUE' };
    if (days === 0) return { bg: '#E8F5E9', color: '#27AE60', label: 'TODAY' };
    if (days === 1) return { bg: '#FFF8E1', color: '#F39C12', label: 'TOMORROW' };
    if (days <= 3) return { bg: '#FFF3E0', color: '#E67E22', label: getDaysUntilLabel(dateStr) };
    if (days <= 7) return { bg: '#E3F2FD', color: '#2196F3', label: getDaysUntilLabel(dateStr) };
    return { bg: themeColors.cardBackground, color: themeColors.textMuted, label: getDaysUntilLabel(dateStr) };
  };

  const renderShootCard = ({ item }: { item: UpcomingShoot }) => {
    const countdown = getCountdownStyle(item.shootDate);
    const typeColor = SHOOT_TYPE_COLORS[item.shootType] || Colors.primary;
    const price = parseFloat(item.packagePrice) || 0;
    const advance = parseFloat(item.advancePaid) || 0;
    const balance = price - advance;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.shootCard,
          { backgroundColor: themeColors.cardBackground },
          item.completed && styles.completedCard,
          pressed && styles.cardPressed,
        ]}
        onPress={() => openEditModal(item)}
        onLongPress={() => handleDelete(item.id, item.clientName)}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.cardLeftSection}>
            <Pressable
              style={[styles.checkCircle, item.completed && { backgroundColor: '#27AE60', borderColor: '#27AE60' }, { borderColor: typeColor }]}
              onPress={() => handleToggleComplete(item)}
              hitSlop={10}
              testID={`complete-shoot-${item.id}`}
              accessibilityLabel={`Mark ${item.clientName} as ${item.completed ? 'incomplete' : 'complete'}`}
              accessibilityRole="checkbox"
            >
              {item.completed && <Ionicons name="checkmark" size={14} color="#fff" />}
            </Pressable>
            <View style={styles.cardMainInfo}>
              <Text style={[styles.clientName, { color: themeColors.textPrimary }, item.completed && styles.completedText]} numberOfLines={1}>
                {item.clientName}
              </Text>
              <View style={styles.typeDateRow}>
                <View style={[styles.typeBadge, { backgroundColor: typeColor + '18' }]}>
                  <Text style={[styles.typeBadgeText, { color: typeColor }]}>{item.shootType}</Text>
                </View>
                <Text style={[styles.dateText, { color: themeColors.textMuted }]}>{formatDate(item.shootDate)}</Text>
                {item.shootTime ? <Text style={[styles.timeText, { color: themeColors.textMuted }]}>{item.shootTime}</Text> : null}
              </View>
            </View>
          </View>
          {!item.completed && (
            <View style={[styles.countdownBadge, { backgroundColor: countdown.bg }]}>
              <Text style={[styles.countdownText, { color: countdown.color }]}>{countdown.label}</Text>
            </View>
          )}
        </View>

        <View style={[styles.cardDetails, { borderTopColor: themeColors.border }]}>
          {item.shootLocation ? (
            <View style={styles.detailRow}>
              <Feather name="map-pin" size={13} color={themeColors.textMuted} />
              <Text style={[styles.detailText, { color: themeColors.textSecondary }]} numberOfLines={1}>{item.shootLocation}</Text>
            </View>
          ) : null}
          {item.salonName ? (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="store" size={13} color={themeColors.textMuted} />
              <Text style={[styles.detailText, { color: themeColors.textSecondary }]} numberOfLines={1}>{item.salonName}</Text>
            </View>
          ) : null}
          {item.modelName ? (
            <View style={styles.detailRow}>
              <Feather name="user" size={13} color={themeColors.textMuted} />
              <Text style={[styles.detailText, { color: themeColors.textSecondary }]} numberOfLines={1}>{item.modelName}</Text>
            </View>
          ) : null}
          {item.contactNumber ? (
            <View style={styles.detailRow}>
              <Feather name="phone" size={13} color={themeColors.textMuted} />
              <Text style={[styles.detailText, { color: themeColors.textSecondary }]}>{item.contactNumber}</Text>
            </View>
          ) : null}
          {price > 0 && (
            <View style={styles.priceRow}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="cash" size={14} color={themeColors.textMuted} />
                <Text style={[styles.priceText, { color: invoiceColors.darkGreen }]}>LKR {formatCurrency(price)}</Text>
              </View>
              {advance > 0 && (
                <Text style={[styles.balanceText, { color: balance > 0 ? Colors.danger : '#27AE60' }]}>
                  {balance > 0 ? `Bal: ${formatCurrency(balance)}` : 'Paid'}
                </Text>
              )}
            </View>
          )}
        </View>

        {item.notes ? (
          <Text style={[styles.notesPreview, { color: themeColors.textMuted, borderTopColor: themeColors.border }]} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}

        <View style={styles.cardActions}>
          <Pressable onPress={() => openEditModal(item)} hitSlop={10}>
            <Feather name="edit-2" size={15} color={themeColors.textMuted} />
          </Pressable>
          <Pressable onPress={() => handleDelete(item.id, item.clientName)} hitSlop={10}>
            <Feather name="trash-2" size={15} color={Colors.danger} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="calendar-check" size={48} color={themeColors.textMuted} />
      <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
        {showCompleted ? 'No Completed Shoots' : 'No Upcoming Shoots'}
      </Text>
      <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
        {showCompleted ? 'Completed shoots will appear here' : 'Tap + to schedule your next shoot'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Upcoming</Text>
          <Text style={[styles.headerSub, { color: invoiceColors.gold }]}>SCHEDULE</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addButton, { backgroundColor: invoiceColors.darkGreen }, pressed && styles.addButtonPressed]}
          onPress={openAddModal}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterChip, !showCompleted && { backgroundColor: invoiceColors.darkGreen }]}
          onPress={() => setShowCompleted(false)}
        >
          <MaterialCommunityIcons name="calendar-clock" size={16} color={!showCompleted ? '#fff' : themeColors.textMuted} />
          <Text style={[styles.filterText, !showCompleted && { color: '#fff' }]}>
            Upcoming ({upcomingShoots.length + overdueShoots.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, showCompleted && { backgroundColor: '#27AE60' }]}
          onPress={() => setShowCompleted(true)}
        >
          <Ionicons name="checkmark-circle" size={16} color={showCompleted ? '#fff' : themeColors.textMuted} />
          <Text style={[styles.filterText, showCompleted && { color: '#fff' }]}>
            Done ({completedShoots.length})
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={displayList}
        keyExtractor={item => item.id}
        renderItem={renderShootCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 20 },
          displayList.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={invoiceColors.gold} />
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
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>{editingId ? 'Edit Shoot' : 'Schedule Shoot'}</Text>
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
                    onChangeText={(text) => {
                      setModelName(text);
                      setClientName(text);
                    }}
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
                      shootType === type && { color: '#fff' },
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
                    value={packagePrice}
                    onChangeText={setPackagePrice}
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
              style={({ pressed }) => [styles.saveButton, { backgroundColor: invoiceColors.darkGreen }, pressed && styles.saveButtonPressed]}
              onPress={handleSave}
            >
              <MaterialCommunityIcons name={editingId ? 'check' : 'calendar-plus'} size={20} color="#fff" />
              <Text style={styles.saveButtonText}>{editingId ? 'Update' : 'Schedule Shoot'}</Text>
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
  },
  headerSub: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 4,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  filterText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#9E9890',
  },
  listContent: {
    paddingHorizontal: 20,
  },
  emptyList: {
    flex: 1,
  },
  shootCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  completedCard: {
    opacity: 0.6,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeftSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardMainInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through' as const,
    opacity: 0.6,
  },
  typeDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  countdownBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  countdownText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  cardDetails: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  balanceText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  notesPreview: {
    fontSize: 12,
    fontFamily: 'Inter_300Light',
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 10,
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
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
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
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
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
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
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
    color: '#fff',
  },
});
