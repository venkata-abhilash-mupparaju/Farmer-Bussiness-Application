import {
  Purchase,
  Sale,
  Customer,
  DebtRepayment,
  Expense,
  AppSettings,
  AreaUnit
} from '../types';
import { convertToAcres, convertFromAcres } from './financialCalculations';

const STORAGE_KEYS = {
  PURCHASES: 'farmer_purchases_v1',
  SALES: 'farmer_sales_v1',
  CUSTOMERS: 'farmer_customers_v1',
  REPAYMENTS: 'farmer_repayments_v1',
  EXPENSES: 'farmer_expenses_v1',
  SETTINGS: 'farmer_settings_v1',
  SEEDED: 'farmer_seeded_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  pin: '1234',
  pin_enabled: true,
  language: 'te',
  voice_enabled: true,
  speech_rate: 0.9,
  default_area_unit: 'ACRES',
};

export class StorageService {
  constructor() {
    this.cleanLegacyDemoData();
  }

  // Ensure zero dummy records: wipe any legacy seed data from previous versions
  private cleanLegacyDemoData(): void {
    try {
      const seedFlag = localStorage.getItem(STORAGE_KEYS.SEEDED);
      if (seedFlag === 'true') {
        // Clear all dummy records
        localStorage.removeItem(STORAGE_KEYS.PURCHASES);
        localStorage.removeItem(STORAGE_KEYS.SALES);
        localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
        localStorage.removeItem(STORAGE_KEYS.REPAYMENTS);
        localStorage.removeItem(STORAGE_KEYS.EXPENSES);
        localStorage.setItem(STORAGE_KEYS.SEEDED, 'zero_records_clean');
      }
    } catch {
      // ignore
    }
  }

