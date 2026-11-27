import React, { useState } from 'react';
import { Lock, Unlock, Delete, AlertCircle, KeyRound, RotateCcw } from 'lucide-react';
import { translations, Language } from '../i18n/translations';
import { voice } from '../services/voice';
import { ChangePinModal } from './ChangePinModal';

interface PinLockScreenProps {
  correctPin: string;
  onUnlock: () => void;
  lang: Language;
  onUpdatePin: (newPin: string) => void;
  isStandalone?: boolean;
  onInstallApp?: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  correctPin,
  onUnlock,
  lang,
  onUpdatePin,
  isStandalone,
  onInstallApp,
}) => {
  const t = translations[lang];

  const [enteredPin, setEnteredPin] = useState('');
  const [errorMsg, setErrorMsg] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);

  React.useEffect(() => {
    voice.speak(lang === 'te' ? 'దయచేసి నాలుగు అంకెల పిన్ నమోదు చేయండి' : 'Please enter four digit security PIN', lang);
    return () => {
      voice.stop();
    };
  }, [lang]);

  const handleDigit = (digit: string) => {
    voice.playTone('tap');
    if (enteredPin.length >= 4) return;

    const next = enteredPin + digit;
    setEnteredPin(next);
    setErrorMsg(false);

    if (next.length === 4) {
      if (next === correctPin) {
        voice.stop();
        voice.playTone('success');
        onUnlock();
      } else {
        voice.playTone('alert');
        setErrorMsg(true);
        setTimeout(() => {
          setEnteredPin('');
          setErrorMsg(false);
        }, 800);
      }
    }
  };

  const handleBackspace = () => {
    voice.playTone('tap');
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMsg(false);
  };

  const handleClear = () => {
    voice.playTone('tap');
    setEnteredPin('');
    setErrorMsg(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-green-900 via-green-800 to-green-950 flex flex-col items-center justify-between p-6 text-white select-none">
      {/* Top Header */}
      <div className="text-center pt-8 space-y-2">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-400 text-green-950 flex items-center justify-center shadow-lg border-2 border-white">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
          {t.appTitle}
        </h2>
        <p className="text-xs sm:text-sm text-green-200 font-semibold">
          {t.enterPin}
        </p>

        {/* PWA Mobile Install Banner on Lock Screen */}
        {!isStandalone && onInstallApp && (
          <button
            type="button"
            onClick={() => {
              voice.playTone('tap');
              onInstallApp();
            }}
            className="mt-2 py-2 px-4 bg-white/15 hover:bg-white/25 active:scale-95 text-amber-300 border border-amber-300/40 rounded-full flex items-center justify-center space-x-1.5 text-xs font-bold shadow-md transition-all mx-auto"
          >
            <span>📱</span>
            <span>{lang === 'te' ? 'యాప్‌ను ఫోన్‌లో ఇన్‌స్టాల్ చేసుకోండి' : 'Install App on Mobile'}</span>
          </button>
        )}
      </div>

      {/* PIN Dots Display */}
      <div className="space-y-4 my-auto">
        <div className="flex justify-center space-x-4">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = enteredPin.length > index;
            return (
              <div
                key={index}
                className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                  errorMsg
                    ? 'border-red-400 bg-red-500 animate-pulse'
                    : isFilled
                    ? 'border-amber-300 bg-amber-400 scale-110 shadow-md'
                    : 'border-green-600/70 bg-green-900/60'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <p className="text-center text-xs font-bold text-red-300 flex items-center justify-center space-x-1 animate-bounce">
            <AlertCircle className="w-4 h-4" />
            <span>{t.wrongPin}</span>
          </p>
        )}

        <p className="text-center text-[11px] text-green-300/80">
          {t.defaultPinHint}
        </p>
      </div>

      {/* Large Numeric Keypad (Optimized for One-Hand Thumb Tap) */}
      <div className="w-full max-w-xs space-y-3 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(String(digit))}
              className="h-16 sm:h-18 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-amber-400 active:text-green-950 font-black text-2xl text-white transition-all shadow-md active:scale-95 border border-white/10 flex items-center justify-center"
            >
              {digit}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClear}
            className="h-16 sm:h-18 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 font-bold text-xs text-green-300 transition-all border border-white/5 flex items-center justify-center"
          >
            {lang === 'te' ? 'క్లియర్' : 'CLEAR'}
          </button>

          {/* Digit 0 */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-16 sm:h-18 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-amber-400 active:text-green-950 font-black text-2xl text-white transition-all shadow-md active:scale-95 border border-white/10 flex items-center justify-center"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            onClick={handleBackspace}
            className="h-16 sm:h-18 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-amber-300 transition-all border border-white/5 flex items-center justify-center"
            title="Backspace"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Prominent Change PIN Button */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={() => {
              voice.playTone('tap');
              setIsChangeModalOpen(true);
            }}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-green-950 font-black text-sm rounded-2xl flex items-center justify-center space-x-2 shadow-lg border-2 border-amber-200 transition-all"
          >
            <KeyRound className="w-4 h-4 text-green-950" />
            <span>{t.changePin}</span>
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                voice.playTone('tap');
                onUpdatePin('1234');
                const msg = lang === 'te' ? 'పిన్ 1234 కి రీసెట్ చేయబడింది' : 'PIN reset to default 1234';
                voice.speak(msg, lang);
                alert(msg);
              }}
              className="text-xs font-bold text-green-300/80 hover:text-white underline"
            >
              {t.forgotPinReset}
            </button>
          </div>
        </div>
      </div>

      {/* Change PIN Modal */}
      <ChangePinModal
        isOpen={isChangeModalOpen}
        onClose={() => setIsChangeModalOpen(false)}
        currentPin={correctPin}
        onUpdatePin={(newPin) => {
          onUpdatePin(newPin);
          setIsChangeModalOpen(false);
        }}
        lang={lang}
      />
    </div>
  );
};
