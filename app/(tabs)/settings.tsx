import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, INVOICE_COLOR_PRESETS, InvoiceColorScheme } from '@/lib/theme-context';
import { Image } from 'react-native';
import { LOGO_BASE64 } from '@/lib/logo-base64';
import { useBranding } from '@/lib/branding-context';
import {
  ReminderSettings,
  DEFAULT_REMINDER_SETTINGS,
  TIMING_OPTIONS,
  getReminderSettings,
  saveReminderSettings,
  setupNotifications,
  rescheduleAllReminders,
} from '@/lib/notifications';
import { getAllUpcomingShoots, getAllInvoices } from '@/lib/storage';

type EditSection = 'business' | 'contact' | 'bank' | null;

export default function SettingsTab() {
  const insets = useSafeAreaInsets();
  const { mode, toggleMode, colors, invoiceColors, setInvoiceColors } = useTheme();
  const { branding, updateBranding, resetBranding } = useBranding();
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [showBranding, setShowBranding] = useState(false);
  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    getReminderSettings().then(setReminderSettings);
  }, []);

  const handleColorSelect = (scheme: InvoiceColorScheme) => {
    setInvoiceColors(scheme);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleToggleMode = () => {
    toggleMode();
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleReschedule = useCallback(async (newSettings: ReminderSettings) => {
    try {
      const [shoots, invoices] = await Promise.all([getAllUpcomingShoots(), getAllInvoices()]);
      await rescheduleAllReminders(shoots, invoices);
    } catch {}
  }, []);

  const handleToggleShootReminders = async (val: boolean) => {
    if (val && Platform.OS !== 'web') {
      const granted = await setupNotifications();
      if (!granted) {
        Alert.alert('Permission Needed', 'Please allow notifications in your device settings to enable reminders.');
        return;
      }
    }
    const updated = { ...reminderSettings, shootReminders: val };
    setReminderSettings(updated);
    await saveReminderSettings(updated);
    await handleReschedule(updated);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleToggleInvoiceReminders = async (val: boolean) => {
    if (val && Platform.OS !== 'web') {
      const granted = await setupNotifications();
      if (!granted) {
        Alert.alert('Permission Needed', 'Please allow notifications in your device settings to enable reminders.');
        return;
      }
    }
    const updated = { ...reminderSettings, invoiceReminders: val };
    setReminderSettings(updated);
    await saveReminderSettings(updated);
    await handleReschedule(updated);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTimingChange = async (timing: ReminderSettings['reminderTiming']) => {
    const updated = { ...reminderSettings, reminderTiming: timing };
    setReminderSettings(updated);
    await saveReminderSettings(updated);
    await handleReschedule(updated);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const startEditing = (section: EditSection) => {
    if (section === 'business') {
      setEditDraft({
        businessName: branding.businessName,
        businessSub: branding.businessSub,
        ownerName: branding.ownerName,
      });
    } else if (section === 'contact') {
      setEditDraft({
        contactPhone: branding.contactPhone,
        contactEmail: branding.contactEmail,
      });
    } else if (section === 'bank') {
      setEditDraft({
        bankAccount: branding.bankAccount,
        bankHolder: branding.bankHolder,
        bankName: branding.bankName,
        bankBranch: branding.bankBranch,
      });
    }
    setEditingSection(section);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const saveSection = async () => {
    await updateBranding(editDraft);
    setEditingSection(null);
    setEditDraft({});
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditDraft({});
  };

  const handlePickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mimeType = asset.mimeType || 'image/jpeg';
          const uri = `data:${mimeType};base64,${asset.base64}`;
          await updateBranding({ logoUri: uri });
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (asset.uri) {
          await updateBranding({ logoUri: asset.uri });
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleResetBranding = () => {
    Alert.alert(
      'Reset to Default',
      'This will restore all business profile settings back to the original values.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetBranding();
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
        <Text style={styles.headerSub}>PREFERENCES</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={[styles.profileCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => setShowBranding(!showBranding)}
        >
          <Image source={{ uri: branding.logoUri }} style={styles.profileLogo} />
          <View style={[styles.profileInfo, { flex: 1 }]}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{branding.ownerName}</Text>
            <Text style={[styles.profileRole, { color: colors.textSecondary }]}>{branding.businessSub}</Text>
          </View>
          <Ionicons name={showBranding ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </Pressable>

        {showBranding && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Business Profile</Text>
            <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
              Tap the edit icon on any section to change details
            </Text>

            <Pressable style={styles.logoUploadRow} onPress={handlePickLogo}>
              <Image source={{ uri: branding.logoUri }} style={styles.logoPreview} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Logo / Watermark</Text>
                <Text style={[styles.settingHint, { color: colors.textMuted }]}>Tap to upload from gallery</Text>
              </View>
              <Ionicons name="camera" size={22} color={invoiceColors.gold} />
            </Pressable>

            <View style={[styles.brandingCard, { backgroundColor: colors.cardBackground, borderColor: editingSection === 'business' ? invoiceColors.gold : colors.border }]}>
              <View style={styles.brandingCardHeader}>
                <Text style={[styles.brandingCardTitle, { color: invoiceColors.gold }]}>Business Info</Text>
                {editingSection === 'business' ? (
                  <View style={styles.editActions}>
                    <Pressable onPress={cancelEditing} hitSlop={10}>
                      <Ionicons name="close" size={22} color="#E74C3C" />
                    </Pressable>
                    <Pressable onPress={saveSection} hitSlop={10}>
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => startEditing('business')} hitSlop={10}>
                    <Feather name="edit-2" size={18} color={invoiceColors.gold} />
                  </Pressable>
                )}
              </View>
              {editingSection === 'business' ? (
                <>
                  <View style={styles.brandingField}>
                    <Text style={[styles.brandingLabel, { color: colors.textSecondary }]}>Business Name</Text>
                    <TextInput
                      style={[styles.brandingInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: invoiceColors.gold }]}
                      value={editDraft.businessName || ''}
                      onChangeText={(v) => setEditDraft(prev => ({ ...prev, businessName: v }))}
                      placeholder="Business Name"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={styles.brandingField}>
                    <Text style={[styles.brandingLabel, { color: colors.textSecondary }]}>Subtitle</Text>
                    <TextInput
                      style={[styles.brandingInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: invoiceColors.gold }]}
                      value={editDraft.businessSub || ''}
                      onChangeText={(v) => setEditDraft(prev => ({ ...prev, businessSub: v }))}
                      placeholder="e.g. PHOTOGRAPHY"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={styles.brandingField}>
                    <Text style={[styles.brandingLabel, { color: colors.textSecondary }]}>Owner Name</Text>
                    <TextInput
                      style={[styles.brandingInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: invoiceColors.gold }]}
                      value={editDraft.ownerName || ''}
                      onChangeText={(v) => setEditDraft(prev => ({ ...prev, ownerName: v }))}
                      placeholder="Your Name"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.brandingDisplayRow}>
                    <Text style={[styles.brandingDisplayLabel, { color: colors.textMuted }]}>Business Name</Text>
                    <Text style={[styles.brandingDisplayValue, { color: colors.textPrimary }]}>{branding.businessName}</Text>
                  </View>
                  <View style={[styles.brandingDisplayDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.brandingDisplayRow}>
                    <Text style={[styles.brandingDisplayLabel, { color: colors.textMuted }]}>Subtitle</Text>
                    <Text style={[styles.brandingDisplayValue, { color: colors.textPrimary }]}>{branding.businessSub}</Text>
                  </View>
                  <View style={[styles.brandingDisplayDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.brandingDisplayRow}>
                    <Text style={[styles.brandingDisplayLabel, { color: colors.textMuted }]}>Owner Name</Text>
                    <Text style={[styles.brandingDisplayValue, { color: colors.textPrimary }]}>{branding.ownerName}</Text>
                  </View>
                </>
              )}
            </View>

            <View style={[styles.brandingCard, { backgroundColor: colors.cardBackground, borderColor: editingSection === 'contact' ? invoiceColors.gold : colors.border, marginTop: 12 }]}>
              <View style={styles.brandingCardHeader}>
                <Text style={[styles.brandingCardTitle, { color: invoiceColors.gold }]}>Contact Details</Text>
                {editingSection === 'contact' ? (
                  <View style={styles.editActions}>
                    <Pressable onPress={cancelEditing} hitSlop={10}>
                      <Ionicons name="close" size={22} color="#E74C3C" />
                    </Pressable>
                    <Pressable onPress={saveSection} hitSlop={10}>
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => startEditing('contact')} hitSlop={10}>
                    <Feather name="edit-2" size={18} color={invoiceColors.gold} />
                  </Pressable>
                )}
              </View>
              {editingSection === 'contact' ? (
                <>
                  <View style={styles.brandingField}>
                    <Text style={[styles.brandingLabel, { color: colors.textSecondary }]}>Phone</Text>
                    <TextInput
                      style={[styles.brandingInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: invoiceColors.gold }]}
                      value={editDraft.contactPhone || ''}
                      onChangeText={(v) => setEditDraft(prev => ({ ...prev, contactPhone: v }))}
                      placeholder="Phone Number"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={styles.brandingField}>
                    <Text style={[styles.brandingLabel, { color: colors.textSecondary }]}>Email</Text>
                    <TextInput
                      style={[styles.brandingInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: invoiceColors.gold }]}
                      value={editDraft.contactEmail || ''}
                      onChangeText={(v) => setEditDraft(prev => ({ ...prev, contactEmail: v }))}
                      placeholder="Email Address"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.brandingDisplayRow}>
                    <Text style={[styles.brandingDisplayLabel, { color: colors.textMuted }]}>Phone</Text>
                    <Text style={[styles.brandingDisplayValue, { color: colors.textPrimary }]}>{branding.contactPhone}</Text>
                  </View>
                  <View style={[styles.brandingDisplayDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.brandingDisplayRow}>
                    <Text style={[styles.brandingDisplayLabel, { color: colors.textMuted }]}>Email</Text>
                    <Text style={[styles.brandingDisplayValue, { color: colors.textPrimary }]}>{branding.contactEmail}</Text>
                  </View>
                </>
              )}
            </View>

            <View style={[styles.brandingCard, { backgroundColor: colors.cardBackground, borderColor: editingSection === 'bank' ? invoiceColors.gold : colors.border, marginTop: 12 }]}>
              <View style={styles.brandingCardHeader}>
                <Text style={[styles.brandingCardTitle, { color: invoiceColors.gold }]}>Bank Details</Text>
                {editingSection === 'bank' ? (
                  <View style={styles.editActions}>
                    <Pressable onPress={cancelEditing} hitSlop={10}>
                      <Ionicons name="close" size={22} color="#E74C3C" />
                    </Pressable>
                    <Pressable onPress={saveSection} hitSlop={10}>
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => startEditing('bank')} hitSlop={10}>
                    <Feather name="edit-2" size={18} color={invoiceColors.gold} />
                  </Pressable>
                )}
              </View>
              {editingSection === 'bank' ? (
                <>
                  <View style={styles.brandingField}>
                    <Text style={[styles.brandingLabel, { color: colors.textSecondary }]}>Account Number</Text>
                    <TextInput
                      style={[styles.brandingInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: invoiceColors.gold }]}
                      value={editDraft.bankAccount || ''}
                      onChangeText={(v) => setEditDraft(prev => ({ ...prev, bankAccount: v }))}
                      placeholder="Account Number"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.brandingField}>
                    <Text style={[styles.brandingLabel, { color: colors.textSecondary }]}>Account Holder</Text>
                    <TextInput
                      style={[styles.brandingInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: invoiceColors.gold }]}
                      value={editDraft.bankHolder || ''}
                      onChangeText={(v) => setEditDraft(prev => ({ ...prev, bankHolder: v }))}
                      placeholder="Account Holder Name"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={styles.brandingFieldRow}>
                    <View style={[styles.brandingField, { flex: 1 }]}>
                      <Text style={[styles.brandingLabel, { color: colors.textSecondary }]}>Bank</Text>
                      <TextInput
                        style={[styles.brandingInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: invoiceColors.gold }]}
                        value={editDraft.bankName || ''}
                        onChangeText={(v) => setEditDraft(prev => ({ ...prev, bankName: v }))}
                        placeholder="Bank"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    <View style={[styles.brandingField, { flex: 1 }]}>
                      <Text style={[styles.brandingLabel, { color: colors.textSecondary }]}>Branch</Text>
                      <TextInput
                        style={[styles.brandingInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: invoiceColors.gold }]}
                        value={editDraft.bankBranch || ''}
                        onChangeText={(v) => setEditDraft(prev => ({ ...prev, bankBranch: v }))}
                        placeholder="Branch"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.brandingDisplayRow}>
                    <Text style={[styles.brandingDisplayLabel, { color: colors.textMuted }]}>Account No.</Text>
                    <Text style={[styles.brandingDisplayValue, { color: colors.textPrimary }]}>{branding.bankAccount}</Text>
                  </View>
                  <View style={[styles.brandingDisplayDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.brandingDisplayRow}>
                    <Text style={[styles.brandingDisplayLabel, { color: colors.textMuted }]}>Holder</Text>
                    <Text style={[styles.brandingDisplayValue, { color: colors.textPrimary }]}>{branding.bankHolder}</Text>
                  </View>
                  <View style={[styles.brandingDisplayDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.brandingDisplayRow}>
                    <Text style={[styles.brandingDisplayLabel, { color: colors.textMuted }]}>Bank</Text>
                    <Text style={[styles.brandingDisplayValue, { color: colors.textPrimary }]}>{branding.bankName}</Text>
                  </View>
                  <View style={[styles.brandingDisplayDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.brandingDisplayRow}>
                    <Text style={[styles.brandingDisplayLabel, { color: colors.textMuted }]}>Branch</Text>
                    <Text style={[styles.brandingDisplayValue, { color: colors.textPrimary }]}>{branding.bankBranch}</Text>
                  </View>
                </>
              )}
            </View>

            <Pressable
              style={[styles.resetButton, { borderColor: '#E74C3C' }]}
              onPress={handleResetBranding}
            >
              <Ionicons name="refresh" size={16} color="#E74C3C" />
              <Text style={styles.resetButtonText}>Reset to Default</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Appearance</Text>

          <View style={[styles.settingRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: mode === 'dark' ? '#2C1810' : '#FAF0E6' }]}>
                <Ionicons
                  name={mode === 'dark' ? 'moon' : 'sunny'}
                  size={18}
                  color={mode === 'dark' ? '#C8A951' : '#C8A951'}
                />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Dark Mode</Text>
                <Text style={[styles.settingHint, { color: colors.textMuted }]}>
                  {mode === 'dark' ? 'Night theme active' : 'Day theme active'}
                </Text>
              </View>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={handleToggleMode}
              trackColor={{ false: '#E8E4DE', true: '#1B4332' }}
              thumbColor={mode === 'dark' ? '#C8A951' : '#fff'}
              ios_backgroundColor="#E8E4DE"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Reminders</Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
            Get notified before your upcoming shoots and invoice event dates
          </Text>

          <View style={[styles.settingRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: mode === 'dark' ? '#1B3A2D' : '#E8F5E9' }]}>
                <Ionicons name="camera-outline" size={18} color="#4CAF50" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Shoot Reminders</Text>
                <Text style={[styles.settingHint, { color: colors.textMuted }]}>
                  {reminderSettings.shootReminders ? 'You will be reminded' : 'Reminders off'}
                </Text>
              </View>
            </View>
            <Switch
              value={reminderSettings.shootReminders}
              onValueChange={handleToggleShootReminders}
              trackColor={{ false: '#E8E4DE', true: '#1B4332' }}
              thumbColor={reminderSettings.shootReminders ? '#C8A951' : '#fff'}
              ios_backgroundColor="#E8E4DE"
            />
          </View>

          <View style={[styles.settingRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: mode === 'dark' ? '#2C1810' : '#FFF3E0' }]}>
                <Ionicons name="document-text-outline" size={18} color="#FF9800" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Invoice Reminders</Text>
                <Text style={[styles.settingHint, { color: colors.textMuted }]}>
                  {reminderSettings.invoiceReminders ? 'You will be reminded' : 'Reminders off'}
                </Text>
              </View>
            </View>
            <Switch
              value={reminderSettings.invoiceReminders}
              onValueChange={handleToggleInvoiceReminders}
              trackColor={{ false: '#E8E4DE', true: '#1B4332' }}
              thumbColor={reminderSettings.invoiceReminders ? '#C8A951' : '#fff'}
              ios_backgroundColor="#E8E4DE"
            />
          </View>

          {(reminderSettings.shootReminders || reminderSettings.invoiceReminders) && (
            <>
              <Text style={[styles.timingLabel, { color: colors.textSecondary }]}>Remind me</Text>
              <View style={styles.timingGrid}>
                {TIMING_OPTIONS.map(option => {
                  const isSelected = reminderSettings.reminderTiming === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.timingOption,
                        { backgroundColor: colors.cardBackground, borderColor: isSelected ? invoiceColors.gold : colors.border },
                        isSelected && { borderWidth: 2 },
                      ]}
                      onPress={() => handleTimingChange(option.value)}
                    >
                      <Text style={[styles.timingOptionText, { color: isSelected ? invoiceColors.gold : colors.textPrimary }]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.timingOptionSub, { color: colors.textMuted }]}>
                        {option.description}
                      </Text>
                      {isSelected && (
                        <View style={[styles.timingCheck, { backgroundColor: invoiceColors.gold }]}>
                          <Ionicons name="checkmark" size={10} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Color Theme</Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
            Choose the color scheme for the entire app
          </Text>

          <View style={styles.colorGrid}>
            {INVOICE_COLOR_PRESETS.map((scheme, index) => {
              const isSelected = invoiceColors.label === scheme.label;
              return (
                <Pressable
                  key={scheme.label}
                  style={[
                    styles.colorCard,
                    { backgroundColor: colors.cardBackground, borderColor: isSelected ? scheme.gold : colors.border },
                    isSelected && styles.colorCardSelected,
                  ]}
                  onPress={() => handleColorSelect(scheme)}
                >
                  <View style={styles.colorPreview}>
                    <View style={[styles.colorDot, { backgroundColor: scheme.primary, width: 24, height: 24 }]} />
                    <View style={[styles.colorDot, { backgroundColor: scheme.gold, width: 20, height: 20 }]} />
                    <View style={[styles.colorDot, { backgroundColor: scheme.darkGreen, width: 16, height: 16 }]} />
                  </View>
                  <Text style={[styles.colorLabel, { color: colors.textPrimary }]}>{scheme.label}</Text>
                  {isSelected && (
                    <View style={[styles.selectedBadge, { backgroundColor: scheme.gold }]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Theme Preview</Text>
          <View style={[styles.previewCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.previewContent}>
              <View style={styles.previewHeader}>
                <Text style={[styles.previewTitle, { color: invoiceColors.primary }]}>{branding.ownerName}</Text>
                <View style={[styles.previewBadge, { backgroundColor: invoiceColors.gold }]}>
                  <Text style={styles.previewBadgeText}>{branding.businessName.substring(0, 2)}</Text>
                </View>
              </View>
              <View style={[styles.previewDivider, { backgroundColor: invoiceColors.darkGreen }]} />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <View style={[styles.previewStatCard, { backgroundColor: invoiceColors.darkGreen }]}>
                  <Text style={styles.previewStatLabel}>Shoots</Text>
                  <Text style={styles.previewStatValue}>12</Text>
                </View>
                <View style={[styles.previewStatCard, { backgroundColor: invoiceColors.primary }]}>
                  <Text style={styles.previewStatLabel}>Income</Text>
                  <Text style={styles.previewStatValue}>LKR 50K</Text>
                </View>
                <View style={[styles.previewStatCard, { backgroundColor: invoiceColors.gold }]}>
                  <Text style={styles.previewStatLabel}>Avg</Text>
                  <Text style={styles.previewStatValue}>LKR 4K</Text>
                </View>
              </View>
              <View style={styles.previewRows}>
                <View style={styles.previewRow}>
                  <View style={[styles.previewBlock, { backgroundColor: mode === 'dark' ? '#2A2A2A' : '#f5f3ef', flex: 2 }]} />
                  <View style={[styles.previewBlock, { backgroundColor: mode === 'dark' ? '#2A2A2A' : '#f5f3ef', flex: 1 }]} />
                </View>
                <View style={styles.previewRow}>
                  <View style={[styles.previewBlock, { backgroundColor: mode === 'dark' ? '#2A2A2A' : '#f5f3ef', flex: 3 }]} />
                  <View style={[styles.previewBlock, { backgroundColor: mode === 'dark' ? '#2A2A2A' : '#f5f3ef', flex: 1 }]} />
                </View>
              </View>
            </View>
            <View style={[styles.previewTabBar, { backgroundColor: mode === 'dark' ? '#1E1E1E' : '#fff', borderTopColor: mode === 'dark' ? '#2A2A2A' : '#E8E4DE' }]}>
              <View style={styles.previewTab}>
                <View style={[styles.previewTabDot, { backgroundColor: invoiceColors.gold }]} />
                <View style={[styles.previewTabLine, { backgroundColor: invoiceColors.gold }]} />
              </View>
              <View style={styles.previewTab}>
                <View style={[styles.previewTabDot, { backgroundColor: colors.textMuted }]} />
                <View style={[styles.previewTabLine, { backgroundColor: colors.textMuted }]} />
              </View>
              <View style={styles.previewTab}>
                <View style={[styles.previewTabDot, { backgroundColor: colors.textMuted }]} />
                <View style={[styles.previewTabLine, { backgroundColor: colors.textMuted }]} />
              </View>
              <View style={styles.previewTab}>
                <View style={[styles.previewTabDot, { backgroundColor: colors.textMuted }]} />
                <View style={[styles.previewTabLine, { backgroundColor: colors.textMuted }]} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>About</Text>
          <View style={[styles.aboutCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>App</Text>
              <Text style={[styles.aboutValue, { color: colors.textPrimary }]}>{branding.businessName} {branding.businessSub}</Text>
            </View>
            <View style={[styles.aboutDivider, { backgroundColor: colors.border }]} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Version</Text>
              <Text style={[styles.aboutValue, { color: colors.textPrimary }]}>1.0.0</Text>
            </View>
            <View style={[styles.aboutDivider, { backgroundColor: colors.border }]} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Contact</Text>
              <Text style={[styles.aboutValue, { color: colors.textPrimary }]}>{branding.contactPhone}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
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
    color: '#C8A951',
    letterSpacing: 4,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  profileLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 14,
  },
  profileInfo: {},
  profileName: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  profileRole: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    marginTop: 2,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginBottom: 14,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  settingHint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorCard: {
    width: '47%' as any,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  colorCardSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 10,
  },
  colorDot: {
    borderRadius: 12,
  },
  colorLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: 6,
  },
  previewContent: {
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  previewBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  previewBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    letterSpacing: 2,
  },
  previewDivider: {
    height: 2,
    marginBottom: 12,
  },
  previewRows: {
    gap: 6,
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 6,
  },
  previewBlock: {
    height: 10,
    borderRadius: 3,
  },
  previewStatCard: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  previewStatLabel: {
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  previewStatValue: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    marginTop: 2,
  },
  previewTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  previewTab: {
    alignItems: 'center',
    gap: 3,
  },
  previewTabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewTabLine: {
    width: 16,
    height: 3,
    borderRadius: 1.5,
  },
  logoUploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    paddingVertical: 8,
  },
  logoPreview: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  brandingCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  brandingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandingCardTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandingDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  brandingDisplayLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  brandingDisplayValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'right' as const,
    flex: 1,
    marginLeft: 16,
  },
  brandingDisplayDivider: {
    height: 1,
  },
  brandingField: {
    marginBottom: 12,
  },
  brandingFieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  brandingLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  brandingInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 14,
  },
  resetButtonText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#E74C3C',
  },
  timingLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 16,
    marginBottom: 10,
  },
  timingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timingOption: {
    width: '47%' as any,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
  },
  timingOptionText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  timingOptionSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  timingCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: 6,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  aboutLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  aboutValue: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  aboutDivider: {
    height: 1,
    marginLeft: 16,
  },
});
