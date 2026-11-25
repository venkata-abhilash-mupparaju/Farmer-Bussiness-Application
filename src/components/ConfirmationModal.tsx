import React, { useEffect } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { translations, Language } from '../i18n/translations';
import { voice } from '../services/voice';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  lang: Language;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  lang,
}) => {
  const t = translations[lang];

  useEffect(() => {
    if (isOpen) {
      voice.speak(message, lang);
    } else {
      voice.stop();
    }
    return () => {
      voice.stop();
    };
  }, [isOpen, message, lang]);

  if (!isOpen) return null;

  const handleCancel = () => {
    voice.playTone('tap');
    voice.stop();
    onCancel();
  };

  const handleConfirm = () => {
    voice.playTone('delete');
    voice.stop();
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center space-y-4 animate-scaleUp">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-black text-gray-900">{title}</h3>
          <p className="text-xs text-gray-600 font-medium">{message}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-sm active:scale-95 transition-all"
          >
            {t.no} ({t.cancel})
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-sm shadow-md active:scale-95 transition-all flex items-center justify-center space-x-1"
          >
            <Check className="w-4 h-4" />
            <span>{t.yes} ({t.confirm})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
