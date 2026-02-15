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
  Image,
  TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useTheme } from '@/lib/theme-context';
import { useBranding } from '@/lib/branding-context';
import { Invoice, getAllInvoices, deleteInvoice, getTotal, searchInvoices, formatCurrency, formatDate } from '@/lib/storage';

export default function InvoicesTab() {
  const insets = useSafeAreaInsets();
  const { colors: themeColors, invoiceColors } = useTheme();
  const { branding } = useBranding();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filtered, setFiltered] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadInvoices = useCallback(async () => {
    const data = await getAllInvoices();
    setInvoices(data);
    setFiltered(searchQuery ? searchInvoices(data, searchQuery) : data);
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadInvoices();
    }, [loadInvoices])
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setFiltered(text ? searchInvoices(invoices, text) : invoices);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Invoice',
      `Are you sure you want to delete the invoice for ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteInvoice(id);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadInvoices();
          },
        },
      ]
    );
  };

  const totalRevenue = invoices.reduce((sum, inv) => sum + getTotal(inv), 0);
  const totalBalance = invoices.reduce((sum, inv) => {
    const total = getTotal(inv);
    const advance = parseFloat(inv.advancePayment) || 0;
    return sum + (total - advance);
  }, 0);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const renderInvoiceCard = ({ item }: { item: Invoice }) => {
    const total = getTotal(item);
    const advance = parseFloat(item.advancePayment) || 0;
    const balance = total - advance;

    return (
      <Pressable
        style={({ pressed }) => [styles.invoiceCard, { backgroundColor: themeColors.cardBackground }, pressed && styles.cardPressed]}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: '/preview/[id]', params: { id: item.id } });
        }}
        onLongPress={() => handleDelete(item.id, item.customerNames)}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={[styles.invoiceIconContainer, { backgroundColor: invoiceColors.gold + '20' }]}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color={invoiceColors.gold} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardCustomer, { color: themeColors.textPrimary }]} numberOfLines={1}>{item.customerNames}</Text>
              <Text style={[styles.cardInvoiceNo, { color: themeColors.textMuted }]}>#{item.invoiceNumber}</Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.cardTotal, { color: themeColors.textPrimary }]}>{formatCurrency(total)}</Text>
            <Text style={[styles.cardBalance, balance > 0 ? styles.balanceDue : styles.balancePaid]}>
              {balance > 0 ? `Due: ${formatCurrency(balance)}` : 'Paid'}
            </Text>
          </View>
        </View>
        <View style={[styles.cardBottom, { borderTopColor: themeColors.border }]}>
          <View style={styles.cardMeta}>
            <Feather name="calendar" size={12} color={themeColors.textMuted} />
            <Text style={[styles.cardDate, { color: themeColors.textMuted }]}>{formatDate(item.eventDate)}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Feather name="map-pin" size={12} color={themeColors.textMuted} />
            <Text style={[styles.cardDate, { color: themeColors.textMuted }]} numberOfLines={1}>{item.eventLocation || 'N/A'}</Text>
          </View>
          <View style={styles.cardActions}>
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: '/edit/[id]', params: { id: item.id } });
              }}
              hitSlop={10}
            >
              <Feather name="edit-2" size={16} color={themeColors.textMuted} />
            </Pressable>
            <Pressable onPress={() => handleDelete(item.id, item.customerNames)} hitSlop={10}>
              <Feather name="trash-2" size={16} color={Colors.danger} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Image source={{ uri: branding.logoUri }} style={styles.emptyLogo} />
      <Text style={styles.emptyTitle}>No Invoices Yet</Text>
      <Text style={styles.emptyText}>Create your first invoice to get started</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset, backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={{ uri: branding.logoUri }} style={styles.headerLogo} />
          <View>
            <Text style={[styles.brandName, { color: themeColors.textPrimary }]}>{branding.ownerName}</Text>
            <Text style={[styles.brandSub, { color: invoiceColors.gold }]}>{branding.businessSub}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => setShowSearch(!showSearch)} hitSlop={8}>
            <Feather name="search" size={20} color={themeColors.textPrimary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.addButton, { backgroundColor: invoiceColors.primary }, pressed && styles.addButtonPressed]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/create');
            }}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>

      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border }]}>
          <Feather name="search" size={16} color={themeColors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.textPrimary }]}
            placeholder="Search by name, location, number..."
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
        <View style={[styles.statCard, { backgroundColor: themeColors.cardBackground }]}>
          <View style={styles.statIconWrap}>
            <MaterialCommunityIcons name="file-document-multiple-outline" size={18} color={invoiceColors.darkGreen} />
          </View>
          <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{invoices.length}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Invoices</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: themeColors.cardBackground }]}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.cream }]}>
            <MaterialCommunityIcons name="cash-multiple" size={18} color={invoiceColors.gold} />
          </View>
          <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{formatCurrency(totalRevenue)}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Revenue</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: themeColors.cardBackground }]}>
          <View style={[styles.statIconWrap, { backgroundColor: '#FFF0F0' }]}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={Colors.danger} />
          </View>
          <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{formatCurrency(totalBalance)}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Pending</Text>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={[styles.listTitle, { color: themeColors.textPrimary }]}>{searchQuery ? 'Search Results' : 'Recent Invoices'}</Text>
        <Text style={[styles.listCount, { color: themeColors.textMuted }]}>{filtered.length} total</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderInvoiceCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 20 },
          filtered.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={invoiceColors.gold} />
        }
      />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  brandName: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: Colors.primary,
  },
  brandSub: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.gold,
    letterSpacing: 4,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
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
  invoiceCard: {
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
    marginBottom: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  invoiceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardCustomer: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  cardInvoiceNo: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  cardTotal: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
  },
  cardBalance: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  balanceDue: {
    color: Colors.danger,
  },
  balancePaid: {
    color: Colors.success,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    gap: 14,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardDate: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 14,
    marginLeft: 'auto' as const,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyLogo: {
    width: 64,
    height: 64,
    tintColor: Colors.textMuted,
    opacity: 0.5,
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
});
