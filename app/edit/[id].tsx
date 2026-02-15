import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import DatePicker from '@/components/DatePicker';
import {
  Invoice,
  InvoiceItem,
  getInvoice,
  updateInvoice,
  generateItemId,
  formatCurrency,
} from '@/lib/storage';
import { scheduleInvoiceReminder } from '@/lib/notifications';

export default function EditInvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [customerNames, setCustomerNames] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(['']);
  const [advancePayment, setAdvancePayment] = useState('');
  const [fullPrice, setFullPrice] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    if (!id) return;
    const invoice = await getInvoice(id);
    if (invoice) {
      setInvoiceNumber(invoice.invoiceNumber);
      setInvoiceDate(invoice.invoiceDate);
      setCustomerNames(invoice.customerNames);
      setEventDate(invoice.eventDate);
      setEventLocation(invoice.eventLocation);
      const phones = invoice.phoneNumber ? invoice.phoneNumber.split(' / ').map(p => p.trim()) : [''];
      setPhoneNumbers(phones.length > 0 ? phones : ['']);
      setAdvancePayment(invoice.advancePayment);
      setFullPrice(invoice.fullPrice || '');
      setItems(invoice.items.map(item => ({ ...item, id: item.id || generateItemId() })));
    }
    setLoading(false);
  };

  const addItem = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems(prev => [...prev, { id: generateItemId(), description: '', quantity: '1' }]);
  };

  const removeItem = (itemId: string) => {
    if (items.length <= 1) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof InvoiceItem, value: string) => {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const total = parseFloat(fullPrice) || 0;
  const advance = parseFloat(advancePayment) || 0;
  const balance = total - advance;

  const handleSave = async () => {
    if (!customerNames.trim()) {
      Alert.alert('Required', 'Please enter customer names');
      return;
    }

    setSaving(true);
    try {
      await updateInvoice(id!, {
        invoiceNumber,
        invoiceDate,
        customerNames: customerNames.trim(),
        eventDate,
        eventLocation: eventLocation.trim(),
        phoneNumber: phoneNumbers.map(p => p.trim()).filter(Boolean).join(' / '),
        items: items.filter(item => item.description.trim()),
        fullPrice,
        advancePayment,
      });
      scheduleInvoiceReminder(id!, invoiceNumber, customerNames.trim(), eventDate, eventLocation.trim()).catch(() => {});
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: '/preview/[id]', params: { id: id! } });
    } catch (e) {
      Alert.alert('Error', 'Failed to update invoice');
    } finally {
      setSaving(false);
    }
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Invoice</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Invoice No</Text>
              <TextInput
                style={styles.input}
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
                placeholder="0001"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Invoice Date</Text>
              <DatePicker
                value={invoiceDate}
                onChange={setInvoiceDate}
                placeholder="Select date"
                colors={{
                  background: Colors.cream,
                  cardBackground: Colors.white,
                  textPrimary: Colors.primary,
                  textSecondary: Colors.textSecondary,
                  textMuted: Colors.textMuted,
                  border: Colors.border,
                  accent: Colors.gold,
                  accentDark: Colors.darkGreen,
                }}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Details</Text>
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Customer Names</Text>
            <TextInput
              style={styles.input}
              value={customerNames}
              onChangeText={setCustomerNames}
              placeholder="e.g. Mr & Mrs"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Phone Number</Text>
            {phoneNumbers.map((phone, idx) => (
              <View key={idx} style={styles.phoneRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={phone}
                  onChangeText={(v) => {
                    const updated = [...phoneNumbers];
                    updated[idx] = v;
                    setPhoneNumbers(updated);
                  }}
                  placeholder="+94 76 1800 732"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                />
                {phoneNumbers.length > 1 && (
                  <Pressable
                    onPress={() => {
                      setPhoneNumbers(prev => prev.filter((_, i) => i !== idx));
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable
              style={styles.addPhoneBtn}
              onPress={() => {
                setPhoneNumbers(prev => [...prev, '']);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.gold} />
              <Text style={styles.addPhoneText}>Add Phone</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Event Date</Text>
              <DatePicker
                value={eventDate}
                onChange={setEventDate}
                placeholder="Select date"
                colors={{
                  background: Colors.cream,
                  cardBackground: Colors.white,
                  textPrimary: Colors.primary,
                  textSecondary: Colors.textSecondary,
                  textMuted: Colors.textMuted,
                  border: Colors.border,
                  accent: Colors.gold,
                  accentDark: Colors.darkGreen,
                }}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={eventLocation}
                onChangeText={setEventLocation}
                placeholder="Hotel Sannasa"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items / Services</Text>
            <Pressable onPress={addItem} style={styles.addItemBtn}>
              <Ionicons name="add-circle" size={20} color={Colors.darkGreen} />
              <Text style={styles.addItemText}>Add Item</Text>
            </Pressable>
          </View>
          {items.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemIndex}>Item {index + 1}</Text>
                {items.length > 1 && (
                  <Pressable onPress={() => removeItem(item.id)} hitSlop={8}>
                    <Feather name="x-circle" size={18} color={Colors.danger} />
                  </Pressable>
                )}
              </View>
              <View style={styles.row}>
                <View style={{ flex: 2 }}>
                  <TextInput
                    style={styles.input}
                    value={item.description}
                    onChangeText={val => updateItem(item.id, 'description', val)}
                    placeholder="Description"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.input}
                    value={item.quantity}
                    onChangeText={val => updateItem(item.id, 'quantity', val)}
                    placeholder="QTY"
                    placeholderTextColor={Colors.textMuted}
                    textAlign="center" as const
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Full Price</Text>
            <TextInput
              style={[styles.input, styles.priceInput]}
              value={fullPrice}
              onChangeText={setFullPrice}
              placeholder="Enter full package price"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Advance Payment</Text>
            <TextInput
              style={styles.input}
              value={advancePayment}
              onChangeText={setAdvancePayment}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryTotal}>{formatCurrency(total)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summarySubLabel}>Advance</Text>
            <Text style={styles.summarySubValue}>- {formatCurrency(advance)}</Text>
          </View>
          <View style={styles.summaryDividerGold} />
          <View style={styles.summaryRow}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + webBottomInset + 10 }]}>
        <Pressable
          style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <MaterialCommunityIcons name="content-save-check" size={20} color={Colors.white} />
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Update & Preview'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  addItemText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.darkGreen,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  addPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    marginTop: 2,
  },
  addPhoneText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.gold,
  },
  priceInput: {
    borderColor: Colors.gold,
    borderWidth: 1.5,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    paddingVertical: 14,
  },
  itemCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemIndex: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.gold,
  },
  summaryCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: Colors.white,
  },
  summaryTotal: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 8,
  },
  summarySubLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.7)',
  },
  summarySubValue: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.7)',
  },
  summaryDividerGold: {
    height: 2,
    backgroundColor: Colors.gold,
    marginVertical: 8,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.gold,
  },
  balanceValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.gold,
  },
  footer: {
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
});
