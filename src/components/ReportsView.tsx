import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Printer,
  Calendar,
  Package,
  Layers,
  Users,
  TrendingUp,
  DollarSign,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown
} from 'lucide-react';
import {
  DailySummary,
  InventoryStatus,
  CustomerDebtSummary,
  Purchase,
  Sale,
  DebtRepayment,
  Expense,
  OverallBusinessMetrics
} from '../types';
import { translations, Language } from '../i18n/translations';
import {
  formatRupees,
  formatArea,
  calculateDailySummary,
  calculateOverallMetrics
} from '../services/financialCalculations';
import { voice } from '../services/voice';

interface ReportsViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: string;
  purchases: Purchase[];
  sales: Sale[];
  repayments: DebtRepayment[];
  expenses: Expense[];
  inventory: InventoryStatus;
  customerDebts: CustomerDebtSummary[];
  totalOutstandingDebt: number;
  lang: Language;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  isOpen,
  onClose,
  currentDate,
  purchases,
  sales,
  repayments,
  expenses,
  inventory,
  customerDebts,
  totalOutstandingDebt,
  lang,
}) => {
  const t = translations[lang];

  type PeriodMode = 'TODAY' | 'WEEK' | 'MONTH' | 'ALL_TIME';
  const [period, setPeriod] = useState<PeriodMode>('TODAY');

  React.useEffect(() => {
    if (isOpen) {
      const speech =
        lang === 'te'
          ? 'వ్యాపార నివేదికలు మరియు లాభనష్టాల లెక్కలు'
          : 'Business reports and financial summary';
      voice.speak(speech, lang);
    } else {
      voice.stop();
    }
    return () => {
      voice.stop();
    };
  }, [isOpen, lang]);

  const handleClose = () => {
    voice.playTone('tap');
    voice.stop();
    onClose();
  };

  if (!isOpen) return null;

  // Filter items based on selected period
  const filterByPeriod = <T extends { date: string }>(items: T[]): T[] => {
    if (period === 'ALL_TIME') return items;
    if (period === 'TODAY') return items.filter((i) => i.date === currentDate);

    const targetDateObj = new Date(currentDate);
    if (period === 'WEEK') {
      const weekAgo = new Date(targetDateObj);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekStr = weekAgo.toISOString().split('T')[0];
      return items.filter((i) => i.date >= weekStr && i.date <= currentDate);
    }
    if (period === 'MONTH') {
      const currentMonthPrefix = currentDate.substring(0, 7); // YYYY-MM
      return items.filter((i) => i.date.startsWith(currentMonthPrefix));
    }
    return items;
  };

  const periodPurchases = filterByPeriod(purchases);
  const periodSales = filterByPeriod(sales);
  const periodRepayments = filterByPeriod(repayments);
  const periodExpenses = filterByPeriod(expenses);

  // Compute period metrics
  const totalSales = periodSales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
  const immediatePaid = periodSales.reduce((acc, s) => acc + (s.amount_paid || 0), 0);
  const debtRepayments = periodRepayments.reduce((acc, r) => acc + (r.amount || 0), 0);
  const cashReceived = immediatePaid + debtRepayments;
  const newDebtCreated = periodSales.reduce((acc, s) => acc + (s.remaining_debt || 0), 0);

  const purchaseSpend = periodPurchases.reduce((acc, p) => acc + (p.total_cost || 0), 0);
  const purchaseTransport = periodPurchases.reduce((acc, p) => acc + (p.transport_cost || 0), 0);
  const salesTransport = periodSales.reduce((acc, s) => acc + (s.transport_cost || 0), 0);
  const explicitTransport = periodExpenses
    .filter((e) => e.category === 'BUYING_TRANSPORT' || e.category === 'SELLING_TRANSPORT')
    .reduce((acc, e) => acc + (e.amount || 0), 0);
  const totalTransport = purchaseTransport + salesTransport + explicitTransport;

  const otherExpenses = periodExpenses
    .filter((e) => e.category !== 'BUYING_TRANSPORT' && e.category !== 'SELLING_TRANSPORT')
    .reduce((acc, e) => acc + (e.amount || 0), 0);

  const totalOperatingCosts = totalTransport + otherExpenses;

  // COGS for items sold in this period
  const totalCOGS = periodSales.reduce((acc, s) => {
    return acc + (s.cost_of_goods_sold || 0);
  }, 0);

  // Business Net Profit: Sales - COGS - Transport - Other Operating Expenses
  const netProfit = totalSales - totalCOGS - totalOperatingCosts;

  // Net Cash Flow: Cash actually received - (Cash paid out for purchases + transport + operating)
  const cashPaidOut = purchaseSpend + totalOperatingCosts;
  const netCashFlow = cashReceived - cashPaidOut;

  // Export to CSV / Excel
  const handleExportCSV = () => {
    voice.playTone('tap');
    const rows = [
      ['FARMER DRY GRASS BUSINESS REPORT', `Date Generated: ${new Date().toLocaleDateString()}`],
      ['Period Mode', period],
      [''],
      ['FINANCIAL SUMMARY', 'AMOUNT (INR)'],
      ['Total Sales Revenue', totalSales],
      ['Cost of Goods Sold (COGS)', totalCOGS],
      ['Total Transport Expenses', totalTransport],
      ['Other Operating Expenses', totalExpensesStr(otherExpenses)],
      ['NET BUSINESS PROFIT', netProfit],
      ['Total Cash Actually Received', cashReceived],
      ['Total Cash Paid Out', cashPaidOut],
      ['NET CASH FLOW', netCashFlow],
      ['Total Outstanding Customer Debt', totalOutstandingDebt],
      [''],
      ['CURRENT INVENTORY ASSET', 'QUANTITY', 'UNIT COST (INR)', 'ASSET VALUE (INR)'],
      ['Rolls Available', inventory.rolls.available, Math.round(inventory.rolls.avg_cost_per_roll), Math.round(inventory.rolls.inventory_asset_value)],
      ['Raw Grass Available (Acres)', Number(inventory.raw_grass.available_acres.toFixed(2)), Math.round(inventory.raw_grass.avg_cost_per_acre), Math.round(inventory.raw_grass.inventory_asset_value)],
      [''],
      ['CUSTOMER DEBT LEDGER', 'PHONE', 'TOTAL SALES', 'TOTAL PAID', 'REMAINING DEBT'],
      ...customerDebts.map((c) => [c.customer_name, c.customer_phone || '', c.total_sales_amount, c.total_paid, c.remaining_debt]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((e) => e.map((cell) => `"${cell}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Farmer_Grass_Report_${period}_${currentDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalExpensesStr = (val: number) => val;

  const handlePrint = () => {
    voice.playTone('tap');
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fadeIn">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-4 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📊</span>
            <div>
              <h2 className="text-lg font-black">{t.reportsTitle}</h2>
              <span className="text-xs text-purple-200">{currentDate}</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/20 active:scale-95 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Period Tabs: Today, Week, Month, All Time */}
        <div className="bg-purple-950 px-3 py-2 border-b border-purple-700/50 flex space-x-1.5 no-print">
          {[
            { id: 'TODAY', label: t.dailyReport },
            { id: 'WEEK', label: t.weeklyReport },
            { id: 'MONTH', label: t.monthlyReport },
            { id: 'ALL_TIME', label: lang === 'te' ? 'మొత్తం లెక్క' : 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                voice.playTone('tap');
                setPeriod(tab.id as PeriodMode);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                period === tab.id
                  ? 'bg-amber-400 text-purple-950 shadow-md'
                  : 'bg-purple-900/60 text-purple-200 hover:bg-purple-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Buttons: Export Excel + Print */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between no-print">
          <span className="text-xs font-bold text-gray-500 uppercase">
            {period === 'TODAY'
              ? `${t.dailyReport}: ${currentDate}`
              : period === 'WEEK'
              ? `${t.weeklyReport} (7 Days)`
              : period === 'MONTH'
              ? `${t.monthlyReport} (${currentDate.substring(0, 7)})`
              : 'All-Time Business Summary'}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1 px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t.exportExcel}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>{t.exportPdf}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Report Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Printable Header */}
          <div className="hidden print:block text-center border-b pb-3 mb-3">
            <h1 className="text-xl font-black">{t.appTitle}</h1>
            <p className="text-sm">{t.appSubtitle}</p>
            <p className="text-xs text-gray-600">
              Period: {period} | Date: {currentDate} | Generated: {new Date().toLocaleString()}
            </p>
          </div>

          {/* 1. FINANCIAL PROFIT & CASH FLOW (Section 10 Distinction) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* True Business Profit Card */}
            <div
              className={`p-4 rounded-2xl border-2 shadow-sm ${
                netProfit >= 0
                  ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-500 text-green-950'
                  : 'bg-gradient-to-br from-rose-50 to-red-100 border-red-500 text-red-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-gray-700">
                  {t.netProfitLabel}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/70">
                  {netProfit >= 0 ? (lang === 'te' ? 'లాభం' : 'Profit') : (lang === 'te' ? 'నష్టం' : 'Loss')}
                </span>
              </div>
              <div className="text-3xl font-black mt-2">
                {formatRupees(netProfit)}
              </div>
              <p className="text-[11px] text-gray-600 mt-1">
                {lang === 'te'
                  ? 'అమ్మకాలు - అమ్మిన గడ్డి అసలు ఖరీదు - రవాణా, ఇతర ఖర్చులు'
                  : 'Sales - Cost of Goods Sold - Transport - Expenses'}
              </p>
            </div>

            {/* Cash Flow Card */}
            <div
              className={`p-4 rounded-2xl border-2 shadow-sm ${
                netCashFlow >= 0
                  ? 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-400 text-blue-950'
                  : 'bg-gradient-to-br from-amber-50 to-orange-100 border-amber-400 text-amber-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-gray-700">
                  {t.cashFlowLabel}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/70">
                  {netCashFlow >= 0 ? (lang === 'te' ? 'మిగులు' : 'Positive') : (lang === 'te' ? 'లోటు' : 'Negative')}
                </span>
              </div>
              <div className="text-3xl font-black mt-2">
                {formatRupees(netCashFlow)}
              </div>
              <p className="text-[11px] text-gray-600 mt-1">
                {lang === 'te'
                  ? 'చేతికి వచ్చిన నగదు - నేరుగా చెల్లించిన ఖర్చులు, కొనుగోళ్లు'
                  : 'Cash Received - Cash Actually Paid Out'}
              </p>
            </div>
          </div>

          {/* 2. DETAILED BREAKDOWN TABLE */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-100 px-4 py-2.5 font-black text-xs text-gray-700 uppercase tracking-wider">
              {lang === 'te' ? 'వివరమైన లెక్కల పట్టిక' : 'Detailed Financial Breakdown'}
            </div>
            <div className="divide-y divide-gray-100 text-sm">
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="font-semibold text-gray-700">{lang === 'te' ? 'మొత్తం అమ్మకాల బిల్లు' : 'Total Sales Revenue'}</span>
                <span className="font-black text-green-700">+{formatRupees(totalSales)}</span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="font-semibold text-gray-700">{t.cogsLabel}</span>
                <span className="font-black text-gray-900">-{formatRupees(totalCOGS)}</span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="font-semibold text-gray-700">{t.todayTransport}</span>
                <span className="font-black text-indigo-700">-{formatRupees(totalTransport)}</span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="font-semibold text-gray-700">{lang === 'te' ? 'ఇతర ఖర్చులు (కూలీలు మొదలైనవి)' : 'Labour & Other Operating Expenses'}</span>
                <span className="font-black text-gray-900">-{formatRupees(otherExpenses)}</span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between bg-green-50 font-black">
                <span className="text-green-950">{t.netProfitLabel}</span>
                <span className={`text-base ${netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatRupees(netProfit)}
                </span>
              </div>

              {/* Cash Movement Details */}
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="font-semibold text-gray-700">{t.cashReceivedToday}</span>
                <span className="font-black text-emerald-700">+{formatRupees(cashReceived)}</span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="font-semibold text-gray-700">{t.todayDebtCreated}</span>
                <span className="font-black text-amber-700">+{formatRupees(newDebtCreated)}</span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="font-semibold text-gray-700">{t.todayPurchases}</span>
                <span className="font-black text-amber-900">-{formatRupees(purchaseSpend)}</span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between bg-blue-50 font-black">
                <span className="text-blue-950">{t.cashFlowLabel}</span>
                <span className="text-base text-blue-800">{formatRupees(netCashFlow)}</span>
              </div>
            </div>
          </div>

          {/* 3. INVENTORY STOCK REPORT (Section 9 Requirement) */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-amber-100 px-4 py-2.5 font-black text-xs text-amber-950 uppercase tracking-wider flex items-center justify-between">
              <span>{t.inventoryReport}</span>
              <span className="text-[11px] font-bold text-amber-900">
                {lang === 'te'
                  ? `మొత్తం ఆస్తి విలువ: ${formatRupees(inventory.rolls.inventory_asset_value + inventory.raw_grass.inventory_asset_value)}`
                  : `Asset Value: ${formatRupees(inventory.rolls.inventory_asset_value + inventory.raw_grass.inventory_asset_value)}`}
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Rolls Stock */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                <div className="flex items-center space-x-2 text-amber-950 font-bold text-sm mb-1.5">
                  <Package className="w-4 h-4 text-amber-700" />
                  <span>{t.rolls}</span>
                </div>
                <div className="text-2xl font-black text-amber-900">
                  {inventory.rolls.available}{' '}
                  <span className="text-xs font-semibold">{t.rollsUnit}</span>
                </div>
                <div className="mt-2 text-xs space-y-0.5 text-gray-600">
                  <div>
                    {lang === 'te' ? 'మొత్తం కొన్నవి: ' : 'Purchased: '}
                    <span className="font-bold">{inventory.rolls.total_purchased}</span>
                  </div>
                  <div>
                    {lang === 'te' ? 'మొత్తం అమ్మినవి: ' : 'Sold: '}
                    <span className="font-bold">{inventory.rolls.total_sold}</span>
                  </div>
                  <div>
                    {lang === 'te' ? 'సగటు కొనుగోలు ఖరీదు: ' : 'Avg Cost/Roll: '}
                    <span className="font-bold">₹{Math.round(inventory.rolls.avg_cost_per_roll)}</span>
                  </div>
                </div>
              </div>

              {/* Raw Grass Stock */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <div className="flex items-center space-x-2 text-emerald-950 font-bold text-sm mb-1.5">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  <span>{t.rawGrass}</span>
                </div>
                <div className="text-2xl font-black text-emerald-900">
                  {Number(inventory.raw_grass.available_acres.toFixed(2))}{' '}
                  <span className="text-xs font-semibold">{t.acres}</span>
                </div>
                <div className="mt-2 text-xs space-y-0.5 text-gray-600">
                  <div>
                    {lang === 'te' ? 'మొత్తం కొన్న విస్తీర్ణం: ' : 'Purchased Area: '}
                    <span className="font-bold">
                      {Number(inventory.raw_grass.total_purchased_acres.toFixed(2))} {t.acres}
                    </span>
                  </div>
                  <div>
                    {lang === 'te' ? 'అమ్మిన విస్తీర్ణం: ' : 'Sold Area: '}
                    <span className="font-bold">
                      {Number(inventory.raw_grass.total_sold_acres.toFixed(2))} {t.acres}
                    </span>
                  </div>
                  <div>
                    {lang === 'te' ? 'సగటు ఖరీదు/ఎకరానికి: ' : 'Avg Cost/Acre: '}
                    <span className="font-bold">₹{Math.round(inventory.raw_grass.avg_cost_per_acre)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. CUSTOMER-WISE DEBT REPORT (Section 12 Requirement) */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-red-50 px-4 py-2.5 font-black text-xs text-red-950 uppercase tracking-wider flex items-center justify-between">
              <span>{t.customerDebtReport}</span>
              <span className="text-sm font-black text-red-600">
                {t.totalOutstandingDebt}: {formatRupees(totalOutstandingDebt)}
              </span>
            </div>

            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto text-xs">
              {customerDebts.map((c) => (
                <div key={c.customer_id} className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-900 block text-sm">{c.customer_name}</span>
                    <span className="text-gray-500">
                      {c.customer_phone || (lang === 'te' ? 'ఫోన్ లేదు' : 'No phone')} | {c.sales.length}{' '}
                      {lang === 'te' ? 'లావాదేవీలు' : 'sales'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-base font-black ${
                        c.remaining_debt > 0 ? 'text-red-600' : 'text-green-700'
                      }`}
                    >
                      {formatRupees(c.remaining_debt)}
                    </span>
                    <span className="block text-[11px] text-gray-400">
                      {lang === 'te' ? `జమ: ${formatRupees(c.total_paid)}` : `Paid: ${formatRupees(c.total_paid)}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-center no-print">
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-sm"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
