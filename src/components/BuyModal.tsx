import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Package,
  Layers,
  Truck,
  User,
  Phone,
  FileText,
  CheckCircle,
  Volume2,
  Users
} from 'lucide-react';
import { GrassType, AreaUnit, Purchase } from '../types';
import { translations, Language } from '../i18n/translations';
import { formatRupees } from '../services/financialCalculations';
import { voice } from '../services/voice';
import { storage } from '../services/storage';
import { VoiceInput } from './VoiceInput';

interface BuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (purchase: Purchase) => void;
  currentDate: string;
  lang: Language;
}

export const BuyModal: React.FC<BuyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentDate,
  lang,
}) => {
  const t = translations[lang];

  // Selected Grass Type: Rolls vs Raw Grass
  const [grassType, setGrassType] = useState<GrassType>('ROLLS');

  // Rolls State (Starts completely empty with zero pre-filled numbers)
  const [rollsCount, setRollsCount] = useState<number | ''>('');
  const [costPerRoll, setCostPerRoll] = useState<number | ''>('');

  // Raw Grass State (Starts completely empty)
  const [area, setArea] = useState<number | ''>('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('ACRES');
  const [rawTotalCost, setRawTotalCost] = useState<number | ''>('');

  // Common Fields
  const [transportCost, setTransportCost] = useState<number | ''>('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Get real suppliers from past purchases (if any)
  const pastSuppliers = useMemo(() => {
    const list = storage.getPurchases();
    const unique = new Map<string, { name: string; phone?: string }>();
    for (const p of list) {
      if (p.supplier_name && p.supplier_name.trim() && !unique.has(p.supplier_name.trim())) {
        unique.set(p.supplier_name.trim(), { name: p.supplier_name.trim(), phone: p.supplier_phone });
      }
    }
    return Array.from(unique.values()).slice(0, 5);
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setRollsCount('');
      setCostPerRoll('');
      setArea('');
      setRawTotalCost('');
      setTransportCost('');
      setSupplierName('');
      setSupplierPhone('');
      setNotes('');
      voice.speak(t.chooseGrassTypeToBuy, lang);
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

  // Rolls Total Cost Calculation: Count * Cost per roll
  const calculatedRollsTotal = (Number(rollsCount) || 0) * (Number(costPerRoll) || 0);

  // Raw Grass Cost per Unit Calculation: Total Cost / Area
  const calculatedRawPricePerUnit =
    Number(area) > 0 ? (Number(rawTotalCost) || 0) / Number(area) : 0;

  const totalCost = grassType === 'ROLLS' ? calculatedRollsTotal : Number(rawTotalCost) || 0;

  const handleQuickSupplier = (name: string, phone?: string) => {
    voice.playTone('tap');
    setSupplierName(name);
    if (phone) setSupplierPhone(phone);
    const msg = lang === 'te' ? `రైతు ${name} ఎంచుకున్నారు` : `Selected farmer ${name}`;
    voice.speak(msg, lang);
  };

  const handleSave = () => {
    if (grassType === 'ROLLS' && (Number(rollsCount) <= 0 || Number(costPerRoll) <= 0)) {
      voice.playTone('alert');
      alert(lang === 'te' ? 'దయచేసి చుట్టల సంఖ్య మరియు ధర నమోదు చేయండి' : 'Please enter valid rolls and cost');
      return;
    }

    if (grassType === 'RAW_GRASS' && (Number(area) <= 0 || Number(rawTotalCost) <= 0)) {
      voice.playTone('alert');
      alert(lang === 'te' ? 'దయచేసి పొలం విస్తీర్ణం మరియు మొత్తం ఖరీదు నమోదు చేయండి' : 'Please enter area and total cost');
      return;
    }

    const sName = supplierName.trim() || (lang === 'te' ? 'స్థానిక రైతు' : 'Local Farmer');

    const newPurchase: Purchase = {
      id: 'p_' + Date.now(),
      date: currentDate,
      grass_type: grassType,
      quantity: grassType === 'ROLLS' ? Number(rollsCount) : Number(area),
      unit: grassType === 'ROLLS' ? 'ROLLS' : areaUnit,
      cost_per_unit:
        grassType === 'ROLLS' ? Number(costPerRoll) : Math.round(calculatedRawPricePerUnit),
      total_cost: totalCost,
      transport_cost: Number(transportCost) || 0,
      supplier_name: sName,
      supplier_phone: supplierPhone.trim(),
      notes: notes.trim(),
      created_at: new Date().toISOString(),
    };

    voice.playTone('cash');
    voice.speak(
      lang === 'te'
        ? `కొనుగోలు రికార్డు సేవ్ అయ్యింది. రైతు పేరు: ${sName}`
        : `Purchase saved. Farmer name: ${sName}`,
      lang
    );
    onSave(newPurchase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fadeIn">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🛒</span>
            <div>
              <h2 className="text-lg font-black">{t.buyTitle}</h2>
              <span className="text-xs text-blue-200">{currentDate}</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/20 active:scale-95 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* STEP 1: Two Large Selectable Options (ROLLS vs RAW GRASS) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase text-gray-500">
                1. {lang === 'te' ? 'గడ్డి రకం ఎంచుకోండి' : 'Select Grass Type'}
              </label>
              <button
                onClick={() => voice.speak(t.chooseGrassTypeToBuy, lang)}
                className="text-blue-600 text-xs flex items-center space-x-1"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{lang === 'te' ? 'వినండి' : 'Listen'}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: Rolls */}
              <button
                type="button"
                onClick={() => {
                  voice.playTone('tap');
                  setGrassType('ROLLS');
                }}
                className={`p-4 rounded-2xl border-3 flex flex-col items-center justify-center text-center transition-all ${
                  grassType === 'ROLLS'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md ring-2 ring-blue-500'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-1.5 ${
                    grassType === 'ROLLS' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <Package className="w-6 h-6" />
                </div>
                <span className="font-black text-base">{t.rolls}</span>
                <span className="text-xs text-gray-500">{lang === 'te' ? 'బేళ్లు / కట్టలు' : 'Bales'}</span>
              </button>

              {/* Option 2: Raw Grass */}
              <button
                type="button"
                onClick={() => {
                  voice.playTone('tap');
                  setGrassType('RAW_GRASS');
                }}
                className={`p-4 rounded-2xl border-3 flex flex-col items-center justify-center text-center transition-all ${
                  grassType === 'RAW_GRASS'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-md ring-2 ring-blue-500'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-1.5 ${
                    grassType === 'RAW_GRASS' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <Layers className="w-6 h-6" />
                </div>
                <span className="font-black text-base">{t.rawGrass}</span>
                <span className="text-xs text-gray-500">{lang === 'te' ? 'పొలంలో ఉన్నది' : 'Field Standing'}</span>
              </button>
            </div>
          </div>

          {/* STEP 2: Large Inputs based on Selection */}
          {grassType === 'ROLLS' ? (
            /* ROLLS SECTION */
            <div className="space-y-3 bg-blue-50/50 p-3.5 rounded-2xl border border-blue-200">
              {/* Rolls Count */}
              <div>
                <label className="block text-xs font-black uppercase text-blue-900 mb-1">
                  {t.rollsCountPurchased}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={rollsCount}
                    onChange={(e) => setRollsCount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-2xl font-black text-gray-900 bg-white border-2 border-blue-400 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="0"
                  />
                  <span className="absolute right-4 top-3.5 text-sm font-bold text-gray-400">
                    {t.rollsUnit}
                  </span>
                </div>
                {/* Stepper shortcuts for mobile convenience */}
                <div className="flex space-x-2 mt-2">
                  {[10, 25, 50, 100].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => {
                        voice.playTone('tap');
                        setRollsCount((prev) => (Number(prev) || 0) + inc);
                      }}
                      className="flex-1 py-1 bg-white border border-blue-300 rounded-lg text-xs font-bold text-blue-800 hover:bg-blue-100 active:scale-95 shadow-sm"
                    >
                      +{inc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Purchase Cost Per Roll */}
              <div>
                <label className="block text-xs font-black uppercase text-blue-900 mb-1">
                  {t.costPerRoll}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-xl font-bold text-gray-500">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={costPerRoll}
                    onChange={(e) => setCostPerRoll(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-2xl font-black text-gray-900 bg-white border-2 border-blue-400 rounded-xl pl-9 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* AUTOMATIC TOTAL DISPLAY (Prominent Before Saving) */}
              <div className="bg-blue-600 text-white p-4 rounded-xl shadow-md text-center">
                <span className="text-xs uppercase font-bold text-blue-200 block">
                  {t.totalPurchaseAmount}
                </span>
                <div className="text-3xl font-black tracking-tight mt-0.5">
                  {formatRupees(calculatedRollsTotal)}
                </div>
                <div className="text-xs text-blue-100 mt-1">
                  {rollsCount || 0} {t.rollsUnit} × ₹{costPerRoll || 0} = {formatRupees(calculatedRollsTotal)}
                </div>
              </div>
            </div>
          ) : (
            /* RAW GRASS SECTION */
            <div className="space-y-3 bg-blue-50/50 p-3.5 rounded-2xl border border-blue-200">
              {/* Field Area & Unit */}
              <div>
                <label className="block text-xs font-black uppercase text-blue-900 mb-1">
                  {t.fieldArea}
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0.1"
                    value={area}
                    onChange={(e) => setArea(e.target.value === '' ? '' : Number(e.target.value))}
                    className="flex-1 text-2xl font-black text-gray-900 bg-white border-2 border-blue-400 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="0"
                  />
                  {/* Unit Selector */}
                  <div className="flex rounded-xl overflow-hidden border-2 border-blue-400 bg-white">
                    {(['ACRES', 'GUNTAS', 'CENTS'] as AreaUnit[]).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          voice.playTone('tap');
                          setAreaUnit(u);
                        }}
                        className={`px-2.5 py-2 text-xs font-black transition-all ${
                          areaUnit === u
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {u === 'ACRES' ? t.acres : u === 'GUNTAS' ? t.guntas : t.cents}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total Purchase Cost */}
              <div>
                <label className="block text-xs font-black uppercase text-blue-900 mb-1">
                  {t.fieldTotalCost}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-xl font-bold text-gray-500">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={rawTotalCost}
                    onChange={(e) => setRawTotalCost(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-2xl font-black text-gray-900 bg-white border-2 border-blue-400 rounded-xl pl-9 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Calculated Cost Per Unit */}
              <div className="bg-blue-600 text-white p-4 rounded-xl shadow-md text-center">
                <span className="text-xs uppercase font-bold text-blue-200 block">
                  {t.totalPurchaseAmount}
                </span>
                <div className="text-3xl font-black tracking-tight mt-0.5">
                  {formatRupees(Number(rawTotalCost) || 0)}
                </div>
                {Number(area) > 0 && (
                  <div className="text-xs text-blue-100 mt-1">
                    {lang === 'te'
                      ? `ఒక్క ${areaUnit === 'ACRES' ? t.acres : areaUnit === 'GUNTAS' ? t.guntas : t.cents} ధర: ₹${Math.round(calculatedRawPricePerUnit)}`
                      : `Cost per ${areaUnit.toLowerCase()}: ₹${Math.round(calculatedRawPricePerUnit)}`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transportation Cost */}
          <div>
            <label className="block text-xs font-black uppercase text-gray-700 mb-1 flex items-center space-x-1">
              <Truck className="w-4 h-4 text-indigo-600" />
              <span>{t.transportCost}</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-lg font-bold text-gray-500">₹</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-lg font-bold text-gray-900 bg-white border border-gray-300 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-indigo-600"
                placeholder="0"
              />
            </div>
          </div>

          {/* SUPPLIER DETAILS WITH VOICE INPUT */}
          <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-3">
            {/* Quick Supplier Badges (Only shown if past records exist) */}
            {pastSuppliers.length > 0 && (
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 mb-1.5 flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {lang === 'te'
                      ? 'ఎవరి వద్ద కొన్నారు? (రైతును ఎంచుకోండి):'
                      : 'Select Supplier / Farmer:'}
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {pastSuppliers.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickSupplier(s.name, s.phone)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1 active:scale-95 ${
                        supplierName === s.name
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <span>🚜</span>
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Voice-Enabled Supplier Name Input */}
            <VoiceInput
              label={t.supplierName}
              value={supplierName}
              onChange={setSupplierName}
              lang={lang}
              placeholder={lang === 'te' ? 'రైతు పేరు మాట్లాడండి...' : 'Speak farmer / supplier name...'}
              promptText={lang === 'te' ? 'రైతు లేదా యజమాని పేరు చెప్పండి' : 'Please speak the supplier name'}
            />

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center space-x-1">
                <Phone className="w-3.5 h-3.5 text-gray-500" />
                <span>{t.supplierPhone}</span>
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-xl px-3 py-2 outline-none"
                placeholder="9440112233"
              />
            </div>
          </div>
        </div>

        {/* Footer: HUGE SAVE BUTTON */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] text-white font-black text-xl rounded-2xl shadow-xl flex items-center justify-center space-x-2 transition-all border-2 border-blue-500"
          >
            <CheckCircle className="w-6 h-6" />
            <span>{t.save}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
