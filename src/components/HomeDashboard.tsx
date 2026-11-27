import React from 'react';
import {
  TrendingUp,
  Wallet,
  Coins,
  ShoppingCart,
  Store,
  Users,
  FileBarChart,
  Truck,
  Volume2,
  Trash2,
  Package,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle
} from 'lucide-react';
import {
  DailySummary,
  InventoryStatus,
  Purchase,
  Sale,
  DebtRepayment,
  Expense
} from '../types';
import { translations, Language } from '../i18n/translations';
import { formatRupees, formatArea } from '../services/financialCalculations';
import { voice } from '../services/voice';

interface HomeDashboardProps {
  currentDate: string;
  summary: DailySummary;
  inventory: InventoryStatus;
  totalOutstandingDebt: number;
  purchasesToday: Purchase[];
  salesToday: Sale[];
  repaymentsToday: DebtRepayment[];
  expensesToday: Expense[];
  lang: Language;
  onOpenBuy: () => void;
  onOpenSell: () => void;
  onOpenDebt: () => void;
  onOpenReports: () => void;
  onOpenExpenses: () => void;
  onDeletePurchase: (id: string) => void;
  onDeleteSale: (id: string) => void;
  onDeleteRepayment: (id: string) => void;
  onDeleteExpense: (id: string) => void;
  isStandalone?: boolean;
  onInstallApp?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  summary,
  inventory,
  totalOutstandingDebt,
  purchasesToday,
  salesToday,
  repaymentsToday,
  expensesToday,
  lang,
  onOpenBuy,
  onOpenSell,
  onOpenDebt,
  onOpenReports,
  onOpenExpenses,
  onDeletePurchase,
  onDeleteSale,
  onDeleteRepayment,
  onDeleteExpense,
  isStandalone,
  onInstallApp,
}) => {
  const t = translations[lang];

  // Voice readout helper
  const speakMetric = (label: string, amountStr: string) => {
    voice.playTone('tap');
    const spoken = lang === 'te'
      ? `${label}: ${amountStr} రూపాయలు`
      : `${label}: ${amountStr} rupees`;
    voice.speak(spoken, lang);
  };

  const isProfitable = summary.net_profit >= 0;

  return (
    <div className="max-w-4xl mx-auto px-3 py-3 space-y-4 pb-24">
      {/* PWA Mobile Install Banner */}
      {!isStandalone && onInstallApp && (
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-3 rounded-2xl shadow-lg border-2 border-amber-300 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">📱</span>
            <div>
              <h4 className="text-xs sm:text-sm font-black leading-tight">
                {lang === 'te' ? 'యాప్‌ను మీ ఫోన్‌లో ఇన్‌స్టాల్ చేసుకోండి' : 'Install App on Your Mobile'}
              </h4>
              <p className="text-[11px] text-emerald-100 font-medium">
                {lang === 'te' ? 'ఇంటర్నెట్ లేకపోయినా 100% ఆఫ్‌లైన్‌లో పనిచేస్తుంది' : 'Works 100% offline in agricultural fields'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onInstallApp}
            className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-green-950 font-black text-xs rounded-xl shadow-md flex items-center space-x-1"
          >
            <span>{lang === 'te' ? 'ఇన్‌స్టాల్' : 'Install'}</span>
          </button>
        </div>
      )}

      {/* 1. PRIMARY METRICS - Very Large High-Contrast Displays */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Net Profit Card */}
        <div
          onClick={() => speakMetric(t.todayNetProfit, String(Math.round(summary.net_profit)))}
          className={`col-span-2 p-4 rounded-2xl border-2 shadow-sm relative overflow-hidden transition-all active:scale-[0.99] cursor-pointer ${
            isProfitable
              ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-500 text-green-950'
              : 'bg-gradient-to-br from-rose-50 to-red-100 border-red-500 text-red-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`p-2 rounded-xl ${isProfitable ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                  {t.todayNetProfit}
                </span>
                <span className="text-xs text-gray-500">
                  {lang === 'te' ? '(అమ్మకాలు - ఖర్చులు)' : '(Sales - COGS & Expenses)'}
                </span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                speakMetric(t.todayNetProfit, String(Math.round(summary.net_profit)));
              }}
              className="p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-700 shadow-sm"
              title="Voice Readout"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black tracking-tight">
              {formatRupees(summary.net_profit)}
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                isProfitable ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'
              }`}
            >
              {isProfitable ? (lang === 'te' ? 'లాభం' : 'Profit') : (lang === 'te' ? 'నష్టం' : 'Loss')}
            </span>
          </div>
        </div>

        {/* Today's Sales */}
        <div
          onClick={() => speakMetric(t.totalSalesToday, String(Math.round(summary.total_sales)))}
          className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm active:scale-[0.99] cursor-pointer hover:border-green-300"
        >
          <div className="flex items-center justify-between text-gray-600">
            <div className="flex items-center space-x-1.5">
              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <Store className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">{t.totalSalesToday}</span>
            </div>
            <Volume2 className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-gray-900">
            {formatRupees(summary.total_sales)}
          </div>
        </div>

        {/* Cash Received Today */}
        <div
          onClick={() => speakMetric(t.cashReceivedToday, String(Math.round(summary.total_cash_received)))}
          className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm active:scale-[0.99] cursor-pointer hover:border-emerald-300"
        >
          <div className="flex items-center justify-between text-gray-600">
            <div className="flex items-center space-x-1.5">
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <Coins className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">{t.cashReceivedToday}</span>
            </div>
            <Volume2 className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-700">
            {formatRupees(summary.total_cash_received)}
          </div>
        </div>

        {/* Today's Purchase Cost */}
        <div
          onClick={() => speakMetric(t.todayPurchases, String(Math.round(summary.total_purchases)))}
          className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm active:scale-[0.99] cursor-pointer hover:border-amber-300"
        >
          <div className="flex items-center justify-between text-gray-600">
            <div className="flex items-center space-x-1.5">
              <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">{t.todayPurchases}</span>
            </div>
            <Volume2 className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-gray-800">
            {formatRupees(summary.total_purchases)}
          </div>
        </div>

        {/* Transportation Expenses */}
        <div
          onClick={() => speakMetric(t.todayTransport, String(Math.round(summary.transport_expenses)))}
          className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm active:scale-[0.99] cursor-pointer hover:border-indigo-300"
        >
          <div className="flex items-center justify-between text-gray-600">
            <div className="flex items-center space-x-1.5">
              <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <Truck className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">{t.todayTransport}</span>
            </div>
            <Volume2 className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-indigo-900">
            {formatRupees(summary.transport_expenses)}
          </div>
        </div>
      </div>

      {/* 2. INVENTORY STOCK STATUS (Large Visual Badges) */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-3 rounded-2xl border border-amber-300 shadow-sm flex items-center justify-around text-center">
        {/* Rolls Available */}
        <div className="flex-1 border-r border-amber-200 pr-2">
          <div className="flex items-center justify-center space-x-1 text-amber-900 text-xs font-bold">
            <Package className="w-3.5 h-3.5 text-amber-700" />
            <span>{t.availableRolls}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-950 mt-1">
            {inventory.rolls.available}{' '}
            <span className="text-xs font-bold text-amber-800">{t.rollsUnit}</span>
          </div>
        </div>

        {/* Raw Grass Available */}
        <div className="flex-1 pl-2">
          <div className="flex items-center justify-center space-x-1 text-emerald-900 text-xs font-bold">
            <Layers className="w-3.5 h-3.5 text-emerald-700" />
            <span>{t.availableRawGrass}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">
            {Number(inventory.raw_grass.available_acres.toFixed(2))}{' '}
            <span className="text-xs font-bold text-emerald-800">{t.acres}</span>
          </div>
        </div>
      </div>

      {/* 3. FOUR PROMINENT BIG BUTTONS (Core User Requirement) */}
      <div className="pt-1">
        <h2 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-2">
          {lang === 'te' ? 'ముఖ్యమైన పనులు' : 'Quick Actions'}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {/* BUY BUTTON */}
          <button
            onClick={() => {
              voice.playTone('tap');
              onOpenBuy();
            }}
            className="group p-5 bg-gradient-to-b from-blue-600 to-blue-700 active:from-blue-700 active:to-blue-800 text-white rounded-3xl shadow-lg border-2 border-blue-400 flex flex-col items-center justify-center text-center transition-all transform active:scale-95"
          >
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tight">{t.buyBtn}</span>
            <span className="text-xs text-blue-100 font-semibold mt-0.5">{t.buySubtitle}</span>
          </button>

          {/* SELL BUTTON */}
          <button
            onClick={() => {
              voice.playTone('tap');
              onOpenSell();
            }}
            className="group p-5 bg-gradient-to-b from-green-600 to-green-700 active:from-green-700 active:to-green-800 text-white rounded-3xl shadow-lg border-2 border-green-400 flex flex-col items-center justify-center text-center transition-all transform active:scale-95"
          >
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition-transform">
              <Store className="w-8 h-8 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tight">{t.sellBtn}</span>
            <span className="text-xs text-green-100 font-semibold mt-0.5">{t.sellSubtitle}</span>
          </button>

          {/* DEBT BUTTON */}
          <button
            onClick={() => {
              voice.playTone('tap');
              onOpenDebt();
            }}
            className="group p-5 bg-gradient-to-b from-amber-600 to-amber-700 active:from-amber-700 active:to-amber-800 text-white rounded-3xl shadow-lg border-2 border-amber-400 flex flex-col items-center justify-center text-center transition-all transform active:scale-95 relative"
          >
            {totalOutstandingDebt > 0 && (
              <span className="absolute top-2 right-2 bg-red-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full border border-white shadow-sm">
                {formatRupees(totalOutstandingDebt)}
              </span>
            )}
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition-transform">
              <Users className="w-8 h-8 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tight">{t.debtBtn}</span>
            <span className="text-xs text-amber-100 font-semibold mt-0.5">{t.debtSubtitle}</span>
          </button>

          {/* REPORTS BUTTON */}
          <button
            onClick={() => {
              voice.playTone('tap');
              onOpenReports();
            }}
            className="group p-5 bg-gradient-to-b from-purple-700 to-purple-800 active:from-purple-800 active:to-purple-900 text-white rounded-3xl shadow-lg border-2 border-purple-500 flex flex-col items-center justify-center text-center transition-all transform active:scale-95"
          >
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition-transform">
              <FileBarChart className="w-8 h-8 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tight">{t.reportsBtn}</span>
            <span className="text-xs text-purple-200 font-semibold mt-0.5">{t.reportsSubtitle}</span>
          </button>
        </div>

        {/* Extra Quick Expenses Action */}
        <div className="mt-3">
          <button
            onClick={() => {
              voice.playTone('tap');
              onOpenExpenses();
            }}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 font-bold rounded-2xl border border-gray-300 flex items-center justify-center space-x-2 transition-all shadow-sm"
          >
            <Truck className="w-5 h-5 text-gray-700" />
            <span className="text-sm">
              {lang === 'te' ? '+ రవాణా & ఇతర ఖర్చులు నమోదు చేయండి' : '+ Record Transport & Other Expenses'}
            </span>
          </button>
        </div>
      </div>

      {/* 4. TODAY'S TRANSACTIONS STREAM */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-black uppercase text-gray-500 tracking-wider">
            {lang === 'te' ? 'ఈ రోజు లావాదేవీలు' : "Today's Activity"}
          </h2>
          <span className="text-xs text-gray-500 font-medium">
            {purchasesToday.length + salesToday.length + repaymentsToday.length + expensesToday.length}{' '}
            {lang === 'te' ? 'నమోదులు' : 'records'}
          </span>
        </div>

        {purchasesToday.length === 0 &&
        salesToday.length === 0 &&
        repaymentsToday.length === 0 &&
        expensesToday.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-gray-300 text-gray-500">
            <AlertCircle className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="font-bold text-sm">
              {lang === 'te' ? 'ఈ రోజు ఇంకా ఏ లావాదేవీలు లేవు' : 'No transactions recorded for this date yet'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {lang === 'te' ? 'పైనున్న కొనుగోలు లేదా అమ్మకం బటన్ నొక్కండి' : 'Tap BUY or SELL above to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Sales items */}
            {salesToday.map((s) => (
              <div
                key={s.id}
                className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-bold">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-gray-900">
                      {s.customer_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {s.grass_type === 'ROLLS'
                        ? `${s.quantity} ${t.rollsShort} × ₹${s.price_per_unit}`
                        : `${formatArea(s.quantity, s.unit as any)} @ ₹${s.price_per_unit}`}
                    </div>
                    {s.remaining_debt > 0 && (
                      <span className="inline-block mt-0.5 text-[11px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded">
                        {lang === 'te' ? `బాకీ: ₹${s.remaining_debt}` : `Debt: ₹${s.remaining_debt}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex items-center space-x-2">
                  <div>
                    <div className="text-base font-black text-green-700">
                      +{formatRupees(s.total_amount)}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {lang === 'te' ? `నగదు: ₹${s.amount_paid}` : `Paid: ₹${s.amount_paid}`}
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteSale(s.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                    title={t.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Purchases items */}
            {purchasesToday.map((p) => (
              <div
                key={p.id}
                className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-gray-900">
                      {p.supplier_name || (lang === 'te' ? 'గడ్డి కొనుగోలు' : 'Grass Purchase')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {p.grass_type === 'ROLLS'
                        ? `${p.quantity} ${t.rollsShort} @ ₹${p.cost_per_unit}`
                        : `${p.quantity} ${t.acres} (${t.rawGrassShort})`}
                    </div>
                    {p.transport_cost > 0 && (
                      <div className="text-[11px] text-indigo-700">
                        {lang === 'te' ? `రవాణా: ₹${p.transport_cost}` : `Transport: ₹${p.transport_cost}`}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right flex items-center space-x-2">
                  <div className="text-base font-black text-amber-900">
                    -{formatRupees(p.total_cost)}
                  </div>
                  <button
                    onClick={() => onDeletePurchase(p.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                    title={t.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Repayments items */}
            {repaymentsToday.map((r) => (
              <div
                key={r.id}
                className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-emerald-950">
                      {lang === 'te' ? 'బాకీ వసూలు' : 'Debt Repayment'}
                    </div>
                    <div className="text-xs text-gray-500">{r.notes || r.payment_method}</div>
                  </div>
                </div>

                <div className="text-right flex items-center space-x-2">
                  <div className="text-base font-black text-emerald-700">
                    +{formatRupees(r.amount)}
                  </div>
                  <button
                    onClick={() => onDeleteRepayment(r.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                    title={t.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Expenses items */}
            {expensesToday.map((e) => (
              <div
                key={e.id}
                className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-gray-900">
                      {e.category === 'BUYING_TRANSPORT' || e.category === 'SELLING_TRANSPORT'
                        ? t.transportCost
                        : t.loadingUnloading}
                    </div>
                    <div className="text-xs text-gray-500">{e.description || e.category}</div>
                  </div>
                </div>

                <div className="text-right flex items-center space-x-2">
                  <div className="text-base font-black text-gray-800">
                    -{formatRupees(e.amount)}
                  </div>
                  <button
                    onClick={() => onDeleteExpense(e.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                    title={t.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
