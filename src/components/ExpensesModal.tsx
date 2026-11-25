import React, { useState } from 'react';
import { X, Truck, Users, PackageCheck, MoreHorizontal, CheckCircle } from 'lucide-react';
import { ExpenseCategory, Expense } from '../types';
import { translations, Language } from '../i18n/translations';
import { voice } from '../services/voice';

interface ExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  currentDate: string;
  lang: Language;
}

export const ExpensesModal: React.FC<ExpensesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentDate,
  lang,
}) => {
  const t = translations[lang];

  const [category, setCategory] = useState<ExpenseCategory>('BUYING_TRANSPORT');
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setAmount('');
      setDescription('');
      const speech =
        lang === 'te'
          ? 'ఖర్చుల వివరాలు మరియు మొత్తం నమోదు చేయండి'
          : 'Record expense category and amount';
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

  const categories: { key: ExpenseCategory; label: string; icon: React.ReactNode }[] = [
    { key: 'BUYING_TRANSPORT', label: t.buyingTransport, icon: <Truck className="w-5 h-5" /> },
    { key: 'SELLING_TRANSPORT', label: t.sellingTransport, icon: <Truck className="w-5 h-5" /> },
    { key: 'LOADING_UNLOADING', label: t.loadingUnloading, icon: <PackageCheck className="w-5 h-5" /> },
    { key: 'LABOUR', label: t.labour, icon: <Users className="w-5 h-5" /> },
    { key: 'OTHER', label: t.otherExpense, icon: <MoreHorizontal className="w-5 h-5" /> },
  ];

  const handleSave = () => {
    if (!amount || Number(amount) <= 0) {
      voice.playTone('alert');
      alert(lang === 'te' ? 'దయచేసి ఖర్చు మొత్తం నమోదు చేయండి' : 'Please enter valid expense amount');
      return;
    }

    const newExpense: Expense = {
      id: 'exp_' + Date.now(),
      date: currentDate,
      category,
      amount: Number(amount),
      description: description.trim(),
      created_at: new Date().toISOString(),
    };

    voice.playTone('cash');
    voice.speak(
      lang === 'te' ? `ఖర్చు రూ. ${amount} నమోదు అయ్యింది` : `Expense of ₹${amount} saved`,
      lang
    );
    onSave(newExpense);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fadeIn">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">💸</span>
            <div>
              <h2 className="text-lg font-black">{t.expensesTitle}</h2>
              <span className="text-xs text-gray-300">{currentDate}</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/20 active:scale-95 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-black uppercase text-gray-600 mb-2">
              {t.expenseCategory}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {categories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    voice.playTone('tap');
                    setCategory(c.key);
                  }}
                  className={`p-3 rounded-xl border-2 flex items-center space-x-3 text-left transition-all ${
                    category === c.key
                      ? 'border-gray-800 bg-gray-100 font-black text-gray-950 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      category === c.key ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {c.icon}
                  </div>
                  <span className="text-sm">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-black uppercase text-gray-600 mb-1">
              {t.expenseAmount}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-2xl font-black text-gray-500">₹</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-2xl font-black text-gray-900 bg-white border-2 border-gray-400 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-gray-800"
                placeholder="500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black uppercase text-gray-600 mb-1">
              {t.notes}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-gray-800"
              placeholder={lang === 'te' ? 'ఉదా: ట్రాక్టర్ డీజిల్ / ఆటో కిరాయి' : 'e.g. Tractor diesel / Auto fare'}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-black text-lg rounded-2xl shadow-xl flex items-center justify-center space-x-2 active:scale-95 transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>{t.save}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
