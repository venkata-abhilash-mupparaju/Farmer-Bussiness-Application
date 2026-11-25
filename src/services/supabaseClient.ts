import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Purchase, Sale, Customer, DebtRepayment, Expense } from '../types';

export type SyncStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'LOCAL_ONLY' | 'SYNCING';

class SupabaseService {
  private client: SupabaseClient | null = null;
  private currentUrl: string = '';
  private currentKey: string = '';
  private status: SyncStatus = 'LOCAL_ONLY';
  private listeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    this.initFromStorageOrEnv();
  }

  public subscribeStatus(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.status);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private setStatus(s: SyncStatus) {
    this.status = s;
    for (const listener of this.listeners) {
      listener(s);
    }
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public init(url: string, key: string): boolean {
    if (!url || !key) {
      this.client = null;
      this.currentUrl = '';
      this.currentKey = '';
      this.setStatus('LOCAL_ONLY');
      return false;
    }

    try {
      this.client = createClient(url, key, {
        auth: { persistSession: true },
      });
      this.currentUrl = url;
      this.currentKey = key;
      this.setStatus('CONNECTING');
      this.testConnection();
      return true;
    } catch {
      this.client = null;
      this.setStatus('DISCONNECTED');
      return false;
    }
  }

  private initFromStorageOrEnv() {
    try {
      // 1. Try env variables first
      const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

      // 2. Try localStorage settings
      const settingsRaw = localStorage.getItem('farmer_settings_v1');
      const settings = settingsRaw ? JSON.parse(settingsRaw) : {};

      const url = settings.supabase_url || envUrl || '';
      const key = settings.supabase_anon_key || envKey || '';

      if (url && key) {
        this.init(url, key);
      } else {
        this.setStatus('LOCAL_ONLY');
      }
    } catch {
      this.setStatus('LOCAL_ONLY');
    }
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      this.setStatus('LOCAL_ONLY');
      return { success: false, message: 'Supabase credentials not configured. Running offline.' };
    }

    try {
      this.setStatus('CONNECTING');
      // Simple probe query
      const { error } = await this.client.from('daily_sessions').select('id').limit(1);

      if (error) {
        // If table doesn't exist yet, we still know client connected to URL/key
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.code === '42P01') {
          this.setStatus('CONNECTED');
          return {
            success: true,
            message: 'Connected to Supabase! (Database tables need to be created with the provided SQL schema)',
          };
        }
        this.setStatus('DISCONNECTED');
        return { success: false, message: error.message };
      }

      this.setStatus('CONNECTED');
      return { success: true, message: 'Successfully connected to Supabase PostgreSQL database!' };
    } catch (err: any) {
      this.setStatus('DISCONNECTED');
      return { success: false, message: 'Connection failed: ' + (err.message || String(err)) };
    }
  }

  // Sync data between local storage and Supabase
  public async syncData(localData: {
    purchases: Purchase[];
    sales: Sale[];
    customers: Customer[];
    repayments: DebtRepayment[];
    expenses: Expense[];
  }): Promise<{
    success: boolean;
    syncedCount: number;
    error?: string;
  }> {
    if (!this.client || this.status === 'LOCAL_ONLY') {
      return { success: false, syncedCount: 0, error: 'Database not connected' };
    }

    try {
      this.setStatus('SYNCING');
      let count = 0;

      // 1. Sync Customers
      if (localData.customers.length > 0) {
        const payload = localData.customers.map((c) => ({
          id: c.id.startsWith('c') || c.id.includes('_') ? undefined : c.id,
          name: c.name,
          phone: c.phone || null,
          village: c.village || null,
          notes: c.notes || null,
          created_at: c.created_at,
        })).filter(Boolean);

        const { error } = await this.client.from('customers').upsert(payload, { onConflict: 'id' });
        if (!error) count += payload.length;
      }

      // 2. Sync Purchases
      if (localData.purchases.length > 0) {
        const payload = localData.purchases.map((p) => ({
          purchase_date: p.date,
          grass_type: p.grass_type,
          quantity: p.quantity,
          unit: p.unit,
          cost_per_unit: p.cost_per_unit,
          total_cost: p.total_cost,
          transport_cost: p.transport_cost,
          supplier_name: p.supplier_name,
          supplier_phone: p.supplier_phone || null,
          notes: p.notes || null,
          created_at: p.created_at,
        }));
        const { error } = await this.client.from('purchases').upsert(payload);
        if (!error) count += payload.length;
      }

      // 3. Sync Sales
      if (localData.sales.length > 0) {
        const payload = localData.sales.map((s) => ({
          sale_date: s.date,
          grass_type: s.grass_type,
          quantity: s.quantity,
          unit: s.unit,
          price_per_unit: s.price_per_unit,
          total_amount: s.total_amount,
          amount_paid: s.amount_paid,
          remaining_debt: s.remaining_debt,
          customer_name: s.customer_name,
          customer_phone: s.customer_phone || null,
          transport_cost: s.transport_cost,
          cost_of_goods_sold: s.cost_of_goods_sold,
          notes: s.notes || null,
          created_at: s.created_at,
        }));
        const { error } = await this.client.from('sales').upsert(payload);
        if (!error) count += payload.length;
      }

      // 4. Sync Expenses
      if (localData.expenses.length > 0) {
        const payload = localData.expenses.map((e) => ({
          expense_date: e.date,
          category: e.category,
          amount: e.amount,
          description: e.description || null,
          created_at: e.created_at,
        }));
        const { error } = await this.client.from('expenses').upsert(payload);
        if (!error) count += payload.length;
      }

      this.setStatus('CONNECTED');
      return { success: true, syncedCount: count };
    } catch (err: any) {
      this.setStatus('CONNECTED');
      return { success: false, syncedCount: 0, error: err.message || String(err) };
    }
  }
}

export const supabaseService = new SupabaseService();
