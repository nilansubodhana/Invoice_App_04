import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDER_SETTINGS_KEY = 'ns_reminder_settings';

export interface ReminderSettings {
  shootReminders: boolean;
  invoiceReminders: boolean;
  reminderTiming: '1h' | '3h' | '1d' | '2d';
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  shootReminders: true,
  invoiceReminders: true,
  reminderTiming: '1d',
};

export const TIMING_OPTIONS: { value: ReminderSettings['reminderTiming']; label: string; description: string }[] = [
  { value: '1h', label: '1 Hour', description: '1 hour before' },
  { value: '3h', label: '3 Hours', description: '3 hours before' },
  { value: '1d', label: '1 Day', description: '1 day before' },
  { value: '2d', label: '2 Days', description: '2 days before' },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C8A951',
    });
  }

  return true;
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const saved = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_REMINDER_SETTINGS;
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
}

function getTimingOffset(timing: ReminderSettings['reminderTiming']): number {
  switch (timing) {
    case '1h': return 1 * 60 * 60 * 1000;
    case '3h': return 3 * 60 * 60 * 1000;
    case '1d': return 24 * 60 * 60 * 1000;
    case '2d': return 2 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (parts) {
    return new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]), 9, 0, 0);
  }
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;
  return null;
}

function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

export async function scheduleShootReminder(
  shootId: string,
  clientName: string,
  shootDate: string,
  shootTime: string,
  shootType: string,
  location: string,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const settings = await getReminderSettings();
  if (!settings.shootReminders) return null;

  const date = parseDate(shootDate);
  if (!date) return null;

  const time = parseTime(shootTime);
  if (time) {
    date.setHours(time.hours, time.minutes, 0, 0);
  }

  const offset = getTimingOffset(settings.reminderTiming);
  const triggerDate = new Date(date.getTime() - offset);

  if (triggerDate.getTime() <= Date.now()) return null;

  await cancelReminder(`shoot_${shootId}`);

  const timingLabel = TIMING_OPTIONS.find(t => t.value === settings.reminderTiming)?.description || 'soon';

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${shootType} Shoot - ${timingLabel}`,
      body: `${clientName}${location ? ' at ' + location : ''}`,
      data: { type: 'shoot', shootId },
      ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  await saveScheduledId(`shoot_${shootId}`, id);
  return id;
}

export async function scheduleInvoiceReminder(
  invoiceId: string,
  invoiceNumber: string,
  customerNames: string,
  eventDate: string,
  eventLocation: string,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const settings = await getReminderSettings();
  if (!settings.invoiceReminders) return null;

  const date = parseDate(eventDate);
  if (!date) return null;

  date.setHours(8, 0, 0, 0);

  const offset = getTimingOffset(settings.reminderTiming);
  const triggerDate = new Date(date.getTime() - offset);

  if (triggerDate.getTime() <= Date.now()) return null;

  await cancelReminder(`invoice_${invoiceId}`);

  const timingLabel = TIMING_OPTIONS.find(t => t.value === settings.reminderTiming)?.description || 'soon';

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Invoice #${invoiceNumber} Event - ${timingLabel}`,
      body: `${customerNames}${eventLocation ? ' at ' + eventLocation : ''}`,
      data: { type: 'invoice', invoiceId },
      ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  await saveScheduledId(`invoice_${invoiceId}`, id);
  return id;
}

export async function cancelReminder(key: string): Promise<void> {
  try {
    const existingId = await AsyncStorage.getItem(`ns_notif_${key}`);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
      await AsyncStorage.removeItem(`ns_notif_${key}`);
    }
  } catch {}
}

async function saveScheduledId(key: string, notifId: string): Promise<void> {
  await AsyncStorage.setItem(`ns_notif_${key}`, notifId);
}

export async function rescheduleAllReminders(
  shoots: Array<{ id: string; clientName: string; shootDate: string; shootTime: string; shootType: string; shootLocation: string; completed: boolean }>,
  invoices: Array<{ id: string; invoiceNumber: string; customerNames: string; eventDate: string; eventLocation: string }>,
): Promise<void> {
  if (Platform.OS === 'web') return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const settings = await getReminderSettings();

  if (settings.shootReminders) {
    for (const shoot of shoots) {
      if (!shoot.completed) {
        await scheduleShootReminder(shoot.id, shoot.clientName, shoot.shootDate, shoot.shootTime, shoot.shootType, shoot.shootLocation);
      }
    }
  }

  if (settings.invoiceReminders) {
    for (const invoice of invoices) {
      await scheduleInvoiceReminder(invoice.id, invoice.invoiceNumber, invoice.customerNames, invoice.eventDate, invoice.eventLocation);
    }
  }
}
