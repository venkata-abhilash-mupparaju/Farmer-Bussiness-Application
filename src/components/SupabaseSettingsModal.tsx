import React, { useState } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Lock,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { AppSettings, AreaUnit } from '../types';
import { translations, Language } from '../i18n/translations';
import { storage } from '../services/storage';
import { voice } from '../services/voice';
import { supabaseService, SyncStatus } from '../services/supabaseClient';
import { ChangePinModal } from './ChangePinModal';

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: Partial<AppSettings>) => void;
  onRefreshData: () => void;
  lang: Language;
}

export const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onRefreshData,
  lang,
}) => {
  const t = translations[lang];

  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabase_url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(settings.supabase_anon_key || '');
  const [defaultUnit, setDefaultUnit] = useState<AreaUnit>(settings.default_area_unit || 'ACRES');
  const [pinEnabled, setPinEnabled] = useState(settings.pin_enabled);
  const [pin, setPin] = useState(settings.pin || '1234');
  const [showPin, setShowPin] = useState(false);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [pinSavedBanner, setPinSavedBanner] = useState<string | null>(null);

  const [copiedSQL, setCopiedSQL] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ testing: boolean; message: string; success?: boolean } | null>(null);
  const [syncingNow, setSyncingNow] = useState(false);

  const handleClose = () => {
    voice.playTone('tap');
    voice.stop();
    onClose();
  };

  React.useEffect(() => {
    if (isOpen) {
      const speech =
        lang === 'te'
          ? 'డేటాబేస్ మరియు అప్లికేషన్ సెట్టింగ్‌లు'
          : 'Database and application settings';
      voice.speak(speech, lang);
    } else {
      voice.stop();
    }
    return () => {
      voice.stop();
    };
  }, [isOpen, lang]);

  if (!isOpen) return null;

  const sqlCode = storage.generateSupabaseSQL();

  const handleCopySQL = () => {
    voice.playTone('tap');
    navigator.clipboard.writeText(sqlCode);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  const handleTestConnection = async () => {
    voice.playTone('tap');
    if (!supabaseUrl || !supabaseAnonKey) {
      voice.playTone('alert');
      setTestResult({
        testing: false,
        success: false,
        message: lang === 'te' ? 'దయచేసి Supabase URL మరియు API Key నమోదు చేయండి' : 'Please enter Supabase URL and API Key',
      });
      return;
    }

    setTestResult({ testing: true, message: lang === 'te' ? 'కనెక్షన్ పరీక్షిస్తున్నాము...' : 'Testing connection...' });
    supabaseService.init(supabaseUrl.trim(), supabaseAnonKey.trim());
    const res = await supabaseService.testConnection();

    setTestResult({ testing: false, success: res.success, message: res.message });
    if (res.success) {
      voice.playTone('success');
      voice.speak(lang === 'te' ? 'డేటాబేస్ విజయవంతంగా కనెక్ట్ అయింది!' : 'Database connected successfully!', lang);
    } else {
      voice.playTone('alert');
    }
  };

  const handleSyncNow = async () => {
    voice.playTone('tap');
    setSyncingNow(true);
    const localData = {
      purchases: storage.getPurchases(),
      sales: storage.getSales(),
      customers: storage.getCustomers(),
      repayments: storage.getRepayments(),
      expenses: storage.getExpenses(),
    };

    const res = await supabaseService.syncData(localData);
    setSyncingNow(false);

    if (res.success) {
      voice.playTone('success');
      const msg =
        lang === 'te'
          ? `క్లౌడ్‌తో విజయవంతంగా సింక్ అయ్యింది (${res.syncedCount} రికార్డులు)`
          : `Synced ${res.syncedCount} records with Supabase cloud!`;
      voice.speak(msg, lang);
      setTestResult({ testing: false, success: true, message: msg });
    } else {
      voice.playTone('alert');
      setTestResult({ testing: false, success: false, message: res.error || 'Sync failed' });
    }
  };

  const handleDownloadBackup = () => {
    voice.playTone('cash');
    const jsonStr = storage.exportAllDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Farmer_Grass_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = storage.importAllDataJSON(content);
        if (res.success) {
          voice.playTone('success');
          setRestoreStatus('✓ ' + (lang === 'te' ? 'డేటా విజయవంతంగా పునరుద్ధరించబడింది!' : 'Data restored successfully!'));
          onRefreshData();
          setTimeout(() => setRestoreStatus(null), 3000);
        } else {
          voice.playTone('alert');
          setRestoreStatus('✗ ' + res.message);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetDatabase = () => {
    voice.playTone('tap');
    const confirmPrompt =
      lang === 'te'
        ? 'నిజంగా అన్ని లావాదేవీల రికార్డులను తొలగించి జీరో (0) చేయాలనుకుంటున్నారా?'
        : 'Are you sure you want to permanently clear all records to zero?';
    if (window.confirm(confirmPrompt)) {
      storage.clearAllData();
      onRefreshData();
      voice.playTone('delete');
      const clearedMsg =
        lang === 'te'
          ? 'డేటాబేస్ పూర్తిగా క్లియర్ చేయబడింది (0 Records)!'
          : 'Database reset to zero records!';
      voice.speak(clearedMsg, lang);
      setTestResult({ testing: false, success: true, message: clearedMsg });
    }
  };

  const handleSaveAll = () => {
    voice.playTone('success');
    const url = supabaseUrl.trim();
    const key = supabaseAnonKey.trim();

    supabaseService.init(url, key);

    onSaveSettings({
      supabase_url: url,
      supabase_anon_key: key,
      default_area_unit: defaultUnit,
      pin_enabled: pinEnabled,
      pin: pin,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fadeIn">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[94vh] flex flex-col overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⚙️</span>
            <div>
              <h2 className="text-lg font-black">{lang === 'te' ? 'డేటాబేస్ & సెట్టింగ్‌లు' : 'Database & Cloud Sync'}</h2>
              <span className="text-xs text-emerald-200">PostgreSQL / Supabase & Backup</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/20 active:scale-95 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* 1. Offline & Local Storage Status */}
          <div className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-2xl flex items-center space-x-3 text-emerald-950">
            <ShieldCheck className="w-8 h-8 text-emerald-600 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-black text-sm block">
                {lang === 'te' ? 'ఆఫ్‌లైన్ & క్లౌడ్ హైబ్రిడ్ మోడ్ (100% సేఫ్)' : 'Offline & Cloud Hybrid Mode (100% Safe)'}
              </span>
              <span className="text-gray-600">
                {lang === 'te'
                  ? 'ఇంటర్నెట్ లేకపోయినా డేటా ఫోన్‌లో శాశ్వతంగా భద్రంగా ఉంటుంది. కనెక్ట్ అయినప్పుడు క్లౌడ్‌కి సింక్ అవుతుంది.'
                  : 'Data is persistently stored locally and syncs to Supabase cloud PostgreSQL.'}
              </span>
            </div>
          </div>

          {/* 2. Supabase Integration (Backend Requirement) */}
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-900 font-bold text-sm">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'te' ? 'Supabase క్లౌడ్ కనెక్షన్' : 'Supabase Cloud Connection'}</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700">PostgreSQL</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full text-xs font-mono text-gray-900 bg-white border border-gray-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Supabase Anon API Key
              </label>
              <input
                type="password"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full text-xs font-mono text-gray-900 bg-white border border-gray-300 rounded-xl px-3 py-2 outline-none focus:border-emerald-600"
              />
            </div>

            {/* Test Connection & Sync Now Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1 shadow-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'te' ? 'కనెక్షన్ పరీక్షించు' : 'Test Connection'}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncingNow}
                className="py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1 shadow-sm transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${syncingNow ? 'animate-spin' : ''}`} />
                <span>{lang === 'te' ? 'ఇప్పుడే సింక్ చేయి' : 'Sync Now'}</span>
              </button>
            </div>

            {/* Test / Sync Result Banner */}
            {testResult && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold flex items-start space-x-2 animate-fadeIn ${
                  testResult.success
                    ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                    : 'bg-red-100 text-red-950 border border-red-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Copy Schema SQL Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleCopySQL}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 border border-emerald-300"
              >
                {copiedSQL ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                <span>
                  {copiedSQL
                    ? (lang === 'te' ? 'SQL కాపీ చేయబడింది!' : 'SQL Copied to Clipboard!')
                    : (lang === 'te' ? 'Supabase SQL స్కీమా కాపీ చేయండి' : 'Copy Supabase Schema SQL')}
                </span>
              </button>
            </div>
          </div>

          {/* 3. Manual JSON Backup & Restore (Section 14 Requirement) */}
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl space-y-3">
            <span className="text-xs font-black uppercase text-gray-700 block">
              {lang === 'te' ? 'డేటా బ్యాకప్ & రీస్టోర్' : 'Manual Backup & Restore'}
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="py-3 bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-xl text-xs font-bold text-gray-800 flex flex-col items-center justify-center space-y-1 active:scale-95 transition-all shadow-sm"
              >
                <Download className="w-5 h-5 text-emerald-600" />
                <span>{lang === 'te' ? 'బ్యాకప్ డౌన్‌లోడ్' : 'Download Backup'}</span>
              </button>

              <label className="py-3 bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-xl text-xs font-bold text-gray-800 flex flex-col items-center justify-center space-y-1 active:scale-95 transition-all shadow-sm cursor-pointer">
                <Upload className="w-5 h-5 text-blue-600" />
                <span>{lang === 'te' ? 'ఫైల్ రీస్టోర్' : 'Restore from File'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFile}
                  className="hidden"
                />
              </label>
            </div>

            {restoreStatus && (
              <p className="text-xs font-bold text-center text-emerald-700 bg-emerald-100 p-2 rounded-lg">
                {restoreStatus}
              </p>
            )}
          </div>

          {/* 4. PIN Protection & Change PIN Section */}
          <div className="bg-white border-2 border-amber-200 p-4 rounded-2xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-gray-900 block">
                    {t.pinSecurityTitle}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {lang === 'te' ? 'యాప్ ఓపెన్ చేసినప్పుడు పిన్ రక్షణ' : 'Prompt for 4-digit PIN on open'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={pinEnabled}
                onChange={(e) => setPinEnabled(e.target.checked)}
                className="w-5 h-5 accent-emerald-600 cursor-pointer"
              />
            </div>

            {pinEnabled && (
              <div className="pt-2 border-t border-gray-100 space-y-3">
                {/* Current PIN Display with Reveal / Hide */}
                <div className="flex items-center justify-between bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <div>
                    <span className="text-[11px] font-bold text-gray-600 uppercase block">
                      {t.currentPin}
                    </span>
                    <span className="text-xl font-black tracking-widest text-gray-900 font-mono">
                      {showPin ? pin : '••••'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      voice.playTone('tap');
                      const nextShow = !showPin;
                      setShowPin(nextShow);
                      if (nextShow) {
                        const msg =
                          lang === 'te'
                            ? `మీ ప్రస్తుత పిన్ ${pin.split('').join(' ')}`
                            : `Current PIN is ${pin}`;
                        voice.speak(msg, lang);
                      }
                    }}
                    className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-900 hover:bg-amber-100 flex items-center space-x-1"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPin ? t.hidePin : t.showPin}</span>
                  </button>
                </div>

                {/* Big Prominent "Change 4-Digit PIN" Button */}
                <button
                  type="button"
                  onClick={() => {
                    voice.playTone('tap');
                    setIsChangePinOpen(true);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-green-950 font-black text-sm rounded-xl shadow-md border border-amber-300 flex items-center justify-center space-x-2 transition-all"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{t.changePin}</span>
                </button>

                {/* Direct 4-digit input alternative */}
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-600 block">
                    {lang === 'te'
                      ? 'లేదా ఇక్కడ నేరుగా కొత్త 4 అంకెల పిన్ టైప్ చేయండి:'
                      : 'Or type new 4-digit PIN directly:'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setPin(val);
                      }}
                      className="w-28 text-center text-lg font-black tracking-widest text-gray-900 bg-white border-2 border-gray-300 rounded-xl px-2 py-1.5 outline-none focus:border-amber-500 font-mono"
                      placeholder="1234"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (pin.length !== 4) {
                          voice.playTone('alert');
                          alert(
                            lang === 'te'
                              ? 'పిన్ ఖచ్చితంగా 4 అంకెలు ఉండాలి'
                              : 'PIN must be exactly 4 digits'
                          );
                          return;
                        }
                        voice.playTone('cash');
                        onSaveSettings({ pin });
                        setPinSavedBanner(lang === 'te' ? 'పిన్ సేవ్ అయ్యింది!' : 'PIN Saved!');
                        const msg =
                          lang === 'te'
                            ? 'కొత్త పిన్ విజయవంతంగా సేవ్ చేయబడింది'
                            : 'New PIN saved successfully';
                        voice.speak(msg, lang);
                        setTimeout(() => setPinSavedBanner(null), 2500);
                      }}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center space-x-1"
                    >
                      <Check className="w-4 h-4" />
                      <span>{lang === 'te' ? 'పిన్ సేవ్ చేయి' : 'Save PIN'}</span>
                    </button>
                  </div>
                  {pinSavedBanner && (
                    <p className="text-xs font-bold text-emerald-700 animate-fadeIn">
                      ✓ {pinSavedBanner}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 5. Zero Records / Reset Database */}
          <div className="bg-red-50 border-2 border-red-200 p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center space-x-2 text-red-900 font-bold text-xs uppercase">
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>{lang === 'te' ? 'డేటాబేస్ రీసెట్ (0 రికార్డులు)' : 'Reset Database (Zero Records)'}</span>
            </div>
            <p className="text-[11px] text-gray-600">
              {lang === 'te'
                ? 'అన్ని పాత కొనుగోళ్లు, అమ్మకాలు, బాకీలు మరియు ఖర్చులను క్లియర్ చేసి సరికొత్తగా 0 రికార్డులతో ప్రారంభించండి.'
                : 'Clear all transactions, customer debts, and stock to start completely fresh with 0 records.'}
            </p>
            <button
              type="button"
              onClick={handleResetDatabase}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1 shadow-sm transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>{lang === 'te' ? 'అన్ని రికార్డులు క్లియర్ చేయి (Zero Records)' : 'Clear All Records (Zero Records)'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSaveAll}
            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-base rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            {t.save}
          </button>
        </div>
      </div>

      {/* Change PIN Modal */}
      <ChangePinModal
        isOpen={isChangePinOpen}
        onClose={() => setIsChangePinOpen(false)}
        currentPin={pin}
        onUpdatePin={(newPin) => {
          setPin(newPin);
          onSaveSettings({ pin: newPin });
          setIsChangePinOpen(false);
        }}
        lang={lang}
      />
    </div>
  );
};
