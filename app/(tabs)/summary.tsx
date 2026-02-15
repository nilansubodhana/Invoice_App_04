import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Dimensions,
  TextInput,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { useTheme } from '@/lib/theme-context';
import {
  ShootEntry,
  Invoice,
  Expense,
  getAllShoots,
  getAllInvoices,
  getAllExpenses,
  saveExpense,
  deleteExpense,
  getExpensesByMonth,
  getShootsByMonth,
  getMonthlyStats,
  getTotal,
  formatCurrency,
  formatDate,
  getMonthName,
} from '@/lib/storage';
import { generateMonthlyReportHTML } from '@/lib/monthly-report';
import { useBranding } from '@/lib/branding-context';

export default function SummaryTab() {
  const insets = useSafeAreaInsets();
  const { colors: themeColors, invoiceColors } = useTheme();
  const { branding } = useBranding();
  const [shoots, setShoots] = useState<ShootEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const summaryRef = useRef<View>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const loadData = useCallback(async () => {
    const [shootData, invoiceData, expenseData] = await Promise.all([
      getAllShoots(),
      getAllInvoices(),
      getAllExpenses(),
    ]);
    setShoots(shootData);
    setInvoices(invoiceData);
    setExpenses(expenseData);
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

  const monthlyShoots = useMemo(
    () => getShootsByMonth(shoots, selectedYear, selectedMonth),
    [shoots, selectedYear, selectedMonth]
  );

  const stats = useMemo(
    () => getMonthlyStats(monthlyShoots),
    [monthlyShoots]
  );

  const monthlyInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const d = new Date(inv.eventDate);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [invoices, selectedYear, selectedMonth]);

  const invoiceStats = useMemo(() => {
    const totalInvoices = monthlyInvoices.length;
    const totalRevenue = monthlyInvoices.reduce((sum, inv) => sum + (parseFloat(inv.fullPrice) || 0), 0);
    const totalAdvance = monthlyInvoices.reduce((sum, inv) => sum + (parseFloat(inv.advancePayment) || 0), 0);
    const totalPending = totalRevenue - totalAdvance;
    return { totalInvoices, totalRevenue, totalAdvance, totalPending };
  }, [monthlyInvoices]);

  const monthlyExpenses = useMemo(() => {
    return getExpensesByMonth(expenses, selectedYear, selectedMonth);
  }, [expenses, selectedYear, selectedMonth]);

  const totalExpenses = useMemo(() => {
    return monthlyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }, [monthlyExpenses]);

  const handleAddExpense = async () => {
    if (!expenseDesc.trim() || !expenseAmount.trim()) {
      Alert.alert('Required', 'Please enter a description and amount.');
      return;
    }
    const now = new Date(selectedYear, selectedMonth, new Date().getDate());
    await saveExpense({
      description: expenseDesc.trim(),
      amount: expenseAmount.trim(),
      date: now.toISOString().split('T')[0],
    });
    setExpenseDesc('');
    setExpenseAmount('');
    setAddingExpense(false);
    await loadData();
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteExpense = (id: string, desc: string) => {
    Alert.alert('Delete Expense', `Remove "${desc}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteExpense(id);
          await loadData();
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  const typeBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; income: number }> = {};
    monthlyShoots.forEach(s => {
      if (!breakdown[s.shootType]) breakdown[s.shootType] = { count: 0, income: 0 };
      breakdown[s.shootType].count += 1;
      breakdown[s.shootType].income += parseFloat(s.price) || 0;
    });
    return breakdown;
  }, [monthlyShoots]);

  const maxIncome = useMemo(() => {
    if (monthlyShoots.length === 0) return 1;
    return Math.max(...monthlyShoots.map(s => parseFloat(s.price) || 0), 1);
  }, [monthlyShoots]);

  const navigateMonth = (dir: number) => {
    let m = selectedMonth + dir;
    let y = selectedYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setSelectedMonth(m);
    setSelectedYear(y);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const [pickerYear, setPickerYear] = useState(selectedYear);

  const selectMonth = (month: number) => {
    setSelectedMonth(month);
    setSelectedYear(pickerYear);
    setCalendarOpen(false);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const handleExportPDF = async () => {
    if (monthlyShoots.length === 0) {
      Alert.alert('No Data', 'There are no shoots to export for this month.');
      return;
    }
    setExporting(true);
    try {
      const html = generateMonthlyReportHTML(monthlyShoots, stats, selectedYear, selectedMonth, branding, invoiceStats, totalExpenses);
      const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Monthly Report - ${getMonthName(selectedMonth)} ${selectedYear}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Saved', 'Monthly report PDF has been saved.');
      }
    } catch {
      Alert.alert('Error', 'Failed to generate monthly report');
    } finally {
      setExporting(false);
    }
  };

  const reportRef = useRef<View>(null);
  const [reportReady, setReportReady] = useState(false);

  const handleSaveToGallery = async () => {
    if (monthlyShoots.length === 0) {
      Alert.alert('No Data', 'There are no shoots to save for this month.');
      return;
    }
    if (Platform.OS === 'web') {
      const html = generateMonthlyReportHTML(monthlyShoots, stats, selectedYear, selectedMonth, branding, invoiceStats, totalExpenses);
      const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
      const link = document.createElement('a');
      link.href = uri;
      link.download = `Monthly_Report_${getMonthName(selectedMonth)}_${selectedYear}.pdf`;
      link.click();
      return;
    }
    setSavingPhoto(true);
    setReportReady(true);
    setTimeout(async () => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Please allow access to your photo gallery to save the report.');
          setSavingPhoto(false);
          setReportReady(false);
          return;
        }

        if (!reportRef.current) {
          Alert.alert('Error', 'Report not ready, please try again.');
          setSavingPhoto(false);
          setReportReady(false);
          return;
        }

        const uri = await captureRef(reportRef, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        });

        await MediaLibrary.saveToLibraryAsync(uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Saved', 'Monthly report has been saved to your photo gallery.');
      } catch (e: any) {
        console.log('Save to gallery error:', e?.message || e);
        Alert.alert('Error', 'Failed to save report to gallery');
      } finally {
        setSavingPhoto(false);
        setReportReady(false);
      }
    }, 500);
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const TYPE_COLORS: Record<string, string> = {
    'Bridal': '#8B1A4A',
    'Wedding': '#1B4332',
    'Birthday': '#D4531A',
    'Pre-shoot': '#C8A951',
    'Events': '#5B2C8E',
    'Casual': '#6B6560',
    'Commercial': '#2C1810',
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Monthly Summary</Text>
          <Text style={[styles.headerSub, { color: invoiceColors.gold }]}>DASHBOARD</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            style={({ pressed }) => [styles.exportBtn, { backgroundColor: invoiceColors.gold }, pressed && { opacity: 0.8 }, savingPhoto && { opacity: 0.5 }]}
            onPress={handleSaveToGallery}
            disabled={savingPhoto}
          >
            {savingPhoto ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="image-outline" size={18} color="#fff" />
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.exportBtn, { backgroundColor: invoiceColors.darkGreen }, pressed && { opacity: 0.8 }, exporting && { opacity: 0.5 }]}
            onPress={handleExportPDF}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="download" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={invoiceColors.gold} />}
      >
        <View style={[styles.monthSelector, { backgroundColor: themeColors.cardBackground }]}>
          <Pressable onPress={() => navigateMonth(-1)} hitSlop={12} style={[styles.navBtn, { backgroundColor: themeColors.background }]}>
            <Ionicons name="chevron-back" size={22} color={themeColors.textPrimary} />
          </Pressable>
          <View style={styles.monthDisplay}>
            <Text style={[styles.monthText, { color: themeColors.textPrimary }]}>{getMonthName(selectedMonth)}</Text>
            <Text style={[styles.yearText, { color: themeColors.textMuted }]}>{selectedYear}</Text>
          </View>
          <Pressable onPress={() => navigateMonth(1)} hitSlop={12} style={[styles.navBtn, { backgroundColor: themeColors.background }]}>
            <Ionicons name="chevron-forward" size={22} color={themeColors.textPrimary} />
          </Pressable>
        </View>

        {/* ===== SHOOTS SECTION ===== */}
        <View style={[styles.sectionDivider, { borderBottomColor: invoiceColors.gold }]}>
          <MaterialCommunityIcons name="camera" size={18} color={invoiceColors.gold} />
          <Text style={[styles.sectionDividerText, { color: invoiceColors.gold }]}>SHOOTS</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.bigStatCard, { backgroundColor: invoiceColors.darkGreen }]}>
            <MaterialCommunityIcons name="camera" size={24} color="rgba(255,255,255,0.5)" />
            <Text style={styles.bigStatValue}>{stats.totalShoots}</Text>
            <Text style={styles.bigStatLabel}>Total Shoots</Text>
          </View>
          <View style={[styles.bigStatCard, { backgroundColor: invoiceColors.primary }]}>
            <MaterialCommunityIcons name="cash" size={24} color="rgba(255,255,255,0.5)" />
            <Text style={styles.bigStatValue}>LKR {formatCurrency(stats.totalIncome)}</Text>
            <Text style={styles.bigStatLabel}>Shoot Income</Text>
          </View>
        </View>
        <View style={[styles.avgCard, { backgroundColor: themeColors.cardBackground }]}>
          <View style={styles.avgLeft}>
            <MaterialCommunityIcons name="chart-line" size={20} color={invoiceColors.gold} />
            <Text style={[styles.avgLabel, { color: themeColors.textSecondary }]}>Avg. per Shoot</Text>
          </View>
          <Text style={[styles.avgValue, { color: invoiceColors.gold }]}>LKR {formatCurrency(stats.avgPerShoot)}</Text>
        </View>

        {Object.keys(typeBreakdown).length > 0 && (
          <View style={styles.breakdownSection}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>By Shoot Type</Text>
            {Object.entries(typeBreakdown).map(([type, data]) => (
              <View key={type} style={[styles.breakdownRow, { backgroundColor: themeColors.cardBackground }]}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownDot, { backgroundColor: TYPE_COLORS[type] || themeColors.textMuted }]} />
                  <Text style={[styles.breakdownType, { color: themeColors.textPrimary }]}>{type}</Text>
                  <Text style={[styles.breakdownCount, { color: themeColors.textMuted, backgroundColor: themeColors.background }]}>{data.count}</Text>
                </View>
                <Text style={[styles.breakdownIncome, { color: invoiceColors.darkGreen }]}>LKR {formatCurrency(data.income)}</Text>
              </View>
            ))}
          </View>
        )}

        {monthlyShoots.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Shoot Income Chart</Text>
            <View style={[styles.chartContainer, { backgroundColor: themeColors.cardBackground }]}>
              {monthlyShoots.map((shoot) => {
                const val = parseFloat(shoot.price) || 0;
                const barHeight = Math.max((val / maxIncome) * 100, 4);
                const typeColor = TYPE_COLORS[shoot.shootType] || themeColors.textMuted;
                return (
                  <View key={shoot.id} style={styles.chartBar}>
                    <Text style={[styles.chartBarValue, { color: themeColors.textMuted }]}>{Math.round(val / 1000)}k</Text>
                    <View style={[styles.bar, { height: barHeight, backgroundColor: typeColor }]} />
                    <Text style={[styles.chartBarDate, { color: themeColors.textMuted }]}>{new Date(shoot.shootDate).getDate()}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {monthlyShoots.length > 0 && (
          <View style={styles.tableSection}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>All Shoots</Text>
            <View style={[styles.tableHeader, { borderBottomColor: invoiceColors.darkGreen }]}>
              <Text style={[styles.tableHeaderText, { flex: 1, color: themeColors.textPrimary }]}>Date</Text>
              <Text style={[styles.tableHeaderText, { flex: 2, color: themeColors.textPrimary }]}>Details</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' as const, color: themeColors.textPrimary }]}>Price</Text>
            </View>
            {monthlyShoots.map((shoot) => (
              <View key={shoot.id} style={[styles.tableRow, { borderBottomColor: themeColors.border }]}>
                <Text style={[styles.tableCell, { flex: 1, color: themeColors.textPrimary }]}>{formatDate(shoot.shootDate)}</Text>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.tableCell, { color: themeColors.textPrimary }]} numberOfLines={1}>
                    {shoot.clientName || shoot.shootLocation}
                  </Text>
                  <Text style={[styles.tableSub, { color: themeColors.textMuted }]}>{shoot.shootType}</Text>
                </View>
                <Text style={[styles.tableCellBold, { flex: 1, textAlign: 'right' as const, color: invoiceColors.darkGreen }]}>
                  {formatCurrency(parseFloat(shoot.price) || 0)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {monthlyShoots.length === 0 && (
          <View style={styles.emptyMini}>
            <MaterialCommunityIcons name="camera-off" size={32} color={themeColors.textMuted} />
            <Text style={[styles.emptyMiniText, { color: themeColors.textMuted }]}>No shoots this month</Text>
          </View>
        )}

        {/* ===== INVOICES SECTION ===== */}
        <View style={[styles.sectionDivider, { borderBottomColor: invoiceColors.primary, marginTop: 8 }]}>
          <MaterialCommunityIcons name="file-document-outline" size={18} color={invoiceColors.primary} />
          <Text style={[styles.sectionDividerText, { color: invoiceColors.primary }]}>INVOICES</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.bigStatCard, { backgroundColor: '#8B1A4A' }]}>
            <MaterialCommunityIcons name="file-document-outline" size={24} color="rgba(255,255,255,0.5)" />
            <Text style={styles.bigStatValue}>{invoiceStats.totalInvoices}</Text>
            <Text style={styles.bigStatLabel}>Invoices</Text>
          </View>
          <View style={[styles.bigStatCard, { backgroundColor: '#1B4332' }]}>
            <MaterialCommunityIcons name="cash-multiple" size={24} color="rgba(255,255,255,0.5)" />
            <Text style={styles.bigStatValue}>LKR {formatCurrency(invoiceStats.totalRevenue)}</Text>
            <Text style={styles.bigStatLabel}>Invoice Revenue</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.smallStatCard, { backgroundColor: themeColors.cardBackground }]}>
            <Text style={[styles.smallStatLabel, { color: themeColors.textMuted }]}>Advance Received</Text>
            <Text style={[styles.smallStatValue, { color: '#27AE60' }]}>LKR {formatCurrency(invoiceStats.totalAdvance)}</Text>
          </View>
          <View style={[styles.smallStatCard, { backgroundColor: themeColors.cardBackground }]}>
            <Text style={[styles.smallStatLabel, { color: themeColors.textMuted }]}>Pending Balance</Text>
            <Text style={[styles.smallStatValue, { color: invoiceStats.totalPending > 0 ? '#C0392B' : '#27AE60' }]}>LKR {formatCurrency(invoiceStats.totalPending)}</Text>
          </View>
        </View>

        {monthlyInvoices.length > 0 && (
          <View style={styles.tableSection}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>All Invoices</Text>
            <View style={[styles.tableHeader, { borderBottomColor: invoiceColors.primary }]}>
              <Text style={[styles.tableHeaderText, { flex: 1, color: themeColors.textPrimary }]}>Inv #</Text>
              <Text style={[styles.tableHeaderText, { flex: 2, color: themeColors.textPrimary }]}>Client</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' as const, color: themeColors.textPrimary }]}>Total</Text>
            </View>
            {monthlyInvoices.map((inv) => {
              const total = parseFloat(inv.fullPrice) || 0;
              const advance = parseFloat(inv.advancePayment) || 0;
              const balance = total - advance;
              return (
                <View key={inv.id} style={[styles.tableRow, { borderBottomColor: themeColors.border }]}>
                  <Text style={[styles.tableCell, { flex: 1, color: invoiceColors.gold }]}>#{inv.invoiceNumber}</Text>
                  <View style={{ flex: 2 }}>
                    <Text style={[styles.tableCell, { color: themeColors.textPrimary }]} numberOfLines={1}>
                      {inv.customerNames}
                    </Text>
                    <Text style={[styles.tableSub, { color: balance > 0 ? '#C0392B' : '#27AE60' }]}>
                      {balance > 0 ? `Bal: ${formatCurrency(balance)}` : 'Fully Paid'}
                    </Text>
                  </View>
                  <Text style={[styles.tableCellBold, { flex: 1, textAlign: 'right' as const, color: invoiceColors.darkGreen }]}>
                    {formatCurrency(total)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {monthlyInvoices.length === 0 && (
          <View style={styles.emptyMini}>
            <MaterialCommunityIcons name="file-document-outline" size={32} color={themeColors.textMuted} />
            <Text style={[styles.emptyMiniText, { color: themeColors.textMuted }]}>No invoices this month</Text>
          </View>
        )}

        {/* ===== EXPENSES SECTION ===== */}
        <View style={[styles.sectionDivider, { borderBottomColor: '#C0392B', marginTop: 8 }]}>
          <MaterialCommunityIcons name="wallet-outline" size={18} color="#C0392B" />
          <Text style={[styles.sectionDividerText, { color: '#C0392B' }]}>EXPENSES</Text>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => {
              setAddingExpense(!addingExpense);
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            hitSlop={8}
          >
            <Ionicons name={addingExpense ? 'close-circle' : 'add-circle'} size={24} color="#C0392B" />
          </Pressable>
        </View>

        {addingExpense && (
          <View style={[styles.expenseForm, { backgroundColor: themeColors.cardBackground }]}>
            <TextInput
              style={[styles.expenseInput, { color: themeColors.textPrimary, borderColor: themeColors.border, backgroundColor: themeColors.background }]}
              value={expenseDesc}
              onChangeText={setExpenseDesc}
              placeholder="e.g. Fuel, Equipment, Printing"
              placeholderTextColor={themeColors.textMuted}
            />
            <View style={styles.expenseFormRow}>
              <TextInput
                style={[styles.expenseInput, { flex: 1, color: themeColors.textPrimary, borderColor: themeColors.border, backgroundColor: themeColors.background }]}
                value={expenseAmount}
                onChangeText={setExpenseAmount}
                placeholder="Amount (LKR)"
                placeholderTextColor={themeColors.textMuted}
                keyboardType="numeric"
              />
              <Pressable
                style={({ pressed }) => [styles.expenseSaveBtn, pressed && { opacity: 0.8 }]}
                onPress={handleAddExpense}
              >
                <Ionicons name="checkmark" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>
        )}

        <View style={[styles.expenseTotalCard, { backgroundColor: themeColors.cardBackground }]}>
          <View style={styles.avgLeft}>
            <MaterialCommunityIcons name="wallet-outline" size={20} color="#C0392B" />
            <Text style={[styles.avgLabel, { color: themeColors.textSecondary }]}>Total Expenses</Text>
          </View>
          <Text style={[styles.avgValue, { color: '#C0392B' }]}>LKR {formatCurrency(totalExpenses)}</Text>
        </View>

        {monthlyExpenses.length > 0 && (
          <View style={styles.tableSection}>
            {monthlyExpenses.map((exp) => (
              <View key={exp.id} style={[styles.expenseRow, { backgroundColor: themeColors.cardBackground }]}>
                <View style={styles.expenseRowLeft}>
                  <Text style={[styles.expenseRowDesc, { color: themeColors.textPrimary }]}>{exp.description}</Text>
                  <Text style={[styles.tableSub, { color: themeColors.textMuted }]}>{formatDate(exp.date)}</Text>
                </View>
                <Text style={[styles.expenseRowAmount, { color: '#C0392B' }]}>LKR {formatCurrency(parseFloat(exp.amount) || 0)}</Text>
                <Pressable
                  onPress={() => handleDeleteExpense(exp.id, exp.description)}
                  hitSlop={8}
                  style={styles.expenseDeleteBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={themeColors.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {monthlyExpenses.length === 0 && !addingExpense && (
          <View style={styles.emptyMini}>
            <MaterialCommunityIcons name="wallet-outline" size={32} color={themeColors.textMuted} />
            <Text style={[styles.emptyMiniText, { color: themeColors.textMuted }]}>No expenses this month</Text>
          </View>
        )}

        {/* ===== COMBINED TOTAL ===== */}
        <View style={[styles.grandTotalCard, { backgroundColor: invoiceColors.darkGreen }]}>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Combined Monthly Income</Text>
            <Text style={styles.grandTotalValue}>
              LKR {formatCurrency(stats.totalIncome + invoiceStats.totalRevenue)}
            </Text>
          </View>
          <View style={styles.grandTotalBreakdown}>
            <View style={styles.grandTotalItem}>
              <MaterialCommunityIcons name="camera" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={styles.grandTotalItemText}>Shoots: LKR {formatCurrency(stats.totalIncome)}</Text>
            </View>
            <View style={styles.grandTotalItem}>
              <MaterialCommunityIcons name="file-document-outline" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={styles.grandTotalItemText}>Invoices: LKR {formatCurrency(invoiceStats.totalRevenue)}</Text>
            </View>
          </View>
          {totalExpenses > 0 && (
            <>
              <View style={[styles.grandTotalBreakdown, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }]}>
                <View style={styles.grandTotalItem}>
                  <MaterialCommunityIcons name="wallet-outline" size={14} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.grandTotalItemText}>Expenses: - LKR {formatCurrency(totalExpenses)}</Text>
                </View>
              </View>
              <View style={[styles.grandTotalRow, { marginTop: 10, paddingTop: 10, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.3)' }]}>
                <Text style={styles.grandTotalLabel}>Net Profit</Text>
                <Text style={[styles.grandTotalValue, { color: (stats.totalIncome + invoiceStats.totalRevenue - totalExpenses) >= 0 ? '#fff' : '#FF6B6B' }]}>
                  LKR {formatCurrency(stats.totalIncome + invoiceStats.totalRevenue - totalExpenses)}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: invoiceColors.gold, bottom: insets.bottom + 80 },
          pressed && { transform: [{ scale: 0.92 }], opacity: 0.9 },
        ]}
        onPress={() => { setPickerYear(selectedYear); setCalendarOpen(true); }}
      >
        <MaterialCommunityIcons name="calendar-month" size={24} color="#fff" />
      </Pressable>

      <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setCalendarOpen(false)}>
          <Pressable style={[styles.calendarModal, { backgroundColor: themeColors.cardBackground }]} onPress={() => {}}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={() => setPickerYear(p => p - 1)} hitSlop={12}>
                <Ionicons name="chevron-back" size={24} color={themeColors.textPrimary} />
              </Pressable>
              <Text style={[styles.calendarYearText, { color: themeColors.textPrimary }]}>{pickerYear}</Text>
              <Pressable onPress={() => setPickerYear(p => p + 1)} hitSlop={12}>
                <Ionicons name="chevron-forward" size={24} color={themeColors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.monthGrid}>
              {MONTH_NAMES_SHORT.map((name, i) => {
                const isSelected = i === selectedMonth && pickerYear === selectedYear;
                const isCurrent = i === now.getMonth() && pickerYear === now.getFullYear();
                return (
                  <Pressable
                    key={name}
                    style={[
                      styles.monthCell,
                      { backgroundColor: themeColors.background },
                      isSelected && { backgroundColor: invoiceColors.gold },
                      isCurrent && !isSelected && { borderColor: invoiceColors.gold, borderWidth: 1.5 },
                    ]}
                    onPress={() => selectMonth(i)}
                  >
                    <Text style={[
                      styles.monthCellText,
                      { color: themeColors.textPrimary },
                      isSelected && { color: '#fff', fontFamily: 'Inter_700Bold' },
                    ]}>{name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={[styles.todayBtn, { borderColor: invoiceColors.gold }]} onPress={() => { setPickerYear(now.getFullYear()); selectMonth(now.getMonth()); }}>
              <Text style={[styles.todayBtnText, { color: invoiceColors.gold }]}>Go to Today</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {reportReady && (
        <View style={{ position: 'absolute', left: -9999, top: 0 }}>
          <View
            ref={reportRef}
            collapsable={false}
            style={{ width: 375, backgroundColor: '#FAF8F5', padding: 24 }}
          >
            <Text style={{ fontSize: 20, fontFamily: 'PlayfairDisplay_700Bold', color: invoiceColors.primary, marginBottom: 2 }}>
              {branding.businessName}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#999', marginBottom: 16 }}>
              Monthly Summary Report
            </Text>

            <View style={{ backgroundColor: invoiceColors.gold, borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <Text style={{ fontSize: 18, fontFamily: 'PlayfairDisplay_700Bold', color: '#fff', textAlign: 'center' }}>
                {getMonthName(selectedMonth)} {selectedYear}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1, backgroundColor: invoiceColors.darkGreen, borderRadius: 10, padding: 12 }}>
                <Text style={{ fontSize: 24, fontFamily: 'Inter_700Bold', color: '#fff' }}>{stats.totalShoots}</Text>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' }}>Total Shoots</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: invoiceColors.primary, borderRadius: 10, padding: 12 }}>
                <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' }}>LKR {formatCurrency(stats.totalIncome)}</Text>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)' }}>Shoot Income</Text>
              </View>
            </View>

            {invoiceStats.totalInvoices > 0 && (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E8E4DF' }}>
                  <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: invoiceColors.primary }}>LKR {formatCurrency(invoiceStats.totalRevenue)}</Text>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#999' }}>Invoice Income</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E8E4DF' }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: '#27AE60' }}>LKR {formatCurrency(invoiceStats.totalAdvance)}</Text>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#999' }}>Advance Received</Text>
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E8E4DF' }}>
                <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: invoiceColors.primary }}>LKR {formatCurrency(totalExpenses)}</Text>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#999' }}>Expenses</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E8E4DF' }}>
                <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: (stats.totalIncome + invoiceStats.totalRevenue - totalExpenses) >= 0 ? '#1B4332' : '#8B1A4A' }}>
                  LKR {formatCurrency(stats.totalIncome + invoiceStats.totalRevenue - totalExpenses)}
                </Text>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_400Regular', color: '#999' }}>Net Profit</Text>
              </View>
            </View>

            <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: invoiceColors.primary, marginBottom: 8, letterSpacing: 1 }}>
              BY SHOOT TYPE
            </Text>
            {Object.entries(
              monthlyShoots.reduce((acc: Record<string, { count: number; income: number }>, s) => {
                if (!acc[s.shootType]) acc[s.shootType] = { count: 0, income: 0 };
                acc[s.shootType].count += 1;
                acc[s.shootType].income += parseFloat(s.price) || 0;
                return acc;
              }, {})
            ).map(([type, data]) => (
              <View key={type} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E8E4DF' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TYPE_COLORS[type] || '#999' }} />
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: '#333' }}>{type}</Text>
                  <Text style={{ fontSize: 10, color: '#999' }}>{data.count}</Text>
                </View>
                <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#333' }}>LKR {formatCurrency(data.income)}</Text>
              </View>
            ))}

            <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: invoiceColors.primary, marginTop: 18, marginBottom: 8, letterSpacing: 1 }}>
              ALL SHOOTS
            </Text>
            {monthlyShoots.map((s, i) => (
              <View key={s.id || i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F0ECE8' }}>
                <View>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#333' }}>{s.clientName}</Text>
                  <Text style={{ fontSize: 9, color: '#999' }}>{formatDate(s.date)} | {s.shootType}</Text>
                </View>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: invoiceColors.darkGreen }}>LKR {formatCurrency(parseFloat(s.price) || 0)}</Text>
              </View>
            ))}

            <View style={{ marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: invoiceColors.gold }}>
              <Text style={{ fontSize: 9, fontFamily: 'Inter_400Regular', color: '#999', textAlign: 'center' }}>
                Generated by {branding.businessName}
              </Text>
            </View>
          </View>
        </View>
      )}

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
  exportBtn: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
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
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    marginBottom: 16,
    borderBottomWidth: 2,
  },
  sectionDividerText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  bigStatCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
  },
  bigStatValue: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    marginTop: 8,
  },
  bigStatLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 3,
  },
  smallStatCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  smallStatLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginBottom: 6,
  },
  smallStatValue: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  avgCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avgLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avgLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  avgValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  breakdownSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownType: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  breakdownCount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  breakdownIncome: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  chartSection: {
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 16,
    padding: 16,
    paddingTop: 24,
    height: 180,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    maxWidth: 30,
  },
  chartBarValue: {
    fontSize: 8,
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
  },
  bar: {
    width: '70%',
    borderRadius: 4,
    minHeight: 4,
  },
  chartBarDate: {
    fontSize: 9,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  tableSection: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: 2,
  },
  tableHeaderText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableCell: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  tableSub: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  tableCellBold: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyMini: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyMiniText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    width: Dimensions.get('window').width - 48,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  calendarYearText: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  monthCell: {
    width: '28%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  monthCellText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  todayBtn: {
    marginTop: 18,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  todayBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  expenseForm: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  expenseFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expenseInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
  },
  expenseSaveBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#27AE60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseTotalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  expenseRowLeft: {
    flex: 1,
  },
  expenseRowDesc: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  expenseRowAmount: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    marginRight: 10,
  },
  expenseDeleteBtn: {
    padding: 4,
  },
  grandTotalCard: {
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.8)',
  },
  grandTotalValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  grandTotalBreakdown: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  grandTotalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  grandTotalItemText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.7)',
  },
});
