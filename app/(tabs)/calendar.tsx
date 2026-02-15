import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/theme-context';
import {
  Invoice,
  UpcomingShoot,
  getAllInvoices,
  getAllUpcomingShoots,
  formatCurrency,
  getMonthName,
} from '@/lib/storage';

type BookingEvent = {
  id: string;
  date: string;
  title: string;
  location: string;
  type: 'invoice' | 'upcoming';
  shootType?: string;
  price?: string;
  time?: string;
  completed?: boolean;
  phone?: string;
};

const TYPE_COLORS: Record<string, string> = {
  'Bridal': '#8B1A4A',
  'Wedding': '#1B4332',
  'Birthday': '#D4531A',
  'Pre-shoot': '#C8A951',
  'Events': '#5B2C8E',
  'Casual': '#6B6560',
  'Commercial': '#2C1810',
};

const TYPE_ICONS: Record<string, string> = {
  'Bridal': 'crown',
  'Wedding': 'heart',
  'Birthday': 'cake-variant',
  'Pre-shoot': 'camera-iris',
  'Events': 'party-popper',
  'Casual': 'account',
  'Commercial': 'briefcase',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarTab() {
  const insets = useSafeAreaInsets();
  const { colors: themeColors, invoiceColors } = useTheme();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [upcomingShoots, setUpcomingShoots] = useState<UpcomingShoot[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [invData, upData] = await Promise.all([
      getAllInvoices(),
      getAllUpcomingShoots(),
    ]);
    setInvoices(invData);
    setUpcomingShoots(upData);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const allEvents = useMemo(() => {
    const events: BookingEvent[] = [];

    invoices.forEach(inv => {
      if (inv.eventDate) {
        events.push({
          id: `inv-${inv.id}`,
          date: inv.eventDate,
          title: inv.customerNames || 'Invoice Event',
          location: inv.eventLocation || '',
          type: 'invoice',
          price: inv.fullPrice,
          phone: inv.phoneNumber,
        });
      }
    });

    upcomingShoots.forEach(shoot => {
      events.push({
        id: `up-${shoot.id}`,
        date: shoot.shootDate,
        title: shoot.clientName || 'Upcoming Shoot',
        location: shoot.shootLocation || '',
        type: 'upcoming',
        shootType: shoot.shootType,
        price: shoot.packagePrice,
        time: shoot.shootTime,
        completed: shoot.completed,
        phone: shoot.contactNumber,
      });
    });

    return events;
  }, [invoices, upcomingShoots]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, BookingEvent[]> = {};
    allEvents.forEach(ev => {
      const dateKey = ev.date.split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(ev);
    });
    return map;
  }, [allEvents]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: ({ day: number; dateKey: string } | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateKey });
    }
    return days;
  }, [viewYear, viewMonth]);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[selectedDate] || [];
  }, [selectedDate, eventsByDate]);

  const navigateMonth = (dir: number) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
    setSelectedDate(null);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const totalBookings = allEvents.length;
  const monthBookings = calendarDays.filter(d => d && eventsByDate[d.dateKey]?.length).length;

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Calendar</Text>
          <Text style={[styles.headerSub, { color: invoiceColors.gold }]}>BOOKINGS</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={[styles.headerBadgeText, { color: invoiceColors.gold }]}>{monthBookings} this month</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={invoiceColors.gold} />}
      >
        <View style={[styles.monthNav, { backgroundColor: themeColors.cardBackground }]}>
          <Pressable onPress={() => navigateMonth(-1)} hitSlop={12} style={[styles.navBtn, { backgroundColor: themeColors.background }]}>
            <Ionicons name="chevron-back" size={22} color={themeColors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); setSelectedDate(todayKey); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={styles.monthDisplay}
          >
            <Text style={[styles.monthText, { color: themeColors.textPrimary }]}>{getMonthName(viewMonth)}</Text>
            <Text style={[styles.yearText, { color: themeColors.textMuted }]}>{viewYear}</Text>
          </Pressable>
          <Pressable onPress={() => navigateMonth(1)} hitSlop={12} style={[styles.navBtn, { backgroundColor: themeColors.background }]}>
            <Ionicons name="chevron-forward" size={22} color={themeColors.textPrimary} />
          </Pressable>
        </View>

        <View style={[styles.calendarCard, { backgroundColor: themeColors.cardBackground }]}>
          <View style={styles.weekRow}>
            {WEEKDAYS.map(wd => (
              <View key={wd} style={styles.weekCell}>
                <Text style={[styles.weekText, { color: themeColors.textMuted }]}>{wd}</Text>
              </View>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarDays.map((item, idx) => {
              if (!item) return <View key={`pad-${idx}`} style={styles.dayCell} />;
              const hasEvents = eventsByDate[item.dateKey]?.length > 0;
              const eventCount = eventsByDate[item.dateKey]?.length || 0;
              const isToday = item.dateKey === todayKey;
              const isSelected = item.dateKey === selectedDate;
              const dayEvents = eventsByDate[item.dateKey] || [];
              const hasInvoice = dayEvents.some(e => e.type === 'invoice');
              const hasUpcoming = dayEvents.some(e => e.type === 'upcoming');

              return (
                <Pressable
                  key={item.dateKey}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: invoiceColors.gold, borderRadius: 14 },
                    isToday && !isSelected && { borderWidth: 1.5, borderColor: invoiceColors.gold, borderRadius: 14 },
                  ]}
                  onPress={() => {
                    setSelectedDate(item.dateKey === selectedDate ? null : item.dateKey);
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[
                    styles.dayText,
                    { color: themeColors.textPrimary },
                    isSelected && { color: '#fff', fontFamily: 'Inter_700Bold' },
                    isToday && !isSelected && { color: invoiceColors.gold, fontFamily: 'Inter_700Bold' },
                  ]}>{item.day}</Text>
                  {hasEvents && (
                    <View style={styles.dotRow}>
                      {hasUpcoming && <View style={[styles.dot, { backgroundColor: isSelected ? '#fff' : invoiceColors.darkGreen }]} />}
                      {hasInvoice && <View style={[styles.dot, { backgroundColor: isSelected ? '#fff' : '#8B1A4A' }]} />}
                      {eventCount > 2 && <View style={[styles.dot, { backgroundColor: isSelected ? '#fff' : invoiceColors.gold }]} />}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: invoiceColors.darkGreen }]} />
              <Text style={[styles.legendText, { color: themeColors.textMuted }]}>Upcoming</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#8B1A4A' }]} />
              <Text style={[styles.legendText, { color: themeColors.textMuted }]}>Invoice</Text>
            </View>
          </View>
        </View>

        {selectedDate && selectedEvents.length > 0 && (
          <View style={styles.eventsSection}>
            <Text style={[styles.eventsSectionTitle, { color: themeColors.textPrimary }]}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            {selectedEvents.map(ev => {
              const isUpcoming = ev.type === 'upcoming';
              const typeColor = isUpcoming ? (TYPE_COLORS[ev.shootType || ''] || invoiceColors.darkGreen) : '#8B1A4A';
              const iconName = isUpcoming ? (TYPE_ICONS[ev.shootType || ''] || 'camera') : 'file-document-outline';
              return (
                <View key={ev.id} style={[styles.eventCard, { backgroundColor: themeColors.cardBackground }]}>
                  <View style={[styles.eventStripe, { backgroundColor: typeColor }]} />
                  <View style={styles.eventContent}>
                    <View style={styles.eventTop}>
                      <View style={[styles.eventIcon, { backgroundColor: typeColor }]}>
                        <MaterialCommunityIcons name={iconName as any} size={16} color="#fff" />
                      </View>
                      <View style={styles.eventInfo}>
                        <Text style={[styles.eventTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>{ev.title}</Text>
                        <Text style={[styles.eventBadge, { color: typeColor }]}>
                          {isUpcoming ? (ev.shootType || 'Shoot') : 'Invoice Event'}
                          {ev.completed ? ' (Done)' : ''}
                        </Text>
                      </View>
                      {ev.price ? (
                        <Text style={[styles.eventPrice, { color: invoiceColors.darkGreen }]}>LKR {formatCurrency(parseFloat(ev.price) || 0)}</Text>
                      ) : null}
                    </View>
                    <View style={styles.eventDetails}>
                      {ev.location ? (
                        <View style={styles.eventDetailRow}>
                          <Feather name="map-pin" size={12} color={themeColors.textMuted} />
                          <Text style={[styles.eventDetailText, { color: themeColors.textMuted }]} numberOfLines={1}>{ev.location}</Text>
                        </View>
                      ) : null}
                      {ev.time ? (
                        <View style={styles.eventDetailRow}>
                          <Feather name="clock" size={12} color={themeColors.textMuted} />
                          <Text style={[styles.eventDetailText, { color: themeColors.textMuted }]}>{ev.time}</Text>
                        </View>
                      ) : null}
                      {ev.phone ? (
                        <View style={styles.eventDetailRow}>
                          <Feather name="phone" size={12} color={themeColors.textMuted} />
                          <Text style={[styles.eventDetailText, { color: themeColors.textMuted }]}>{ev.phone}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {selectedDate && selectedEvents.length === 0 && (
          <View style={styles.noEvents}>
            <MaterialCommunityIcons name="calendar-blank" size={36} color={themeColors.textMuted} />
            <Text style={[styles.noEventsText, { color: themeColors.textMuted }]}>No bookings on this day</Text>
          </View>
        )}

        {!selectedDate && (
          <View style={styles.noEvents}>
            <MaterialCommunityIcons name="gesture-tap" size={36} color={themeColors.textMuted} />
            <Text style={[styles.noEventsText, { color: themeColors.textMuted }]}>Tap a date to see bookings</Text>
          </View>
        )}
      </ScrollView>
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
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDisplay: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  yearText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  calendarCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase' as const,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  eventsSection: {
    marginBottom: 8,
  },
  eventsSectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
  },
  eventCard: {
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  eventStripe: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: 14,
  },
  eventTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  eventBadge: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  eventPrice: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  eventDetails: {
    marginTop: 10,
    gap: 6,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventDetailText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  noEvents: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  noEventsText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});
