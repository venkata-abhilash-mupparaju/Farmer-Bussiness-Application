-- ==============================================================================
-- Supabase PostgreSQL Schema for Farmer's Daily Business & Accounts Management
-- ==============================================================================

-- 1. Daily Sessions Table
CREATE TABLE IF NOT EXISTS daily_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date DATE UNIQUE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  village TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Purchases Table (Rolls & Raw Grass)
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

-- 4. Sales Table (Rolls & Raw Grass with Customer Debt Tracking)
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

-- 5. Debt Repayments Table (Subsequent repayments against customer balance)
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

-- 6. Operating Expenses Table
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

-- Fast Indexes
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_debt_customer ON debt_repayments(customer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- Enable Row Level Security (RLS)
ALTER TABLE daily_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Allow Public/Anon access policies for single-tenant farmer app
CREATE POLICY "Allow public anon access to daily_sessions" ON daily_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public anon access to customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public anon access to purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public anon access to sales" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public anon access to debt_repayments" ON debt_repayments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public anon access to expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
