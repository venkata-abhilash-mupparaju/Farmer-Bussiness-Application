import React, { useState, useEffect } from 'react';
import { KeyRound, Check, X, Delete, AlertCircle, ShieldCheck, RotateCcw } from 'lucide-react';
import { translations, Language } from '../i18n/translations';
import { voice } from '../services/voice';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPin: string;
  onUpdatePin: (newPin: string) => void;
  lang: Language;
}

type Step = 'VERIFY_CURRENT' | 'ENTER_NEW' | 'CONFIRM_NEW';

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  isOpen,
  onClose,
  currentPin,
  onUpdatePin,
  lang,
}) => {
  const t = translations[lang];

  const [step, setStep] = useState<Step>('VERIFY_CURRENT');
  const [enteredPin, setEnteredPin] = useState('');
  const [newPinCandidate, setNewPinCandidate] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Spoken instructions on step transitions
  const speakCurrentStep = (currStep: Step) => {
    let msg = '';
    if (currStep === 'VERIFY_CURRENT') {
      msg = lang === 'te' ? 'దయచేసి ప్రస్తుత పిన్ నమోదు చేయండి' : 'Please enter your current PIN';
    } else if (currStep === 'ENTER_NEW') {
      msg = lang === 'te' ? 'కొత్త నాలుగు అంకెల పిన్ నమోదు చేయండి' : 'Enter your new 4-digit security PIN';
    } else if (currStep === 'CONFIRM_NEW') {
      msg = lang === 'te' ? 'ధృవీకరించడానికి కొత్త పిన్ మళ్లీ నమోదు చేయండి' : 'Re-enter your new PIN to confirm';
    }
    voice.speak(msg, lang);
  };

  useEffect(() => {
    if (isOpen) {
      setStep('VERIFY_CURRENT');
      setEnteredPin('');
      setNewPinCandidate('');
      setErrorMsg(null);
      speakCurrentStep('VERIFY_CURRENT');
    } else {
      voice.stop();
    }
    return () => {
      voice.stop();
    };
  }, [isOpen, lang]);

  if (!isOpen) return null;

  const handleClose = () => {
    voice.playTone('tap');
    voice.stop();
    onClose();
  };

  const handleDigit = (digit: string) => {
    voice.playTone('tap');
    if (enteredPin.length >= 4) return;

    const next = enteredPin + digit;
    setEnteredPin(next);
    setErrorMsg(null);

    if (next.length === 4) {
      if (step === 'VERIFY_CURRENT') {
        if (next === currentPin) {
          voice.playTone('success');
          setStep('ENTER_NEW');
          setEnteredPin('');
          speakCurrentStep('ENTER_NEW');
        } else {
          voice.playTone('alert');
          setErrorMsg(t.wrongPin);
          setTimeout(() => {
            setEnteredPin('');
            setErrorMsg(null);
          }, 800);
        }
      } else if (step === 'ENTER_NEW') {
        voice.playTone('tap');
        setNewPinCandidate(next);
        setStep('CONFIRM_NEW');
        setEnteredPin('');
        speakCurrentStep('CONFIRM_NEW');
      } else if (step === 'CONFIRM_NEW') {
        if (next === newPinCandidate) {
          voice.playTone('cash');
          onUpdatePin(next);
          const successMsg = t.pinChangedSuccess;
          voice.speak(successMsg, lang);
          setTimeout(() => {
            handleClose();
          }, 1200);
        } else {
          voice.playTone('alert');
          setErrorMsg(t.pinMismatch);
          setTimeout(() => {
            setEnteredPin('');
            setErrorMsg(null);
          }, 1000);
        }
      }
    }
  };

  const handleBackspace = () => {
    voice.playTone('tap');
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    voice.playTone('tap');
    setEnteredPin('');
    setErrorMsg(null);
  };

  // Direct reset helper if farmer forgot current PIN
  const handleResetToDefault = () => {
    voice.playTone('tap');
    onUpdatePin('1234');
    const msg = lang === 'te' ? 'పిన్ 1234 కి రీసెట్ చేయబడింది' : 'PIN has been reset to default 1234';
    voice.speak(msg, lang);
    setTimeout(() => {
      handleClose();
    }, 1200);
  };

  const stepTitles: Record<Step, string> = {
    VERIFY_CURRENT: t.currentPin,
    ENTER_NEW: t.newPin,
    CONFIRM_NEW: t.confirmNewPin,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 select-none animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 flex flex-col items-center space-y-4 animate-scaleUp border border-gray-100">
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">{t.changePin}</h3>
              <p className="text-[11px] text-gray-500 font-bold">{stepTitles[step]}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-90 flex items-center justify-center text-gray-600 transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Badges */}
        <div className="flex items-center space-x-2 w-full justify-center">
          <div
            className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
              step === 'VERIFY_CURRENT'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            1. {t.currentPin}
          </div>
          <span className="text-gray-300">→</span>
          <div
            className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
              step === 'ENTER_NEW'
                ? 'bg-amber-500 text-white shadow-sm'
                : step === 'CONFIRM_NEW'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            2. {t.newPin}
          </div>
          <span className="text-gray-300">→</span>
          <div
            className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
              step === 'CONFIRM_NEW'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            3. {t.confirm}
          </div>
        </div>

        {/* 4 PIN Dots */}
        <div className="flex justify-center space-x-3 py-2">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = enteredPin.length > index;
            return (
              <div
                key={index}
                className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                  errorMsg
                    ? 'border-red-500 bg-red-500 animate-pulse'
                    : isFilled
                    ? 'border-emerald-600 bg-emerald-600 scale-110 shadow-sm'
                    : 'border-gray-300 bg-gray-100'
                }`}
              />
            );
          })}
        </div>

        {/* Error or Hint message */}
        {errorMsg ? (
          <p className="text-xs font-bold text-red-600 flex items-center space-x-1 animate-bounce">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </p>
        ) : (
          <p className="text-[11px] text-gray-500 text-center font-medium">
            {step === 'VERIFY_CURRENT' && (
              <span>
                {lang === 'te'
                  ? 'ప్రస్తుత పిన్ నమోదు చేయండి (డిఫాల్ట్: 1234)'
                  : 'Enter current PIN (Default: 1234)'}
              </span>
            )}
            {step === 'ENTER_NEW' && (
              <span>
                {lang === 'te'
                  ? 'మీకు గుర్తున్న 4 అంకెలు నొక్కండి'
                  : 'Tap any 4 memorable digits'}
              </span>
            )}
            {step === 'CONFIRM_NEW' && (
              <span>
                {lang === 'te'
                  ? 'ధృవీకరించడానికి కొత్త పిన్ మళ్లీ నొక్కండి'
                  : 'Tap the same 4 digits again'}
              </span>
            )}
          </p>
        )}

        {/* Big Mobile Keypad */}
        <div className="w-full max-w-xs space-y-2 pt-1">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(String(digit))}
                className="h-13 rounded-2xl bg-gray-100 hover:bg-emerald-50 active:bg-emerald-600 active:text-white font-black text-xl text-gray-900 transition-all shadow-sm active:scale-95 border border-gray-200 flex items-center justify-center"
              >
                {digit}
              </button>
            ))}

            {/* Clear */}
            <button
              type="button"
              onClick={handleClear}
              className="h-13 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-95 font-bold text-xs text-gray-600 border border-gray-200 flex items-center justify-center"
            >
              {lang === 'te' ? 'క్లియర్' : 'CLEAR'}
            </button>

            {/* Digit 0 */}
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-13 rounded-2xl bg-gray-100 hover:bg-emerald-50 active:bg-emerald-600 active:text-white font-black text-xl text-gray-900 transition-all shadow-sm active:scale-95 border border-gray-200 flex items-center justify-center"
            >
              0
            </button>

            {/* Backspace */}
            <button
              type="button"
              onClick={handleBackspace}
              className="h-13 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-95 text-amber-700 border border-gray-200 flex items-center justify-center"
              title="Backspace"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Forgot PIN / Reset helper button */}
        {step === 'VERIFY_CURRENT' && (
          <button
            type="button"
            onClick={handleResetToDefault}
            className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold border border-amber-300 flex items-center justify-center space-x-1.5 transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.forgotPinReset}</span>
          </button>
        )}
      </div>
    </div>
  );
};
