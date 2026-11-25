import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Volume2,
  VolumeX,
  Globe,
  Lock,
  ChevronLeft,
  ChevronRight,
  Database,
  CalendarDays,
  Cloud,
  HardDrive,
  KeyRound
} from 'lucide-react';
import { translations, Language } from '../i18n/translations';
import { voice } from '../services/voice';
import { supabaseService, SyncStatus } from '../services/supabaseClient';

interface HeaderProps {
  currentDate: string;
  onDateChange: (newDate: string) => void;
  lang: Language;
  onLanguageToggle: () => void;
  voiceEnabled: boolean;
  onVoiceToggle: () => void;
  onLockApp: () => void;
  onOpenSettings: () => void;
  onOpenChangePin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onDateChange,
  lang,
  onLanguageToggle,
  voiceEnabled,
  onVoiceToggle,
  onLockApp,
  onOpenSettings,
  onOpenChangePin,
}) => {
  const t = translations[lang];
  const [showCalendarInput, setShowCalendarInput] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(supabaseService.getStatus());

  useEffect(() => {
    const unsub = supabaseService.subscribeStatus((st) => setSyncStatus(st));
    return unsub;
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = currentDate === todayStr;

  const navigateDays = (delta: number) => {
    voice.playTone('tap');
    const d = new Date(currentDate);
    d.setDate(d.getDate() + delta);
    const nextDate = d.toISOString().split('T')[0];
    onDateChange(nextDate);
  };

  const setToday = () => {
    voice.playTone('tap');
    onDateChange(todayStr);
  };

  // Format readable date
  const formatDisplayDate = (dStr: string) => {
    try {
      const d = new Date(dStr);
      if (lang === 'te') {
        const monthsTe = [
          'జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్',
          'జూలై', 'ఆగస్టు', 'సెప్టెంబర్', 'అక్టోబర్', 'నవంబర్', 'డిసెంబర్'
        ];
        return `${d.getDate()} ${monthsTe[d.getMonth()]}, ${d.getFullYear()}`;
      } else {
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch {
      return dStr;
    }
  };

  return (
    <header className="bg-gradient-to-r from-green-800 to-green-700 text-white shadow-md sticky top-0 z-30 select-none">
      {/* Top Bar: Brand, Database Status, Language, Voice & Security */}
      <div className="max-w-4xl mx-auto px-3 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Logo Grass Bundle */}
          <div className="w-10 h-10 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-green-900 font-black shadow-inner">
            <span className="text-xl">🌾</span>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-none text-white">
                {t.appTitle}
              </h1>
              {/* Prominent Database Status Badge */}
              <button
                type="button"
                onClick={() => {
                  voice.playTone('tap');
                  onOpenSettings();
                }}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 border transition-all ${
                  syncStatus === 'CONNECTED'
                    ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400'
                    : syncStatus === 'SYNCING'
                    ? 'bg-blue-500/30 text-blue-200 border-blue-400 animate-pulse'
                    : 'bg-amber-400/20 text-amber-200 border-amber-400/50'
                }`}
                title="Database Status (Tap to configure)"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    syncStatus === 'CONNECTED'
                      ? 'bg-emerald-400 animate-pulse'
                      : syncStatus === 'SYNCING'
                      ? 'bg-blue-400'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="hidden sm:inline">
                  {syncStatus === 'CONNECTED'
                    ? (lang === 'te' ? 'డేటాబేస్ కనెక్ట్ అయింది' : 'DB Connected')
                    : syncStatus === 'SYNCING'
                    ? (lang === 'te' ? 'సింక్ అవుతోంది' : 'Syncing...')
                    : (lang === 'te' ? 'ఆఫ్‌లైన్ (సేఫ్)' : 'Offline Local')}
                </span>
                <span className="sm:hidden">
                  {syncStatus === 'CONNECTED' ? 'DB ✓' : 'Offline'}
                </span>
              </button>
            </div>
            <p className="text-[11px] sm:text-xs text-green-100 font-medium">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Quick Top Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Language Switcher */}
          <button
            onClick={() => {
              voice.playTone('tap');
              onLanguageToggle();
            }}
            aria-label="Switch Language"
            className="flex items-center space-x-1 bg-green-900/60 hover:bg-green-900 active:scale-95 px-2.5 py-1.5 rounded-lg border border-green-500/30 text-xs font-bold transition-all shadow-sm"
          >
            <Globe className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-amber-200">{lang === 'te' ? 'English' : 'తెలుగు'}</span>
          </button>

          {/* Voice Assistance Toggle */}
          <button
            onClick={() => {
              voice.playTone('tap');
              onVoiceToggle();
            }}
            aria-label="Voice Assistance"
            title={voiceEnabled ? t.voiceOn : t.voiceOff}
            className={`p-2 rounded-lg border transition-all active:scale-95 ${
              voiceEnabled
                ? 'bg-amber-400 text-green-950 border-amber-300 shadow-sm'
                : 'bg-green-900/60 text-green-200 border-green-600/40'
            }`}
          >
            {voiceEnabled ? (
              <Volume2 className="w-4 h-4 animate-pulse" />
            ) : (
              <VolumeX className="w-4 h-4 opacity-75" />
            )}
          </button>

          {/* Settings / Supabase / Backup */}
          <button
            onClick={() => {
              voice.playTone('tap');
              onOpenSettings();
            }}
            aria-label="Settings and Database"
            className="p-2 rounded-lg bg-green-900/60 hover:bg-green-900 active:scale-95 text-green-100 border border-green-600/40"
            title={lang === 'te' ? 'డేటాబేస్ & బ్యాకప్' : 'Database & Backup'}
          >
            <Database className="w-4 h-4" />
          </button>

          {/* Change PIN Button */}
          {onOpenChangePin && (
            <button
              onClick={() => {
                voice.playTone('tap');
                onOpenChangePin();
              }}
              aria-label="Change 4-Digit PIN"
              className="p-2 rounded-lg bg-amber-400 hover:bg-amber-300 active:scale-95 text-green-950 border border-amber-300 shadow-sm"
              title={t.changePin}
            >
              <KeyRound className="w-4 h-4" />
            </button>
          )}

          {/* Lock App with PIN */}
          <button
            onClick={() => {
              voice.playTone('tap');
              onLockApp();
            }}
            aria-label="Lock App"
            className="p-2 rounded-lg bg-red-800/80 hover:bg-red-800 active:scale-95 text-white border border-red-500/40"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Navigation Bar (Essential Daily Session Requirement) */}
      <div className="bg-green-900/90 border-t border-green-600/30 px-3 py-1.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Previous Day Button */}
          <button
            onClick={() => navigateDays(-1)}
            className="flex items-center px-2 sm:px-3 py-1.5 bg-green-800 hover:bg-green-700 active:scale-95 rounded-lg border border-green-600/50 text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5" />
            <span className="hidden sm:inline">{lang === 'te' ? 'మునుపటి రోజు' : 'Prev'}</span>
          </button>

          {/* Center Date Display + Today Shortcut */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCalendarInput(!showCalendarInput)}
              className="flex items-center space-x-1.5 bg-green-950/70 hover:bg-green-950 px-3 py-1.5 rounded-lg border border-amber-400/40 shadow-inner"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-xs sm:text-sm font-bold text-amber-100">
                {formatDisplayDate(currentDate)}
              </span>
            </button>

            {/* Prominent TODAY button */}
            {!isToday && (
              <button
                onClick={setToday}
                className="bg-amber-400 hover:bg-amber-300 text-green-950 font-black px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-sm shadow-md active:scale-95 transition-all animate-bounce"
              >
                {t.today}
              </button>
            )}
          </div>

          {/* Next Day Button */}
          <button
            onClick={() => navigateDays(1)}
            className="flex items-center px-2 sm:px-3 py-1.5 bg-green-800 hover:bg-green-700 active:scale-95 rounded-lg border border-green-600/50 text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            <span className="hidden sm:inline">{lang === 'te' ? 'తదుపరి రోజు' : 'Next'}</span>
            <ChevronRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>

        {/* Expandable Calendar Picker */}
        {showCalendarInput && (
          <div className="max-w-4xl mx-auto mt-2 pt-2 border-t border-green-700/50 flex items-center justify-center space-x-2 animate-fadeIn">
            <CalendarDays className="w-5 h-5 text-amber-300" />
            <input
              type="date"
              value={currentDate}
              onChange={(e) => {
                if (e.target.value) {
                  onDateChange(e.target.value);
                  setShowCalendarInput(false);
                }
              }}
              className="bg-white text-gray-900 font-bold px-3 py-1.5 rounded-lg text-sm border-2 border-amber-400 outline-none shadow-md"
            />
            <button
              onClick={() => setShowCalendarInput(false)}
              className="text-xs text-green-200 underline px-2 py-1"
            >
              {t.close}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
