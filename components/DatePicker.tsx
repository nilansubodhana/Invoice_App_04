import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  colors: {
    background: string;
    cardBackground: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    accent: string;
    accentDark: string;
  };
}

export default function DatePicker({ value, onChange, label, placeholder, colors }: DatePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const parsed = useMemo(() => {
    if (!value) return null;
    const parts = value.split('-');
    if (parts.length === 3) {
      return { year: parseInt(parts[0]), month: parseInt(parts[1]) - 1, day: parseInt(parts[2]) };
    }
    return null;
  }, [value]);

  const now = new Date();
  const [pickerYear, setPickerYear] = useState(parsed?.year || now.getFullYear());
  const [pickerMonth, setPickerMonth] = useState<number | null>(parsed?.month ?? null);
  const [pickerDay, setPickerDay] = useState<number | null>(parsed?.day ?? null);
  const [step, setStep] = useState<'year' | 'month' | 'day'>('year');

  const openPicker = () => {
    if (parsed) {
      setPickerYear(parsed.year);
      setPickerMonth(parsed.month);
      setPickerDay(parsed.day);
      setStep('year');
    } else {
      setPickerYear(now.getFullYear());
      setPickerMonth(null);
      setPickerDay(null);
      setStep('year');
    }
    setModalVisible(true);
  };

  const daysInMonth = useMemo(() => {
    if (pickerMonth === null) return 31;
    return new Date(pickerYear, pickerMonth + 1, 0).getDate();
  }, [pickerYear, pickerMonth]);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = now.getFullYear() + 3; y >= 2020; y--) list.push(y);
    return list;
  }, []);

  const days = useMemo(() => {
    const list: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) list.push(d);
    return list;
  }, [daysInMonth]);

  const selectYear = (y: number) => {
    setPickerYear(y);
    setStep('month');
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const selectMonth = (m: number) => {
    setPickerMonth(m);
    setStep('day');
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const selectDay = (d: number) => {
    setPickerDay(d);
    const month = pickerMonth !== null ? pickerMonth : 0;
    const maxDay = new Date(pickerYear, month + 1, 0).getDate();
    const safeDay = Math.min(d, maxDay);
    const dateStr = `${pickerYear}-${String(month + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
    onChange(dateStr);
    setModalVisible(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const displayValue = useMemo(() => {
    if (!parsed) return '';
    return `${parsed.day} ${MONTHS[parsed.month]?.substring(0, 3)} ${parsed.year}`;
  }, [parsed]);

  return (
    <>
      <Pressable
        style={[styles.trigger, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={openPicker}
      >
        <Text style={[
          styles.triggerText,
          { color: displayValue ? colors.textPrimary : colors.textMuted },
        ]}>
          {displayValue || placeholder || 'Select date'}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={colors.accent} />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={[styles.modal, { backgroundColor: colors.cardBackground }]} onPress={() => {}}>
            <View style={styles.modalHeader}>
              {step !== 'year' && (
                <Pressable
                  onPress={() => {
                    if (step === 'day') setStep('month');
                    else if (step === 'month') setStep('year');
                  }}
                  hitSlop={12}
                >
                  <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
                </Pressable>
              )}
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {step === 'year' ? 'Select Year' : step === 'month' ? `${pickerYear} - Select Month` : `${MONTHS[pickerMonth!]?.substring(0, 3)} ${pickerYear} - Select Day`}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.breadcrumb}>
              <Pressable onPress={() => setStep('year')}>
                <Text style={[styles.breadcrumbText, step === 'year' ? { color: colors.accent, fontFamily: 'Inter_700Bold' } : { color: colors.textMuted }]}>{pickerYear}</Text>
              </Pressable>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              <Pressable onPress={() => pickerMonth !== null && setStep('month')} disabled={pickerMonth === null}>
                <Text style={[styles.breadcrumbText, step === 'month' ? { color: colors.accent, fontFamily: 'Inter_700Bold' } : { color: pickerMonth !== null ? colors.textMuted : colors.border }]}>
                  {pickerMonth !== null ? MONTHS[pickerMonth].substring(0, 3) : '---'}
                </Text>
              </Pressable>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              <Text style={[styles.breadcrumbText, step === 'day' ? { color: colors.accent, fontFamily: 'Inter_700Bold' } : { color: colors.border }]}>
                {pickerDay !== null ? String(pickerDay).padStart(2, '0') : '--'}
              </Text>
            </View>

            {step === 'year' && (
              <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
                {years.map(y => {
                  const isSelected = y === pickerYear && parsed?.year === y;
                  return (
                    <Pressable
                      key={y}
                      style={[styles.listItem, { borderBottomColor: colors.border }, isSelected && { backgroundColor: colors.accent }]}
                      onPress={() => selectYear(y)}
                    >
                      <Text style={[styles.listItemText, { color: colors.textPrimary }, isSelected && { color: '#fff', fontFamily: 'Inter_700Bold' }]}>{y}</Text>
                      {y === now.getFullYear() && !isSelected && <Text style={[styles.currentBadge, { color: colors.accent }]}>current</Text>}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {step === 'month' && (
              <View style={styles.monthGrid}>
                {MONTHS.map((name, i) => {
                  const isSelected = i === pickerMonth && parsed?.month === i && pickerYear === parsed?.year;
                  const isCurrent = i === now.getMonth() && pickerYear === now.getFullYear();
                  return (
                    <Pressable
                      key={name}
                      style={[
                        styles.monthCell,
                        { backgroundColor: colors.background },
                        isSelected && { backgroundColor: colors.accent },
                        isCurrent && !isSelected && { borderColor: colors.accent, borderWidth: 1.5 },
                      ]}
                      onPress={() => selectMonth(i)}
                    >
                      <Text style={[
                        styles.monthCellText,
                        { color: colors.textPrimary },
                        isSelected && { color: '#fff', fontFamily: 'Inter_700Bold' },
                      ]}>{name.substring(0, 3)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {step === 'day' && (
              <View style={styles.dayGrid}>
                {days.map(d => {
                  const isSelected = d === parsed?.day && pickerMonth === parsed?.month && pickerYear === parsed?.year;
                  const isToday = d === now.getDate() && pickerMonth === now.getMonth() && pickerYear === now.getFullYear();
                  return (
                    <Pressable
                      key={d}
                      style={[
                        styles.dayCell,
                        { backgroundColor: colors.background },
                        isSelected && { backgroundColor: colors.accent },
                        isToday && !isSelected && { borderColor: colors.accent, borderWidth: 1.5 },
                      ]}
                      onPress={() => selectDay(d)}
                    >
                      <Text style={[
                        styles.dayCellText,
                        { color: colors.textPrimary },
                        isSelected && { color: '#fff', fontFamily: 'Inter_700Bold' },
                      ]}>{d}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Pressable
              style={[styles.todayBtn, { borderColor: colors.accent }]}
              onPress={() => {
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                onChange(todayStr);
                setModalVisible(false);
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
            >
              <Text style={[styles.todayBtnText, { color: colors.accent }]}>Today</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  triggerText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '88%',
    maxHeight: '75%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  modalTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  breadcrumbText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  listScroll: {
    maxHeight: 280,
  },
  listItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderRadius: 10,
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemText: {
    fontSize: 17,
    fontFamily: 'Inter_500Medium',
  },
  currentBadge: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  monthCell: {
    width: '28%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  monthCellText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  dayCell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  todayBtn: {
    marginTop: 16,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  todayBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
