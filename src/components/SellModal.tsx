import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Layers,
  Truck,
  User,
  Phone,
  CheckCircle,
  AlertTriangle,
  Volume2,
  DollarSign,
  Mic,
  Users
} from 'lucide-react';
import { GrassType, AreaUnit, Sale, Customer, InventoryStatus } from '../types';
import { translations, Language } from '../i18n/translations';
import {
  formatRupees,
  estimateCOGSForSale,
  convertToAcres
} from '../services/financialCalculations';
import { voice } from '../services/voice';
import { VoiceInput } from './VoiceInput';

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sale: Sale) => void;
  currentDate: string;
  customers: Customer[];
  inventory: InventoryStatus;
  lang: Language;
}

export const SellModal: React.FC<SellModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentDate,
  customers,
  inventory,
  lang,
}) => {
  const t = translations[lang];

  const [grassType, setGrassType] = useState<GrassType>('ROLLS');

  // Rolls State (Starts completely empty)
  const [rollsCount, setRollsCount] = useState<number | ''>('');
  const [pricePerRoll, setPricePerRoll] = useState<number | ''>('');

  // Raw Grass State (Starts completely empty)
  const [area, setArea] = useState<number | ''>('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('ACRES');
  const [pricePerUnit, setPricePerUnit] = useState<number | ''>('');

  // Payment & Debt State (Starts completely empty)
  const [amountPaid, setAmountPaid] = useState<number | ''>('');

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [transportCost, setTransportCost] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Stock Warning State
  const [showStockWarning, setShowStockWarning] = useState(false);

  // Spoken voice guidance on opening & reset fields
  useEffect(() => {
    if (isOpen) {
      setRollsCount('');
      setPricePerRoll('');
      setArea('');
      setPricePerUnit('');
      setAmountPaid('');
      setCustomerName('');
      setCustomerPhone('');
      setTransportCost('');
      setNotes('');
      voice.speak(t.chooseGrassTypeToSell, lang);
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

  // Compute Total Sale Amount
  const totalSaleAmount =
    grassType === 'ROLLS'
      ? (Number(rollsCount) || 0) * (Number(pricePerRoll) || 0)
      : (Number(area) || 0) * (Number(pricePerUnit) || 0);

  // Compute Remaining Debt
  const paidVal = Number(amountPaid) || 0;
  const remainingDebt = Math.max(0, totalSaleAmount - paidVal);

  // Check inventory stock availability
  useEffect(() => {
    if (grassType === 'ROLLS') {
      const needed = Number(rollsCount) || 0;
      setShowStockWarning(needed > 0 && needed > inventory.rolls.available);
    } else {
      const neededAcres = convertToAcres(Number(area) || 0, areaUnit);
      setShowStockWarning(neededAcres > 0 && neededAcres > inventory.raw_grass.available_acres);
    }
  }, [grassType, rollsCount, area, areaUnit, inventory]);

  if (!isOpen) return null;

  // Quick Payment Buttons
  const setFullPaid = () => {
    voice.playTone('tap');
    setAmountPaid(totalSaleAmount);
  };

  const setFullDebt = () => {
    voice.playTone('tap');
    setAmountPaid(0);
  };

  const setHalfPaid = () => {
    voice.playTone('tap');
    setAmountPaid(Math.round(totalSaleAmount / 2));
  };

  // Quick Customer Badge Selection
  const selectQuickCustomer = (c: Customer) => {
    voice.playTone('tap');
    setCustomerName(c.name);
    if (c.phone) setCustomerPhone(c.phone);

    const speech =
      lang === 'te'
        ? `కస్టమర్ ${c.name} ఎంచుకున్నారు`
        : `Selected customer ${c.name}`;
    voice.speak(speech, lang);
  };

  const handleSave = () => {
    if (grassType === 'ROLLS' && (Number(rollsCount) <= 0 || Number(pricePerRoll) <= 0)) {
      voice.playTone('alert');
      alert(lang === 'te' ? 'దయచేసి సరైన చుట్టల సంఖ్య మరియు ధర నమోదు చేయండి' : 'Please enter valid rolls and price');
      return;
    }

    if (grassType === 'RAW_GRASS' && (Number(area) <= 0 || Number(pricePerUnit) <= 0)) {
      voice.playTone('alert');
      alert(lang === 'te' ? 'దయచేసి పొలం విస్తీర్ణం మరియు ధర నమోదు చేయండి' : 'Please enter area and price per unit');
      return;
    }

    const cName = customerName.trim() || (lang === 'te' ? 'కస్టమర్' : 'Customer');

    // Find or create customer id
    const existingCust = customers.find(
      (c) => c.name.toLowerCase() === cName.toLowerCase() || (customerPhone && c.phone === customerPhone)
    );
    const customerId = existingCust ? existingCust.id : 'cust_' + Date.now();

    // Calculate actual COGS using inventory status
    const cogs = estimateCOGSForSale(
      grassType,
      grassType === 'ROLLS' ? Number(rollsCount) : Number(area),
      grassType === 'ROLLS' ? 'ROLLS' : areaUnit,
      inventory
    );

    const newSale: Sale = {
      id: 's_' + Date.now(),
      date: currentDate,
      grass_type: grassType,
      quantity: grassType === 'ROLLS' ? Number(rollsCount) : Number(area),
      unit: grassType === 'ROLLS' ? 'ROLLS' : areaUnit,
      price_per_unit: grassType === 'ROLLS' ? Number(pricePerRoll) : Number(pricePerUnit),
      total_amount: totalSaleAmount,
      amount_paid: paidVal,
      remaining_debt: remainingDebt,
      customer_id: customerId,
      customer_name: cName,
      customer_phone: customerPhone.trim(),
      transport_cost: Number(transportCost) || 0,
      cost_of_goods_sold: cogs,
      notes: notes.trim(),
      created_at: new Date().toISOString(),
    };

    voice.playTone('cash');
    if (remainingDebt > 0) {
      voice.speak(
        lang === 'te'
          ? `అమ్మకం నమోదైంది. కస్టమర్ ${cName} బాకీ రూ. ${remainingDebt} లెక్కలోకి చేర్చబడింది.`
          : `Sale saved. Customer ${cName} debt of ₹${remainingDebt} recorded.`,
        lang
      );
    } else {
      voice.speak(t.speakSaleSaved, lang);
    }

    onSave(newSale);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fadeIn">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[94vh] flex flex-col overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-green-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🌾</span>
            <div>
              <h2 className="text-lg font-black">{t.sellTitle}</h2>
              <span className="text-xs text-green-200">{currentDate}</span>
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
                1. {lang === 'te' ? 'ఏ గడ్డి అమ్ముతున్నారు?' : 'Select Grass Type to Sell'}
              </label>
              <button
                onClick={() => voice.speak(t.chooseGrassTypeToSell, lang)}
                className="text-green-700 text-xs flex items-center space-x-1"
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
                    ? 'border-green-600 bg-green-50 text-green-950 shadow-md ring-2 ring-green-500'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-1.5 ${
                    grassType === 'ROLLS' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <Package className="w-6 h-6" />
                </div>
                <span className="font-black text-base">{t.rolls}</span>
                <span className="text-xs text-gray-500">
                  {lang === 'te' ? `నిల్వ: ${inventory.rolls.available}` : `Stock: ${inventory.rolls.available}`}
                </span>
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
                    ? 'border-green-600 bg-green-50 text-green-950 shadow-md ring-2 ring-green-500'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-1.5 ${
                    grassType === 'RAW_GRASS' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <Layers className="w-6 h-6" />
                </div>
                <span className="font-black text-base">{t.rawGrass}</span>
                <span className="text-xs text-gray-500">
                  {lang === 'te'
                    ? `నిల్వ: ${Number(inventory.raw_grass.available_acres.toFixed(2))} ఎక.`
                    : `Stock: ${Number(inventory.raw_grass.available_acres.toFixed(2))} ac`}
                </span>
              </button>
            </div>
          </div>

          {/* Stock Exceeded Warning */}
          {showStockWarning && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start space-x-2 text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{t.notEnoughStockWarning}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {lang === 'te'
                    ? '(బయట నుంచి నేరుగా కొనుగోలు చేసి సరఫరా చేసినట్లుగా నమోదు చేయబడుతుంది)'
                    : '(Will be tracked as external or direct fulfillment)'}
                </p>
              </div>
            </div>
          )}

          {/* Quantity & Price Inputs */}
          {grassType === 'ROLLS' ? (
            <div className="space-y-3 bg-green-50/50 p-3.5 rounded-2xl border border-green-200">
              {/* Rolls Sold */}
              <div>
                <label className="block text-xs font-black uppercase text-green-950 mb-1">
                  {t.rollsCountSold}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={rollsCount}
                    onChange={(e) => setRollsCount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-2xl font-black text-gray-900 bg-white border-2 border-green-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="0"
                  />
                  <span className="absolute right-4 top-3.5 text-sm font-bold text-gray-400">
                    {t.rollsUnit}
                  </span>
                </div>
                {/* Steppers */}
                <div className="flex space-x-2 mt-2">
                  {[5, 10, 20, 50].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => {
                        voice.playTone('tap');
                        setRollsCount((prev) => (Number(prev) || 0) + inc);
                      }}
                      className="flex-1 py-1 bg-white border border-green-300 rounded-lg text-xs font-bold text-green-900 hover:bg-green-100 active:scale-95 shadow-sm"
                    >
                      +{inc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selling Price Per Roll */}
              <div>
                <label className="block text-xs font-black uppercase text-green-950 mb-1">
                  {t.sellingPricePerRoll}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-xl font-bold text-gray-500">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={pricePerRoll}
                    onChange={(e) => setPricePerRoll(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-2xl font-black text-gray-900 bg-white border-2 border-green-500 rounded-xl pl-9 pr-4 py-3 outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 bg-green-50/50 p-3.5 rounded-2xl border border-green-200">
              {/* Area Sold & Unit */}
              <div>
                <label className="block text-xs font-black uppercase text-green-950 mb-1">
                  {lang === 'te' ? 'ఎంత విస్తీర్ణం అమ్మారు?' : 'Area of Grass Sold'}
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0.1"
                    value={area}
                    onChange={(e) => setArea(e.target.value === '' ? '' : Number(e.target.value))}
                    className="flex-1 text-2xl font-black text-gray-900 bg-white border-2 border-green-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="0"
                  />
                  <div className="flex rounded-xl overflow-hidden border-2 border-green-500 bg-white">
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
                            ? 'bg-green-700 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {u === 'ACRES' ? t.acres : u === 'GUNTAS' ? t.guntas : t.cents}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Selling Price per Unit */}
              <div>
                <label className="block text-xs font-black uppercase text-green-950 mb-1">
                  {lang === 'te' ? 'ధర (రూ.)' : 'Selling Price per Unit (₹)'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-xl font-bold text-gray-500">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-2xl font-black text-gray-900 bg-white border-2 border-green-500 rounded-xl pl-9 pr-4 py-3 outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TOTAL SALE AMOUNT (Prominently Displayed) */}
          <div className="bg-gradient-to-r from-green-700 to-green-800 text-white p-4 rounded-2xl shadow-md text-center">
            <span className="text-xs uppercase font-bold text-green-200 block">
              {t.totalSaleAmount}
            </span>
            <div className="text-3xl sm:text-4xl font-black tracking-tight mt-0.5">
              {formatRupees(totalSaleAmount)}
            </div>
          </div>

          {/* PAYMENT & DEBT SECTION */}
          <div className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-gray-700">
                {t.amountPaidNow}
              </label>
              <span className="text-xs text-gray-500">
                {lang === 'te' ? 'వెంటనే ఇచ్చిన నగదు' : 'Cash Received'}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-3 text-2xl font-black text-emerald-700">₹</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max={totalSaleAmount}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-2xl font-black text-emerald-800 bg-white border-2 border-emerald-500 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="0"
              />
            </div>

            {/* Quick 1-Handed Payment Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={setFullPaid}
                className="py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-400 rounded-xl text-xs font-black active:scale-95 transition-all text-center"
              >
                ✓ {t.fullPaid}
              </button>
              <button
                type="button"
                onClick={setHalfPaid}
                className="py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-400 rounded-xl text-xs font-black active:scale-95 transition-all text-center"
              >
                ½ {t.partialPaid}
              </button>
              <button
                type="button"
                onClick={setFullDebt}
                className="py-2 bg-red-100 hover:bg-red-200 text-red-900 border border-red-400 rounded-xl text-xs font-black active:scale-95 transition-all text-center"
              >
                ✗ {t.fullDebt}
              </button>
            </div>

            {/* REMAINING DEBT DISPLAY (Highlighted Box) */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                remainingDebt > 0
                  ? 'bg-red-50 border-red-400 text-red-900'
                  : 'bg-emerald-50 border-emerald-400 text-emerald-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{remainingDebt > 0 ? '⚠️' : '🎉'}</span>
                <div>
                  <span className="text-xs font-black uppercase block">
                    {t.remainingDebtAmount}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {remainingDebt > 0
                      ? (lang === 'te' ? 'కస్టమర్ ఖాతాలో బాకీగా నమోదు అవుతుంది' : 'Will be added to customer debt ledger')
                      : (lang === 'te' ? 'బాకీ ఏమీ లేదు (పూర్తి చెల్లింపు)' : 'Fully paid, no debt')}
                  </span>
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black">
                {formatRupees(remainingDebt)}
              </div>
            </div>
          </div>

          {/* CUSTOMER INFORMATION WITH VOICE INPUT */}
          <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-gray-200">
            {/* Quick 1-Tap Customer Selection Badges (Only shown if customers exist) */}
            {customers.length > 0 && (
              <div>
                <label className="block text-xs font-black uppercase text-gray-500 mb-1.5 flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {lang === 'te'
                      ? 'తరచూ కొనే కస్టమర్లలో ఒకరిని ఎంచుకోండి:'
                      : 'Or tap an existing customer:'}
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {customers.slice(0, 6).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectQuickCustomer(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1 active:scale-95 ${
                        customerName === c.name
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      <span>👨‍🌾</span>
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Voice-Enabled Customer Name Input */}
            <VoiceInput
              label={t.customerName}
              value={customerName}
              onChange={setCustomerName}
              lang={lang}
              placeholder={lang === 'te' ? 'పేరు మాట్లాడండి...' : 'Speak customer name...'}
              promptText={lang === 'te' ? 'కస్టమర్ పేరు చెప్పండి' : 'Please speak the customer name'}
            />

            <div>
              <label className="block text-xs font-black uppercase text-gray-700 mb-1 flex items-center space-x-1">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{t.customerPhone}</span>
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full text-base font-bold text-gray-900 bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-green-600"
                placeholder="9848012345"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-gray-700 mb-1 flex items-center space-x-1">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>{t.transportCost}</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-sm font-bold text-gray-900 bg-white border border-gray-300 rounded-xl px-3.5 py-2 outline-none focus:border-indigo-600"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Footer: HUGE SAVE BUTTON */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 active:scale-[0.98] text-white font-black text-xl rounded-2xl shadow-xl flex items-center justify-center space-x-2 transition-all border-2 border-green-500"
          >
            <CheckCircle className="w-6 h-6" />
            <span>{t.save}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
