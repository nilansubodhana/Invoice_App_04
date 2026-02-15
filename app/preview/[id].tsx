import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import Colors from '@/constants/colors';
import {
  Invoice,
  getInvoice,
  getTotal,
  calculateBalance,
  formatCurrency,
  formatDate,
} from '@/lib/storage';
import { generateInvoiceHTML } from '@/lib/pdf-generator';
import { useBranding } from '@/lib/branding-context';
import { useTheme } from '@/lib/theme-context';

export default function PreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { branding } = useBranding();
  const { invoiceColors, invoiceStyle } = useTheme();
  const invoiceRef = useRef<View>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    if (!id) return;
    const data = await getInvoice(id);
    setInvoice(data);
    setLoading(false);
  };

  const handleGeneratePDF = async () => {
    if (!invoice) return;
    setGenerating(true);
    try {
      const pdfColors = { primary: invoiceColors.primary, gold: invoiceColors.gold, darkGreen: invoiceColors.darkGreen };
      const html = generateInvoiceHTML(invoice, branding, pdfColors, invoiceStyle);
      const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Invoice #${invoice.invoiceNumber} - ${invoice.customerNames}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Saved', `Invoice PDF has been saved to your device.`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (!invoice) return;
    try {
      const pdfColors = { primary: invoiceColors.primary, gold: invoiceColors.gold, darkGreen: invoiceColors.darkGreen };
      const html = generateInvoiceHTML(invoice, branding, pdfColors, invoiceStyle);
      await Print.printAsync({ html });
    } catch (e) {
      console.log('Print cancelled or failed');
    }
  };

  const handleSavePhoto = async () => {
    if (!invoice || !invoiceRef.current) return;
    setSavingPhoto(true);
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Not Available', 'Saving to gallery is only available on mobile devices.');
        setSavingPhoto(false);
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow access to your photo gallery to save invoices as images.');
        setSavingPhoto(false);
        return;
      }

      const uri = await captureRef(invoiceRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', `Invoice #${invoice.invoiceNumber} has been saved to your gallery.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to save image to gallery');
    } finally {
      setSavingPhoto(false);
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

  if (!invoice) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + webTopInset }]}>
        <Text style={styles.errorText}>Invoice not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const total = getTotal(invoice);
  const advance = parseFloat(invoice.advancePayment) || 0;
  const balance = calculateBalance(total, invoice.advancePayment);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Invoice Preview</Text>
        <Pressable
          onPress={() => router.push({ pathname: '/edit/[id]', params: { id: invoice.id } })}
          hitSlop={12}
        >
          <Feather name="edit-2" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View ref={invoiceRef} collapsable={false} style={styles.invoiceCard}>
          <View style={styles.watermarkContainer}>
            <Image
              source={{ uri: branding.logoUri }}
              style={styles.watermark}
            />
          </View>

          <View style={styles.invoiceHeader}>
            <View style={styles.logoSection}>
              <Image
                source={{ uri: branding.logoUri }}
                style={styles.logoImage}
              />
              <Text style={styles.invoiceTitle}>INVOICE</Text>
            </View>
            <View style={styles.businessBadge}>
              <Text style={styles.businessName}>{branding.businessName}</Text>
              <Text style={styles.businessSub}>{branding.businessSub}</Text>
            </View>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.detailText}>
              Invoice No &nbsp;&nbsp;: &nbsp;{invoice.invoiceNumber}
            </Text>
            <Text style={styles.detailText}>
              Invoice Date : &nbsp;{formatDate(invoice.invoiceDate)}
            </Text>
            <View style={styles.customerRow}>
              <View style={styles.customerLeft}>
                <Text style={styles.customerName}>{invoice.customerNames}</Text>
                <Text style={styles.eventDateText}>{formatDate(invoice.eventDate)}</Text>
                <Text style={styles.locationText}>{invoice.eventLocation}</Text>
              </View>
              <Text style={styles.phoneText}>{invoice.phoneNumber}</Text>
            </View>
          </View>

          <View style={styles.tableSection}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Description</Text>
              <Text style={[styles.tableHeaderText, { width: 60, textAlign: 'center' as const }]}>QTY</Text>
            </View>
            {invoice.items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1 }]}>{item.description}</Text>
                <Text style={[styles.tableCell, { width: 60, textAlign: 'center' as const }]}>
                  {item.quantity || '---'}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.totalsSection}>
            <View style={styles.totalsDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
            </View>
            <View style={styles.goldDivider} />
            <View style={styles.subtotalRow}>
              <Text style={styles.advanceLabel}>Advance</Text>
              <Text style={styles.advanceAmount}>- {formatCurrency(advance)}</Text>
            </View>
            <View style={styles.goldDivider} />
            <View style={styles.subtotalRow}>
              <Text style={styles.balanceLabel}>Balance</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
            </View>
          </View>

          <View style={styles.bankSection}>
            <Text style={styles.bankTitle}>Bank Details :</Text>
            <View style={styles.bankDetailWrap}>
              <Text style={styles.bankDetail}>{branding.bankAccount}</Text>
              <Text style={styles.bankDetail}>{branding.bankHolder}</Text>
              <Text style={styles.bankDetail}>{branding.bankName}</Text>
              <Text style={styles.bankDetail}>{branding.bankBranch}</Text>
            </View>
          </View>

          <View style={styles.contactBar}>
            <Text style={styles.contactLabel}>CONTACT US ;</Text>
            <View style={styles.contactItem}>
              <Feather name="phone" size={10} color={Colors.white} />
              <Text style={styles.contactText}>{branding.contactPhone}</Text>
            </View>
            <View style={styles.contactItem}>
              <Feather name="mail" size={10} color={Colors.white} />
              <Text style={styles.contactText}>{branding.contactEmail}</Text>
            </View>
          </View>

          <View style={styles.sideDecoration}>
            <View style={styles.stripeBrown} />
            <View style={styles.stripeGold} />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + webBottomInset + 10 }]}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }]}
          onPress={handlePrint}
        >
          <Feather name="printer" size={18} color={Colors.primary} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }, savingPhoto && { opacity: 0.6 }]}
          onPress={handleSavePhoto}
          disabled={savingPhoto}
        >
          {savingPhoto ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <MaterialCommunityIcons name="image-move" size={20} color={Colors.primary} />
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }, generating && { opacity: 0.6 }]}
          onPress={handleGeneratePDF}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Feather name="share" size={18} color={Colors.white} />
          )}
          <Text style={styles.shareBtnText}>{generating ? 'Generating...' : 'Share PDF'}</Text>
        </Pressable>
      </View>
    </View>
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
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  backLink: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.gold,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    padding: 16,
  },
  invoiceCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
    position: 'relative',
  },
  watermarkContainer: {
    position: 'absolute',
    top: '30%',
    left: '20%',
    right: '20%',
    bottom: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  watermark: {
    width: 200,
    height: 200,
    opacity: 0.04,
    tintColor: Colors.primary,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 10,
    zIndex: 1,
  },
  logoSection: {},
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    tintColor: Colors.primary,
    marginBottom: 8,
  },
  invoiceTitle: {
    fontSize: 36,
    fontFamily: 'PlayfairDisplay_900Black',
    color: Colors.primary,
    letterSpacing: 2,
    fontStyle: 'italic',
  },
  businessBadge: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  businessName: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
    letterSpacing: 2,
  },
  businessSub: {
    fontSize: 8,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 3,
    marginTop: 1,
  },
  detailsSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 1,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  customerLeft: {},
  customerName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  eventDateText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    fontFamily: 'Inter_300Light',
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  phoneText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  tableSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    zIndex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: Colors.darkGreen,
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0ece6',
  },
  tableCell: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textPrimary,
  },
  totalsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 1,
  },
  totalsDivider: {
    height: 2,
    backgroundColor: Colors.border,
    marginBottom: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: Colors.darkGreen,
  },
  totalAmount: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: Colors.darkGreen,
  },
  goldDivider: {
    height: 1.5,
    backgroundColor: Colors.gold,
    marginVertical: 8,
    width: '55%',
    alignSelf: 'flex-end',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 30,
  },
  advanceLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  advanceAmount: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
    minWidth: 90,
    textAlign: 'right' as const,
  },
  balanceLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  balanceAmount: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: Colors.gold,
    minWidth: 90,
    textAlign: 'right' as const,
  },
  bankSection: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    zIndex: 1,
  },
  bankTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  bankDetail: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    lineHeight: 18,
  },
  bankDetailWrap: {
    marginLeft: 40,
    marginTop: 4,
  },
  contactBar: {
    backgroundColor: Colors.darkGreen,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    zIndex: 1,
  },
  contactLabel: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: Colors.gold,
    letterSpacing: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.white,
  },
  sideDecoration: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    width: 30,
    height: 180,
    zIndex: 1,
  },
  stripeBrown: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 18,
    height: 170,
    backgroundColor: Colors.primary,
    borderTopRightRadius: 10,
  },
  stripeGold: {
    position: 'absolute',
    left: 8,
    bottom: 0,
    width: 14,
    height: 110,
    backgroundColor: Colors.gold,
    borderTopRightRadius: 8,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shareBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.darkGreen,
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
  shareBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
});
