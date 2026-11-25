export type GrassType = 'ROLLS' | 'RAW_GRASS';
export type AreaUnit = 'ACRES' | 'GUNTAS' | 'CENTS';
export type ExpenseCategory =
  | 'BUYING_TRANSPORT'
  | 'SELLING_TRANSPORT'
  | 'LOADING_UNLOADING'
  | 'LABOUR'
  | 'OTHER';

export type PaymentMethod = 'CASH' | 'UPI' | 'OTHER';

export interface Purchase {
  id: string;
  date: string; // YYYY-MM-DD
  grass_type: GrassType;
  quantity: number; // count of rolls or area value
  unit: 'ROLLS' | AreaUnit;
  cost_per_unit: number;
  total_cost: number;
  transport_cost: number;
  supplier_name: string;
  supplier_phone?: string;
  notes?: string;
  created_at: string;
}

export interface Sale {
  id: string;
  date: string; // YYYY-MM-DD
  grass_type: GrassType;
  quantity: number;
  unit: 'ROLLS' | AreaUnit;
  price_per_unit: number;
  total_amount: number;
  amount_paid: number;
  remaining_debt: number;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  transport_cost: number;
  cost_of_goods_sold: number; // computed from weighted avg inventory cost
  notes?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  village?: string;
  notes?: string;
  created_at: string;
}

export interface DebtRepayment {
  id: string;
  date: string; // YYYY-MM-DD
  customer_id: string;
  sale_id?: string;
  amount: number;
  payment_method: PaymentMethod;
  notes?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  amount: number;
  related_purchase_id?: string;
  related_sale_id?: string;
  description?: string;
  created_at: string;
}

export interface CustomerDebtSummary {
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  total_sales_amount: number;
  total_immediate_paid: number;
  total_repayments: number;
  total_paid: number;
  remaining_debt: number;
  first_sale_date: string;
  last_activity_date: string;
  sales: Sale[];
  repayments: DebtRepayment[];
}

export interface InventoryStatus {
  rolls: {
    total_purchased: number;
    total_sold: number;
    available: number;
    avg_cost_per_roll: number;
    inventory_asset_value: number;
  };
  raw_grass: {
    total_purchased_acres: number;
    total_sold_acres: number;
    available_acres: number;
    avg_cost_per_acre: number;
    inventory_asset_value: number;
  };
}

export interface DailySummary {
  date: string;
  total_sales: number;
  immediate_cash_received: number;
  debt_repayments_received: number;
  total_cash_received: number;
  debt_created_today: number;
  total_purchases: number;
  cogs_today: number;
  transport_expenses: number;
  other_expenses: number;
  total_expenses: number;
  net_profit: number; // total_sales - cogs_today - transport_expenses - other_expenses
  cash_flow: number; // total_cash_received - (total_purchases + total_expenses)
  purchases_count: number;
  sales_count: number;
}

export interface OverallBusinessMetrics {
  total_sales_all_time: number;
  total_cash_received_all_time: number;
  total_outstanding_debt: number;
  total_purchases_all_time: number;
  total_cogs_all_time: number;
  total_transport_expenses: number;
  total_other_expenses: number;
  total_net_profit_all_time: number;
  total_cash_flow_all_time: number;
  active_debtors_count: number;
}

export interface AppSettings {
  pin: string;
  pin_enabled: boolean;
  language: 'te' | 'en';
  voice_enabled: boolean;
  speech_rate: number;
  default_area_unit: AreaUnit;
  supabase_url?: string;
  supabase_anon_key?: string;
}
