import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = ['00', '15', '30', '45'];

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  colors: {
    background: string;
    cardBackground: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    accent: string;
  };
}

export default function TimePicker({ value, onChange, placeholder, colors }: TimePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState<'period' | 'hour' | 'minute'>('period');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const parsed = useMemo(() => {
    if (!value) return null;
    const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      return { hour: parseInt(match[1]), minute: match[2], period: match[3].toUpperCase() as 'AM' | 'PM' };
    }
    return null;
  }, [value]);

  const openPicker = () => {
    if (parsed) {
      setSelectedPeriod(parsed.period);
      setSelectedHour(parsed.hour);
      setStep('period');
    } else {
      setSelectedPeriod('AM');
      setSelectedHour(null);
      setStep('period');
    }
    setModalVisible(true);
  };

  const selectPeriod = (p: 'AM' | 'PM') => {
    setSelectedPeriod(p);
    setStep('hour');
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const selectHour = (h: number) => {
    setSelectedHour(h);
    setStep('minute');
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const selectMinute = (m: string) => {
    const timeStr = `${selectedHour}:${m} ${selectedPeriod}`;
    onChange(timeStr);
    setModalVisible(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <>
      <Pressable
        style={[styles.trigger, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={openPicker}
      >
        <Text style={[styles.triggerText, { color: value ? colors.textPrimary : colors.textMuted }]}>
          {value || placeholder || 'Select time'}
        </Text>
        <Ionicons name="time-outline" size={18} color={colors.accent} />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={[styles.modal, { backgroundColor: colors.cardBackground }]} onPress={() => {}}>
            <View style={styles.modalHeader}>
              {step !== 'period' && (
                <Pressable
                  onPress={() => {
                    if (step === 'minute') setStep('hour');
                    else if (step === 'hour') setStep('period');
                  }}
                  hitSlop={12}
                >
                  <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
                </Pressable>
              )}
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {step === 'period' ? 'AM or PM' : step === 'hour' ? `${selectedPeriod} - Select Hour` : `${selectedHour}:__ ${selectedPeriod} - Select Minutes`}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.breadcrumb}>
              <Pressable onPress={() => setStep('period')}>
                <Text style={[styles.breadcrumbText, step === 'period' ? { color: colors.accent, fontFamily: 'Inter_700Bold' } : { color: colors.textMuted }]}>{selectedPeriod}</Text>
              </Pressable>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              <Pressable onPress={() => selectedHour !== null && setStep('hour')} disabled={selectedHour === null}>
                <Text style={[styles.breadcrumbText, step === 'hour' ? { color: colors.accent, fontFamily: 'Inter_700Bold' } : { color: selectedHour !== null ? colors.textMuted : colors.border }]}>
                  {selectedHour !== null ? String(selectedHour) : '--'}
                </Text>
              </Pressable>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              <Text style={[styles.breadcrumbText, step === 'minute' ? { color: colors.accent, fontFamily: 'Inter_700Bold' } : { color: colors.border }]}>--</Text>
            </View>

            {step === 'period' && (
              <View style={styles.periodRow}>
                {(['AM', 'PM'] as const).map(p => {
                  const isSelected = p === selectedPeriod && parsed?.period === p;
                  return (
                    <Pressable
                      key={p}
                      style={[styles.periodBtn, { backgroundColor: colors.background }, isSelected && { backgroundColor: colors.accent }]}
                      onPress={() => selectPeriod(p)}
                    >
                      <Text style={[styles.periodBtnText, { color: colors.textPrimary }, isSelected && { color: '#fff', fontFamily: 'Inter_700Bold' }]}>{p}</Text>
                      <Text style={[styles.periodSub, { color: isSelected ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
                        {p === 'AM' ? 'Morning' : 'Afternoon / Evening'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {step === 'hour' && (
              <View style={styles.hourGrid}>
                {HOURS_12.map(h => {
                  const isSelected = h === parsed?.hour && selectedPeriod === parsed?.period;
                  return (
                    <Pressable
                      key={h}
                      style={[styles.hourCell, { backgroundColor: colors.background }, isSelected && { backgroundColor: colors.accent }]}
                      onPress={() => selectHour(h)}
                    >
                      <Text style={[styles.hourCellText, { color: colors.textPrimary }, isSelected && { color: '#fff', fontFamily: 'Inter_700Bold' }]}>{h}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {step === 'minute' && (
              <View style={styles.minuteGrid}>
                {MINUTES.map(m => {
                  const isSelected = m === parsed?.minute && selectedHour === parsed?.hour && selectedPeriod === parsed?.period;
                  return (
                    <Pressable
                      key={m}
                      style={[styles.minuteCell, { backgroundColor: colors.background }, isSelected && { backgroundColor: colors.accent }]}
                      onPress={() => selectMinute(m)}
                    >
                      <Text style={[styles.minuteCellText, { color: colors.textPrimary }, isSelected && { color: '#fff', fontFamily: 'Inter_700Bold' }]}>
                        {selectedHour}:{m}
                      </Text>
                      <Text style={[styles.minuteSub, { color: isSelected ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>{selectedPeriod}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
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
  periodRow: {
    flexDirection: 'row',
    gap: 12,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 24,
    borderRadius: 14,
    alignItems: 'center',
    gap: 6,
  },
  periodBtnText: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
  },
  periodSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  hourGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  hourCell: {
    width: '21%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  hourCellText: {
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
  },
  minuteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  minuteCell: {
    width: '46%',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    gap: 4,
  },
  minuteCellText: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  minuteSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
});
