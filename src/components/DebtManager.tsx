import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Phone,
  Calendar,
  CheckCircle2,
  DollarSign,
  History,
  Coins,
  Volume2,
  ArrowRight,
  Sparkles,
  UserCheck,
  Mic,
  MicOff
} from 'lucide-react';
import { CustomerDebtSummary, DebtRepayment, PaymentMethod } from '../types';
import { translations, Language } from '../i18n/translations';
import { formatRupees } from '../services/financialCalculations';
import { voice } from '../services/voice';

interface DebtManagerProps {
  isOpen: boolean;
  onClose: () => void;
  customerDebts: CustomerDebtSummary[];
  totalOutstandingDebt: number;
  onRecordRepayment: (repayment: DebtRepayment) => void;
  currentDate: string;
  lang: Language;
}

export const DebtManager: React.FC<DebtManagerProps> = ({
  isOpen,
  onClose,
  customerDebts,
  totalOutstandingDebt,
  onRecordRepayment,
  currentDate,
  lang,
}) => {
  const t = translations[lang];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDebtSummary | null>(null);
  const [isSearchingVoice, setIsSearchingVoice] = useState(false);

  // Repayment form state
  const [repaymentAmount, setRepaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [repaymentNotes, setRepaymentNotes] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  // Spoken voice guidance on opening
  useEffect(() => {
    if (isOpen) {
      const speech =
        lang === 'te'
          ? `మొత్తం రావలసిన బాకీ రూ. ${Math.round(totalOutstandingDebt)}`
          : `Total outstanding debt is ₹${Math.round(totalOutstandingDebt)}`;
      voice.speak(speech, lang);
    } else {
      voice.stop();
    }
    return () => {
      voice.stop();
    };
  }, [isOpen, lang, totalOutstandingDebt]);

  const handleClose = () => {
    voice.playTone('tap');
    voice.stop();
    onClose();
  };

  if (!isOpen) return null;

  // Filter customers by search
  const filteredCustomers = customerDebts.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.customer_name.toLowerCase().includes(q) ||
      (c.customer_phone && c.customer_phone.includes(q))
    );
  });

  const handleSelectCustomer = (c: CustomerDebtSummary) => {
    voice.playTone('tap');
    setSelectedCustomer(c);
    setRepaymentAmount(c.remaining_debt > 0 ? c.remaining_debt : '');
  };

  const handleClearFullDebt = () => {
    if (!selectedCustomer) return;
    voice.playTone('tap');
    setRepaymentAmount(selectedCustomer.remaining_debt);
  };

  // Voice Search for Customer Name
  const handleVoiceSearch = () => {
    voice.playTone('tap');
    setIsSearchingVoice(true);

    voice.listenSpeech({
      lang,
      promptSpeech: lang === 'te' ? 'కస్టమర్ పేరు చెప్పండి' : 'Speak customer name to search',
      onListeningStart: () => setIsSearchingVoice(true),
      onResult: (transcript) => {
        setIsSearchingVoice(false);
        setSearchQuery(transcript);
        voice.playTone('success');
        const match = customerDebts.find((c) =>
          c.customer_name.toLowerCase().includes(transcript.toLowerCase())
        );
        if (match) {
          const foundMsg =
            lang === 'te'
              ? `${match.customer_name} ఖాతా దొరికింది. బాకీ రూ. ${match.remaining_debt}`
              : `Found ${match.customer_name}. Debt is ₹${match.remaining_debt}`;
          voice.speak(foundMsg, lang);
        } else {
          const notFound =
            lang === 'te'
              ? `${transcript} పేరుతో ఖాతా లేదు`
              : `No record found for ${transcript}`;
          voice.speak(notFound, lang);
        }
      },
      onError: () => {
        setIsSearchingVoice(false);
      },
      onEnd: () => {
        setIsSearchingVoice(false);
      },
    });
  };

  const handleSubmitRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !repaymentAmount || Number(repaymentAmount) <= 0) {
      voice.playTone('alert');
      alert(lang === 'te' ? 'దయచేసి సరైన వసూలు మొత్తం నమోదు చేయండి' : 'Please enter valid repayment amount');
      return;
    }

    const payVal = Number(repaymentAmount);

    const repayment: DebtRepayment = {
      id: 'rep_' + Date.now(),
      date: currentDate,
      customer_id: selectedCustomer.customer_id,
      amount: payVal,
      payment_method: paymentMethod,
      notes: repaymentNotes.trim(),
      created_at: new Date().toISOString(),
    };

    const willBeCleared = payVal >= selectedCustomer.remaining_debt;

    voice.playTone('cash');
    if (willBeCleared) {
      setShowCelebration(true);
      voice.speak(t.speakDebtCleared, lang);
      setTimeout(() => setShowCelebration(false), 3000);
    } else {
      voice.speak(
        lang === 'te'
          ? `రూ. ${payVal} వసూలు నమోదు అయ్యింది`
          : `Repayment of ₹${payVal} recorded`,
        lang
      );
    }

    onRecordRepayment(repayment);

    // Update local state for immediate feedback
    setSelectedCustomer({
      ...selectedCustomer,
      total_repayments: selectedCustomer.total_repayments + payVal,
      total_paid: selectedCustomer.total_paid + payVal,
      remaining_debt: Math.max(0, selectedCustomer.remaining_debt - payVal),
      repayments: [repayment, ...selectedCustomer.repayments],
    });

    setRepaymentAmount('');
    setRepaymentNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fadeIn">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[94vh] flex flex-col overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 to-amber-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📒</span>
            <div>
              <h2 className="text-lg font-black">{t.debtManagementTitle}</h2>
              <span className="text-xs text-amber-200">
                {customerDebts.length} {lang === 'te' ? 'కస్టమర్లు' : 'customers'}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/20 active:scale-95 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP TOTAL OUTSTANDING DEBT BANNER */}
        <div className="bg-amber-900 text-white px-4 py-3 flex items-center justify-between border-b border-amber-600/50">
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-black text-amber-300">
              {t.totalOutstandingDebt}
            </span>
            <button
              onClick={() => {
                voice.playTone('tap');
                voice.speak(
                  lang === 'te'
                    ? `మొత్తం రావలసిన బాకీ రూ. ${Math.round(totalOutstandingDebt)}`
                    : `Total outstanding debt is ₹${Math.round(totalOutstandingDebt)}`,
                  lang
                );
              }}
              className="p-1 rounded bg-amber-800 hover:bg-amber-700 text-amber-200"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-200 tracking-tight">
            {formatRupees(totalOutstandingDebt)}
          </div>
        </div>

        {/* Content Area: List vs Customer Details */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {!selectedCustomer ? (
            /* CUSTOMERS LIST VIEW */
            <div className="space-y-3">
              {/* Search Bar with VOICE SEARCH BUTTON for Illiterate Farmers */}
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isSearchingVoice
                        ? (lang === 'te' ? 'వింటున్నాను... పేరు చెప్పండి' : 'Listening...')
                        : t.searchCustomerPlaceholder
                    }
                    className="w-full pl-11 pr-8 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-amber-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Big Voice Search Button */}
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  className={`px-3.5 py-3 rounded-2xl font-black text-xs flex items-center space-x-1 shadow-md active:scale-95 transition-all ${
                    isSearchingVoice
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-500'
                  }`}
                  title="Speak Customer Name to Search"
                >
                  <Mic className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {lang === 'te' ? 'పేరు చెప్పండి' : 'Speak'}
                  </span>
                </button>
              </div>

              {filteredCustomers.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl text-gray-500">
                  <UserCheck className="w-10 h-10 mx-auto text-green-600 mb-2" />
                  <p className="font-bold text-base">{t.noDebtsFound}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredCustomers.map((c) => {
                    const hasDebt = c.remaining_debt > 0;
                    return (
                      <div
                        key={c.customer_id}
                        onClick={() => handleSelectCustomer(c)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between active:scale-[0.99] shadow-sm ${
                          hasDebt
                            ? 'bg-white border-amber-300 hover:border-amber-500'
                            : 'bg-green-50/50 border-green-200 hover:border-green-400'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-base text-gray-900">
                              {c.customer_name}
                            </span>
                            {!hasDebt && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-green-200 text-green-900 rounded-full">
                                {lang === 'te' ? 'పూర్తయింది' : 'Fully Paid'}
                              </span>
                            )}
                          </div>

                          {c.customer_phone && (
                            <a
                              href={`tel:${c.customer_phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-semibold text-blue-700 flex items-center space-x-1"
                            >
                              <Phone className="w-3.5 h-3.5 text-blue-500" />
                              <span>{c.customer_phone}</span>
                            </a>
                          )}

                          <div className="text-xs text-gray-500">
                            {lang === 'te'
                              ? `మొత్తం అమ్మకం: ${formatRupees(c.total_sales_amount)} | జమ: ${formatRupees(c.total_paid)}`
                              : `Total Sales: ${formatRupees(c.total_sales_amount)} | Paid: ${formatRupees(c.total_paid)}`}
                          </div>
                        </div>

                        <div className="text-right flex items-center space-x-3">
                          <div>
                            <span className="text-xs text-gray-400 font-bold uppercase block">
                              {lang === 'te' ? 'బాకీ' : 'Balance'}
                            </span>
                            <div
                              className={`text-xl sm:text-2xl font-black ${
                                hasDebt ? 'text-red-600' : 'text-green-700'
                              }`}
                            >
                              {formatRupees(c.remaining_debt)}
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* SELECTED CUSTOMER DETAIL & REPAYMENT VIEW */
            <div className="space-y-4">
              {/* Back to list button */}
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-xs font-bold text-amber-800 flex items-center space-x-1 p-1 hover:underline"
              >
                <span>← {lang === 'te' ? 'కస్టమర్ల జాబితాకు వెళ్లండి' : 'Back to Customers List'}</span>
              </button>

              {/* Customer Profile Banner */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-2xl border-2 border-amber-300 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center font-black text-lg">
                      {selectedCustomer.customer_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-gray-900">
                        {selectedCustomer.customer_name}
                      </h3>
                      {selectedCustomer.customer_phone && (
                        <a
                          href={`tel:${selectedCustomer.customer_phone}`}
                          className="text-xs font-bold text-blue-700 flex items-center space-x-1 underline"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{selectedCustomer.customer_phone} (Call)</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-500 uppercase block">
                      {lang === 'te' ? 'మిగిలిన బాకీ' : 'Remaining Debt'}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-red-600">
                      {formatRupees(selectedCustomer.remaining_debt)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-200 text-center text-xs">
                  <div>
                    <span className="text-gray-500 block">{lang === 'te' ? 'మొత్తం అమ్మకం' : 'Total Sales'}</span>
                    <span className="font-bold text-gray-900">{formatRupees(selectedCustomer.total_sales_amount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">{lang === 'te' ? 'చెల్లించినది' : 'Total Paid'}</span>
                    <span className="font-bold text-green-700">{formatRupees(selectedCustomer.total_paid)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">{lang === 'te' ? 'లావాదేవీ తేదీ' : 'First Date'}</span>
                    <span className="font-bold text-gray-900">{selectedCustomer.first_sale_date || '-'}</span>
                  </div>
                </div>
              </div>

              {/* RECORD REPAYMENT FORM */}
              {selectedCustomer.remaining_debt > 0 ? (
                <form
                  onSubmit={handleSubmitRepayment}
                  className="bg-white p-4 rounded-2xl border-2 border-green-500 shadow-md space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm text-green-950 flex items-center space-x-1.5">
                      <Coins className="w-4 h-4 text-green-600" />
                      <span>{t.recordRepayment}</span>
                    </h4>
                    {/* Clear full debt button */}
                    <button
                      type="button"
                      onClick={handleClearFullDebt}
                      className="text-xs font-bold px-2.5 py-1 bg-green-100 text-green-900 rounded-lg hover:bg-green-200 border border-green-300"
                    >
                      {t.clearFullDebtPrompt}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                      {t.repaymentAmount}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-2xl font-black text-green-700">₹</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max={selectedCustomer.remaining_debt}
                        value={repaymentAmount}
                        onChange={(e) =>
                          setRepaymentAmount(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        placeholder={String(selectedCustomer.remaining_debt)}
                        className="w-full text-2xl font-black text-gray-900 bg-green-50/40 border-2 border-green-500 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-green-600"
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="grid grid-cols-3 gap-2">
                    {(['CASH', 'UPI', 'OTHER'] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          voice.playTone('tap');
                          setPaymentMethod(m);
                        }}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          paymentMethod === m
                            ? 'bg-green-700 text-white border-green-700 shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {m === 'CASH' ? t.cash : m === 'UPI' ? t.upi : t.other}
                      </button>
                    ))}
                  </div>

                  {/* Submit Repayment Button */}
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-black text-lg rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{t.recordRepayment}</span>
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-green-100 border border-green-400 rounded-2xl text-center text-green-950 font-bold">
                  🎉 {t.markFullyPaid}
                </div>
              )}

              {/* COMPLETE REPAYMENT & TRANSACTION HISTORY */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider flex items-center space-x-1">
                  <History className="w-3.5 h-3.5" />
                  <span>{t.repaymentHistory}</span>
                </h4>

                {selectedCustomer.repayments.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    {lang === 'te' ? 'ఇంకా ఏ బాకీ వసూళ్లు నమోదు కాలేదు' : 'No repayments recorded yet'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedCustomer.repayments.map((r) => (
                      <div
                        key={r.id}
                        className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <div>
                            <span className="font-bold text-gray-900 block">
                              +{formatRupees(r.amount)} ({r.payment_method})
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {r.notes || (lang === 'te' ? 'బాకీ చెల్లింపు' : 'Debt Repayment')}
                            </span>
                          </div>
                        </div>
                        <span className="font-semibold text-gray-500">{r.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM TOTAL OUTSTANDING DEBT */}
        <div className="p-3 bg-gray-100 border-t border-gray-200 text-center">
          <span className="text-xs font-black text-gray-700 uppercase">
            {t.totalOutstandingDebt}:{' '}
            <span className="text-base font-black text-red-600">
              {formatRupees(totalOutstandingDebt)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