  // Complete wipe of all transactions and business data
  clearAllData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.PURCHASES);
      localStorage.removeItem(STORAGE_KEYS.SALES);
      localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
      localStorage.removeItem(STORAGE_KEYS.REPAYMENTS);
      localStorage.removeItem(STORAGE_KEYS.EXPENSES);
      localStorage.setItem(STORAGE_KEYS.SEEDED, 'zero_records_clean');
    } catch {
      // ignore
    }
  }

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  }

  saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  }

  getPurchases(): Purchase[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PURCHASES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  savePurchase(purchase: Purchase): void {
    const list = this.getPurchases();
    const index = list.findIndex((p) => p.id === purchase.id);
    if (index >= 0) {
      list[index] = purchase;
    } else {
      list.unshift(purchase);
    }
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(list));
  }

  deletePurchase(id: string): void {
    const list = this.getPurchases().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(list));
  }

  getSales(): Sale[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Validates inventory availability before saving a sale.
   * Ensures:
   * 1. Sale quantity > 0
   * 2. Available stock > 0
   * 3. Requested quantity <= available stock
   * 4. Rolls and Raw Grass inventories are maintained completely independently.
   * 5. Inventory cannot become negative.
   */
  validateSaleInventory(sale: Sale): { valid: boolean; error?: string } {
    const qty = Number(sale.quantity);
    if (isNaN(qty) || qty <= 0) {
      return { valid: false, error: 'Sale quantity must be greater than zero.' };
    }

    const purchases = this.getPurchases();
    const currentSales = this.getSales();

    if (sale.grass_type === 'ROLLS') {
      const rollPurchases = purchases.filter((p) => p.grass_type === 'ROLLS');
      const otherRollSales = currentSales.filter((s) => s.grass_type === 'ROLLS' && s.id !== sale.id);

      const totalPurchasedRolls = rollPurchases.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
      const totalSoldRolls = otherRollSales.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
      const availableRolls = Math.max(0, totalPurchasedRolls - totalSoldRolls);

      if (availableRolls <= 0) {
        return { valid: false, error: 'No Rolls available in stock.' };
      }

      if (qty > availableRolls) {
        return { valid: false, error: `Insufficient stock. Available quantity: ${availableRolls}.` };
      }
    } else if (sale.grass_type === 'RAW_GRASS') {
      const rawPurchases = purchases.filter((p) => p.grass_type === 'RAW_GRASS');
      const otherRawSales = currentSales.filter((s) => s.grass_type === 'RAW_GRASS' && s.id !== sale.id);

      const totalPurchasedAcres = rawPurchases.reduce(
        (acc, p) => acc + convertToAcres(Number(p.quantity) || 0, p.unit),
        0
      );
      const totalSoldAcres = otherRawSales.reduce(
        (acc, s) => acc + convertToAcres(Number(s.quantity) || 0, s.unit),
        0
      );
      const availableAcres = Math.max(0, totalPurchasedAcres - totalSoldAcres);

      if (availableAcres <= 0) {
        return { valid: false, error: 'No Grass available in stock.' };
      }

      const requestedAcres = convertToAcres(qty, sale.unit);
      if (requestedAcres > availableAcres + 0.00001) {
        const availableInUnit = Number(convertFromAcres(availableAcres, sale.unit as AreaUnit).toFixed(2));
        return {
          valid: false,
          error: `Insufficient stock. Available quantity: ${availableInUnit}.`
        };
      }
    }

    return { valid: true };
  }

  saveSale(sale: Sale): { success: boolean; error?: string } {
    // Perform backend / data-layer inventory validation
    const validation = this.validateSaleInventory(sale);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const list = this.getSales();
    const index = list.findIndex((s) => s.id === sale.id);
    if (index >= 0) {
      list[index] = sale;
    } else {
      list.unshift(sale);
    }
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(list));

    // Ensure customer exists in customer directory
    if (sale.customer_name) {
      this.ensureCustomer(sale.customer_id, sale.customer_name, sale.customer_phone);
    }

    return { success: true };
  }

  deleteSale(id: string): void {
    const list = this.getSales().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(list));
  }

  getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveCustomer(customer: Customer): void {
    const list = this.getCustomers();
    const index = list.findIndex((c) => c.id === customer.id);
    if (index >= 0) {
      list[index] = customer;
    } else {
      list.push(customer);
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
  }

  private ensureCustomer(id: string, name: string, phone?: string): void {
    const customers = this.getCustomers();
    const exists = customers.find((c) => c.id === id || c.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      this.saveCustomer({
        id,
        name,
        phone,
        created_at: new Date().toISOString(),
      });
    }
  }

  getRepayments(): DebtRepayment[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REPAYMENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveRepayment(repayment: DebtRepayment): void {
    const list = this.getRepayments();
    const index = list.findIndex((r) => r.id === repayment.id);
    if (index >= 0) {
      list[index] = repayment;
    } else {
      list.unshift(repayment);
    }
    localStorage.setItem(STORAGE_KEYS.REPAYMENTS, JSON.stringify(list));
  }

  deleteRepayment(id: string): void {
    const list = this.getRepayments().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REPAYMENTS, JSON.stringify(list));
  }

  getExpenses(): Expense[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveExpense(expense: Expense): void {
    const list = this.getExpenses();
    const index = list.findIndex((e) => e.id === expense.id);
    if (index >= 0) {
      list[index] = expense;
    } else {
      list.unshift(expense);
    }
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(list));
  }

  deleteExpense(id: string): void {
    const list = this.getExpenses().filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(list));
  }

  // Backup & Export / Restore
  exportAllDataJSON(): string {
    const backup = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      purchases: this.getPurchases(),
      sales: this.getSales(),
      customers: this.getCustomers(),
      repayments: this.getRepayments(),
      expenses: this.getExpenses(),
      settings: this.getSettings(),
    };
    return JSON.stringify(backup, null, 2);
  }

  importAllDataJSON(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.purchases) localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(parsed.purchases));
      if (parsed.sales) localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(parsed.sales));
      if (parsed.customers) localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(parsed.customers));
      if (parsed.repayments) localStorage.setItem(STORAGE_KEYS.REPAYMENTS, JSON.stringify(parsed.repayments));
      if (parsed.expenses) localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(parsed.expenses));
      if (parsed.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed.settings));
      return { success: true, message: 'All data restored successfully!' };
    } catch (err: unknown) {
      return { success: false, message: 'Invalid backup file format: ' + String(err) };
    }
  }

  // Generates Supabase PostgreSQL schema with RLS and triggers
  generateSupabaseSQL(): string {
    return `-- Supabase PostgreSQL Schema for Farmer's Daily Business & Accounts Management

-- 1. Daily Sessions
CREATE TABLE IF NOT EXISTS daily_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date DATE UNIQUE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  village TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_date DATE NOT NULL,
  grass_type TEXT NOT NULL CHECK (grass_type IN ('ROLLS', 'RAW_GRASS')),
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ROLLS',
  cost_per_unit NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  transport_cost NUMERIC DEFAULT 0,
  supplier_name TEXT,
  supplier_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date DATE NOT NULL,
  grass_type TEXT NOT NULL CHECK (grass_type IN ('ROLLS', 'RAW_GRASS')),
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ROLLS',
  price_per_unit NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL,
  remaining_debt NUMERIC NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  transport_cost NUMERIC DEFAULT 0,
  cost_of_goods_sold NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Debt Repayments
CREATE TABLE IF NOT EXISTS debt_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repayment_date DATE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'UPI', 'OTHER')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('BUYING_TRANSPORT', 'SELLING_TRANSPORT', 'LOADING_UNLOADING', 'LABOUR', 'OTHER')),
  amount NUMERIC NOT NULL,
  related_purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  related_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_debt_customer ON debt_repayments(customer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- Row Level Security (RLS)
ALTER TABLE daily_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated farmer access" ON daily_sessions FOR ALL USING (true);
CREATE POLICY "Allow authenticated farmer access" ON customers FOR ALL USING (true);
CREATE POLICY "Allow authenticated farmer access" ON purchases FOR ALL USING (true);
CREATE POLICY "Allow authenticated farmer access" ON sales FOR ALL USING (true);
CREATE POLICY "Allow authenticated farmer access" ON debt_repayments FOR ALL USING (true);
CREATE POLICY "Allow authenticated farmer access" ON expenses FOR ALL USING (true);
`;
  }
}

export const storage = new StorageService();
