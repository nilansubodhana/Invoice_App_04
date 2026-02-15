import AsyncStorage from '@react-native-async-storage/async-storage';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerNames: string;
  eventDate: string;
  eventLocation: string;
  phoneNumber: string;
  items: InvoiceItem[];
  fullPrice: string;
  advancePayment: string;
  createdAt: string;
  updatedAt: string;
}

export type ShootType = 'Bridal' | 'Wedding' | 'Birthday' | 'Pre-shoot' | 'Events' | 'Casual' | 'Commercial';

export const SHOOT_TYPES: ShootType[] = ['Bridal', 'Wedding', 'Birthday', 'Pre-shoot', 'Events', 'Casual', 'Commercial'];

export interface ShootEntry {
  id: string;
  clientName: string;
  shootDate: string;
  shootTime: string;
  shootLocation: string;
  salonName: string;
  modelName: string;
  shootType: ShootType;
  price: string;
  advancePaid: string;
  phoneNumber: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_ITEMS: Omit<InvoiceItem, 'id'>[] = [
  { description: 'Wedding Day Photoshoot', quantity: '1' },
  { description: 'Function Coverage', quantity: '1' },
  { description: '16x24 Framed Enlargement', quantity: '2' },
  { description: 'Thank card', quantity: '100' },
  { description: '12x30 Magazine Album', quantity: '1' },
  { description: 'Pen Drive', quantity: '---' },
];

export interface UpcomingShoot {
  id: string;
  clientName: string;
  shootDate: string;
  shootTime: string;
  shootLocation: string;
  salonName: string;
  modelName: string;
  shootType: ShootType;
  contactNumber: string;
  packagePrice: string;
  advancePaid: string;
  notes: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: string;
  date: string;
  createdAt: string;
}

const INVOICES_KEY = 'ns_invoices';
const COUNTER_KEY = 'ns_invoice_counter';
const SHOOTS_KEY = 'ns_shoots';
const UPCOMING_KEY = 'ns_upcoming_shoots';
const EXPENSES_KEY = 'ns_expenses';

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function generateItemId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function createDefaultItems(): InvoiceItem[] {
  return DEFAULT_ITEMS.map(item => ({
    ...item,
    id: generateItemId(),
  }));
}

export async function getNextInvoiceNumber(): Promise<string> {
  const counter = await AsyncStorage.getItem(COUNTER_KEY);
  const next = counter ? parseInt(counter, 10) + 1 : 1;
  await AsyncStorage.setItem(COUNTER_KEY, next.toString());
  return next.toString().padStart(4, '0');
}

export async function getAllInvoices(): Promise<Invoice[]> {
  const data = await AsyncStorage.getItem(INVOICES_KEY);
  if (!data) return [];
  const invoices: Invoice[] = JSON.parse(data);
  return invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const invoices = await getAllInvoices();
  return invoices.find(inv => inv.id === id) || null;
}

export async function saveInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
  const invoices = await getAllInvoices();
  const newInvoice: Invoice = {
    ...invoice,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  invoices.push(newInvoice);
  await AsyncStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
  return newInvoice;
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | null> {
  const invoices = await getAllInvoices();
  const index = invoices.findIndex(inv => inv.id === id);
  if (index === -1) return null;
  invoices[index] = {
    ...invoices[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
  return invoices[index];
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const invoices = await getAllInvoices();
  const filtered = invoices.filter(inv => inv.id !== id);
  if (filtered.length === invoices.length) return false;
  await AsyncStorage.setItem(INVOICES_KEY, JSON.stringify(filtered));
  return true;
}

export async function getAllShoots(): Promise<ShootEntry[]> {
  const data = await AsyncStorage.getItem(SHOOTS_KEY);
  if (!data) return [];
  const shoots: ShootEntry[] = JSON.parse(data).map((s: any) => ({
    ...s,
    clientName: s.clientName || s.modelName || '',
    shootTime: s.shootTime || '',
    salonName: s.salonName || '',
    modelName: s.modelName || '',
    advancePaid: s.advancePaid || '',
  }));
  return shoots.sort((a, b) => new Date(b.shootDate).getTime() - new Date(a.shootDate).getTime());
}

export async function getShoot(id: string): Promise<ShootEntry | null> {
  const shoots = await getAllShoots();
  return shoots.find(s => s.id === id) || null;
}

export async function saveShoot(shoot: Omit<ShootEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShootEntry> {
  const shoots = await getAllShoots();
  const newShoot: ShootEntry = {
    ...shoot,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  shoots.push(newShoot);
  await AsyncStorage.setItem(SHOOTS_KEY, JSON.stringify(shoots));
  return newShoot;
}

export async function updateShoot(id: string, updates: Partial<ShootEntry>): Promise<ShootEntry | null> {
  const shoots = await getAllShoots();
  const index = shoots.findIndex(s => s.id === id);
  if (index === -1) return null;
  shoots[index] = {
    ...shoots[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(SHOOTS_KEY, JSON.stringify(shoots));
  return shoots[index];
}

export async function deleteShoot(id: string): Promise<boolean> {
  const shoots = await getAllShoots();
  const filtered = shoots.filter(s => s.id !== id);
  if (filtered.length === shoots.length) return false;
  await AsyncStorage.setItem(SHOOTS_KEY, JSON.stringify(filtered));
  return true;
}

export function getShootsByMonth(shoots: ShootEntry[], year: number, month: number): ShootEntry[] {
  return shoots.filter(s => {
    const d = new Date(s.shootDate);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function getMonthlyStats(shoots: ShootEntry[]) {
  const totalShoots = shoots.length;
  const totalIncome = shoots.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  const avgPerShoot = totalShoots > 0 ? totalIncome / totalShoots : 0;
  return { totalShoots, totalIncome, avgPerShoot };
}

export function searchShoots(shoots: ShootEntry[], query: string): ShootEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return shoots;
  return shoots.filter(s =>
    s.clientName.toLowerCase().includes(q) ||
    s.shootLocation.toLowerCase().includes(q) ||
    s.salonName.toLowerCase().includes(q) ||
    s.modelName.toLowerCase().includes(q) ||
    s.shootType.toLowerCase().includes(q) ||
    s.notes.toLowerCase().includes(q)
  );
}

export function searchInvoices(invoices: Invoice[], query: string): Invoice[] {
  const q = query.toLowerCase().trim();
  if (!q) return invoices;
  return invoices.filter(inv =>
    inv.customerNames.toLowerCase().includes(q) ||
    inv.invoiceNumber.toLowerCase().includes(q) ||
    inv.eventLocation.toLowerCase().includes(q) ||
    inv.phoneNumber.toLowerCase().includes(q)
  );
}

export function getTotal(invoice: Invoice): number {
  return parseFloat(invoice.fullPrice) || 0;
}

export function calculateBalance(total: number, advance: string): number {
  const adv = parseFloat(advance) || 0;
  return total - adv;
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate().toString().padStart(2, '0')}.${months[date.getMonth()]}.${date.getFullYear()}`;
}

export function getMonthName(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month];
}

export async function getAllUpcomingShoots(): Promise<UpcomingShoot[]> {
  const data = await AsyncStorage.getItem(UPCOMING_KEY);
  if (!data) return [];
  const shoots: UpcomingShoot[] = JSON.parse(data).map((s: any) => ({
    ...s,
    salonName: s.salonName || '',
    modelName: s.modelName || '',
  }));
  return shoots.sort((a, b) => new Date(a.shootDate).getTime() - new Date(b.shootDate).getTime());
}

export async function saveUpcomingShoot(shoot: Omit<UpcomingShoot, 'id' | 'createdAt' | 'updatedAt'>): Promise<UpcomingShoot> {
  const shoots = await getAllUpcomingShoots();
  const newShoot: UpcomingShoot = {
    ...shoot,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  shoots.push(newShoot);
  await AsyncStorage.setItem(UPCOMING_KEY, JSON.stringify(shoots));
  return newShoot;
}

export async function updateUpcomingShoot(id: string, updates: Partial<UpcomingShoot>): Promise<UpcomingShoot | null> {
  const shoots = await getAllUpcomingShoots();
  const index = shoots.findIndex(s => s.id === id);
  if (index === -1) return null;
  shoots[index] = {
    ...shoots[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(UPCOMING_KEY, JSON.stringify(shoots));
  return shoots[index];
}

export async function deleteUpcomingShoot(id: string): Promise<boolean> {
  const shoots = await getAllUpcomingShoots();
  const filtered = shoots.filter(s => s.id !== id);
  if (filtered.length === shoots.length) return false;
  await AsyncStorage.setItem(UPCOMING_KEY, JSON.stringify(filtered));
  return true;
}

export function getUpcomingShootsFromToday(shoots: UpcomingShoot[]): UpcomingShoot[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return shoots.filter(s => {
    const d = new Date(s.shootDate);
    d.setHours(0, 0, 0, 0);
    return d >= today && !s.completed;
  });
}

export function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDaysUntilLabel(dateStr: string): string {
  const days = getDaysUntil(dateStr);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `${days} days`;
  if (days <= 30) return `${Math.ceil(days / 7)} weeks`;
  return `${Math.ceil(days / 30)} months`;
}

export async function getAllExpenses(): Promise<Expense[]> {
  const data = await AsyncStorage.getItem(EXPENSES_KEY);
  if (!data) return [];
  const expenses: Expense[] = JSON.parse(data);
  return expenses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
  const expenses = await getAllExpenses();
  const newExpense: Expense = {
    ...expense,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  expenses.push(newExpense);
  await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  return newExpense;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const expenses = await getAllExpenses();
  const filtered = expenses.filter(e => e.id !== id);
  if (filtered.length === expenses.length) return false;
  await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(filtered));
  return true;
}

export function getExpensesByMonth(expenses: Expense[], year: number, month: number): Expense[] {
  return expenses.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}
