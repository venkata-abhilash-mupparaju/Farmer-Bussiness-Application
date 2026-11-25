import {
  Purchase,
  Sale,
  DebtRepayment,
  Expense,
  Customer,
  DailySummary,
  CustomerDebtSummary,
  InventoryStatus,
  OverallBusinessMetrics,
  AreaUnit
} from '../types';

// Area conversion utilities (Standardizing everything to Acres for precise accounting)
// 1 Acre = 40 Guntas
// 1 Acre = 100 Cents
export function convertToAcres(quantity: number, unit: 'ROLLS' | AreaUnit): number {
  if (unit === 'ROLLS') return 0;
  switch (unit) {
    case 'ACRES':
      return quantity;
    case 'GUNTAS':
      return quantity / 40;
    case 'CENTS':
      return quantity / 100;
    default:
      return quantity;
  }
}

export function convertFromAcres(acres: number, targetUnit: AreaUnit): number {
  switch (targetUnit) {
    case 'ACRES':
      return acres;
    case 'GUNTAS':
      return acres * 40;
    case 'CENTS':
      return acres * 100;
    default:
      return acres;
  }
}

export function formatRupees(amount: number): string {
  if (isNaN(amount) || amount === undefined || amount === null) return '₹0';
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

export function formatArea(acres: number, preferredUnit: AreaUnit = 'ACRES'): string {
  const converted = convertFromAcres(acres, preferredUnit);
  const formattedNum = Number(converted.toFixed(2));
  return `${formattedNum} ${preferredUnit.toLowerCase()}`;
}

/**
 * Calculates current inventory status, total available rolls, total available raw grass area,
 * and weighted average unit costs for accurate COGS computation.
 */
export function calculateInventoryStatus(
  purchases: Purchase[],
  sales: Sale[]
): InventoryStatus {
  // Rolls
  const rollPurchases = purchases.filter((p) => p.grass_type === 'ROLLS');
  const rollSales = sales.filter((s) => s.grass_type === 'ROLLS');

  const totalPurchasedRolls = rollPurchases.reduce((acc, p) => acc + (p.quantity || 0), 0);
  const totalCostRolls = rollPurchases.reduce((acc, p) => acc + (p.total_cost || 0), 0);
  const totalSoldRolls = rollSales.reduce((acc, s) => acc + (s.quantity || 0), 0);

  const availableRolls = Math.max(0, totalPurchasedRolls - totalSoldRolls);
  const avgCostPerRoll = totalPurchasedRolls > 0 ? totalCostRolls / totalPurchasedRolls : 0;
  const rollsAssetValue = availableRolls * avgCostPerRoll;

  // Raw Grass
  const rawPurchases = purchases.filter((p) => p.grass_type === 'RAW_GRASS');
  const rawSales = sales.filter((s) => s.grass_type === 'RAW_GRASS');

  const totalPurchasedAcres = rawPurchases.reduce(
    (acc, p) => acc + convertToAcres(p.quantity, p.unit),
    0
  );
  const totalCostRaw = rawPurchases.reduce((acc, p) => acc + (p.total_cost || 0), 0);
  const totalSoldAcres = rawSales.reduce(
    (acc, s) => acc + convertToAcres(s.quantity, s.unit),
    0
  );

  const availableAcres = Math.max(0, totalPurchasedAcres - totalSoldAcres);
  const avgCostPerAcre = totalPurchasedAcres > 0 ? totalCostRaw / totalPurchasedAcres : 0;
  const rawAssetValue = availableAcres * avgCostPerAcre;

  return {
    rolls: {
      total_purchased: totalPurchasedRolls,
      total_sold: totalSoldRolls,
      available: availableRolls,
      avg_cost_per_roll: avgCostPerRoll,
      inventory_asset_value: rollsAssetValue,
    },
    raw_grass: {
      total_purchased_acres: totalPurchasedAcres,
      total_sold_acres: totalSoldAcres,
      available_acres: availableAcres,
      avg_cost_per_acre: avgCostPerAcre,
      inventory_asset_value: rawAssetValue,
    },
  };
}

/**
 * Calculates COGS for a specific sale based on weighted average inventory cost.
 */
export function estimateCOGSForSale(
  grassType: 'ROLLS' | 'RAW_GRASS',
  quantity: number,
  unit: 'ROLLS' | AreaUnit,
  inventory: InventoryStatus
): number {
  if (grassType === 'ROLLS') {
    return quantity * inventory.rolls.avg_cost_per_roll;
  } else {
    const acres = convertToAcres(quantity, unit);
    return acres * inventory.raw_grass.avg_cost_per_acre;
  }
}

/**
 * Calculates Customer Debt balances, repayment history, and outstanding totals.
 */
export function calculateCustomerDebts(
  customers: Customer[],
  sales: Sale[],
  repayments: DebtRepayment[]
): {
  customerDebts: CustomerDebtSummary[];
  totalOutstandingDebt: number;
} {
  const map = new Map<string, CustomerDebtSummary>();

  // Ensure all known customers have an entry
  for (const c of customers) {
    map.set(c.id, {
      customer_id: c.id,
      customer_name: c.name,
      customer_phone: c.phone || '',
      total_sales_amount: 0,
      total_immediate_paid: 0,
      total_repayments: 0,
      total_paid: 0,
      remaining_debt: 0,
      first_sale_date: '',
      last_activity_date: c.created_at || '',
      sales: [],
      repayments: [],
    });
  }

  // Aggregate Sales
  for (const s of sales) {
    let entry = map.get(s.customer_id);
    if (!entry) {
      entry = {
        customer_id: s.customer_id,
        customer_name: s.customer_name,
        customer_phone: s.customer_phone || '',
        total_sales_amount: 0,
        total_immediate_paid: 0,
        total_repayments: 0,
        total_paid: 0,
        remaining_debt: 0,
        first_sale_date: s.date,
        last_activity_date: s.date,
        sales: [],
        repayments: [],
      };
      map.set(s.customer_id, entry);
    }

    entry.total_sales_amount += s.total_amount;
    entry.total_immediate_paid += s.amount_paid;
    entry.sales.push(s);

    if (!entry.first_sale_date || s.date < entry.first_sale_date) {
      entry.first_sale_date = s.date;
    }
    if (s.date > entry.last_activity_date) {
      entry.last_activity_date = s.date;
    }
  }

  // Aggregate Repayments
  for (const r of repayments) {
    let entry = map.get(r.customer_id);
    if (entry) {
      entry.total_repayments += r.amount;
      entry.repayments.push(r);
      if (r.date > entry.last_activity_date) {
        entry.last_activity_date = r.date;
      }
    }
  }

  // Compute remaining debt per customer
  const customerDebts: CustomerDebtSummary[] = [];
  let totalOutstandingDebt = 0;

  for (const entry of map.values()) {
    entry.total_paid = entry.total_immediate_paid + entry.total_repayments;
    entry.remaining_debt = Math.max(0, entry.total_sales_amount - entry.total_paid);

    if (entry.total_sales_amount > 0 || entry.total_repayments > 0) {
      customerDebts.push(entry);
      totalOutstandingDebt += entry.remaining_debt;
    }
  }

  // Sort: Customers with largest outstanding debt first
  customerDebts.sort((a, b) => b.remaining_debt - a.remaining_debt);

  return { customerDebts, totalOutstandingDebt };
}

/**
 * Calculates financial metrics for a specific daily session.
 * Correctly distinguishes Revenue, Cash Flow, Unsold Inventory Asset, and True Profit.
 */
export function calculateDailySummary(
  targetDate: string,
  purchases: Purchase[],
  sales: Sale[],
  repayments: DebtRepayment[],
  expenses: Expense[],
  inventory: InventoryStatus
): DailySummary {
  const dayPurchases = purchases.filter((p) => p.date === targetDate);
  const daySales = sales.filter((s) => s.date === targetDate);
  const dayRepayments = repayments.filter((r) => r.date === targetDate);
  const dayExpenses = expenses.filter((e) => e.date === targetDate);

  const total_sales = daySales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
  const immediate_cash_received = daySales.reduce((acc, s) => acc + (s.amount_paid || 0), 0);
  const debt_created_today = daySales.reduce((acc, s) => acc + (s.remaining_debt || 0), 0);
  const debt_repayments_received = dayRepayments.reduce((acc, r) => acc + (r.amount || 0), 0);
  const total_cash_received = immediate_cash_received + debt_repayments_received;

  const total_purchases = dayPurchases.reduce((acc, p) => acc + (p.total_cost || 0), 0);

  // Transportation expenses include:
  // 1. Transport costs embedded in purchases
  // 2. Transport costs embedded in sales
  // 3. Explicit expenses categorized as BUYING_TRANSPORT or SELLING_TRANSPORT
  const purchaseTransport = dayPurchases.reduce((acc, p) => acc + (p.transport_cost || 0), 0);
  const salesTransport = daySales.reduce((acc, s) => acc + (s.transport_cost || 0), 0);
  const explicitTransport = dayExpenses
    .filter((e) => e.category === 'BUYING_TRANSPORT' || e.category === 'SELLING_TRANSPORT')
    .reduce((acc, e) => acc + (e.amount || 0), 0);
  const transport_expenses = purchaseTransport + salesTransport + explicitTransport;

  // Other expenses (loading/unloading, labour, other)
  const other_expenses = dayExpenses
    .filter((e) => e.category !== 'BUYING_TRANSPORT' && e.category !== 'SELLING_TRANSPORT')
    .reduce((acc, e) => acc + (e.amount || 0), 0);

  const total_expenses = transport_expenses + other_expenses;

  // Cost of Goods Sold (COGS) for items sold today
  // If sale has stored cost_of_goods_sold, use it; otherwise compute via weighted avg inventory
  const cogs_today = daySales.reduce((acc, s) => {
    if (s.cost_of_goods_sold && s.cost_of_goods_sold > 0) {
      return acc + s.cost_of_goods_sold;
    }
    return acc + estimateCOGSForSale(s.grass_type, s.quantity, s.unit, inventory);
  }, 0);

  // Net Profit = Sales Revenue - Cost of Goods Sold - Transport - Other Operating Expenses
  // Notice: Unsold purchases are an asset on the balance sheet, not a deduction from today's profit!
  const net_profit = total_sales - cogs_today - transport_expenses - other_expenses;

  // Cash Flow = Cash Actually Received - Cash Actually Paid out today
  const cash_paid_out = total_purchases + total_expenses;
  const cash_flow = total_cash_received - cash_paid_out;

  return {
    date: targetDate,
    total_sales,
    immediate_cash_received,
    debt_repayments_received,
    total_cash_received,
    debt_created_today,
    total_purchases,
    cogs_today,
    transport_expenses,
    other_expenses,
    total_expenses,
    net_profit,
    cash_flow,
    purchases_count: dayPurchases.length,
    sales_count: daySales.length,
  };
}

/**
 * Calculates overall all-time business metrics
 */
export function calculateOverallMetrics(
  purchases: Purchase[],
  sales: Sale[],
  repayments: DebtRepayment[],
  expenses: Expense[],
  inventory: InventoryStatus,
  totalOutstandingDebt: number,
  activeDebtorsCount: number
): OverallBusinessMetrics {
  const total_sales_all_time = sales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
  const immediate_paid = sales.reduce((acc, s) => acc + (s.amount_paid || 0), 0);
  const total_repayments = repayments.reduce((acc, r) => acc + (r.amount || 0), 0);
  const total_cash_received_all_time = immediate_paid + total_repayments;

  const total_purchases_all_time = purchases.reduce((acc, p) => acc + (p.total_cost || 0), 0);

  const purchaseTransport = purchases.reduce((acc, p) => acc + (p.transport_cost || 0), 0);
  const salesTransport = sales.reduce((acc, s) => acc + (s.transport_cost || 0), 0);
  const explicitTransport = expenses
    .filter((e) => e.category === 'BUYING_TRANSPORT' || e.category === 'SELLING_TRANSPORT')
    .reduce((acc, e) => acc + (e.amount || 0), 0);
  const total_transport_expenses = purchaseTransport + salesTransport + explicitTransport;

  const total_other_expenses = expenses
    .filter((e) => e.category !== 'BUYING_TRANSPORT' && e.category !== 'SELLING_TRANSPORT')
    .reduce((acc, e) => acc + (e.amount || 0), 0);

  const total_cogs_all_time = sales.reduce((acc, s) => {
    if (s.cost_of_goods_sold && s.cost_of_goods_sold > 0) {
      return acc + s.cost_of_goods_sold;
    }
    return acc + estimateCOGSForSale(s.grass_type, s.quantity, s.unit, inventory);
  }, 0);

  const total_net_profit_all_time =
    total_sales_all_time - total_cogs_all_time - total_transport_expenses - total_other_expenses;

  const total_cash_flow_all_time =
    total_cash_received_all_time -
    (total_purchases_all_time + total_transport_expenses + total_other_expenses);

  return {
    total_sales_all_time,
    total_cash_received_all_time,
    total_outstanding_debt: totalOutstandingDebt,
    total_purchases_all_time,
    total_cogs_all_time,
    total_transport_expenses,
    total_other_expenses,
    total_net_profit_all_time,
    total_cash_flow_all_time,
    active_debtors_count: activeDebtorsCount,
  };
}
