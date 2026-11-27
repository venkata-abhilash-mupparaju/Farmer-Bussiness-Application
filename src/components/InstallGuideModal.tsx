import React from 'react';
import { X, Smartphone, CheckCircle, MoreVertical, PlusSquare, ArrowRight } from 'lucide-react';
import { Language } from '../i18n/translations';
import { voice } from '../services/voice';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    voice.playTone('tap');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-4 animate-scaleUp border border-gray-100 text-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">
                {lang === 'te' ? 'ఫోన్‌లో ఇన్‌స్టాల్ చేయండి' : 'Install on Mobile Phone'}
              </h3>
              <p className="text-[11px] text-gray-500 font-bold">
                {lang === 'te' ? 'యాప్ లాగా హోమ్ స్క్రీన్‌పై ఉంచండి' : 'Add to home screen as an App'}
              </p>
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

        {/* Instructions for Android Chrome */}
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl space-y-2.5">
          <div className="flex items-center space-x-1.5 text-xs font-black text-emerald-950 uppercase tracking-wide">
            <span>🤖 Android (Google Chrome)</span>
          </div>

          <div className="space-y-2 text-xs text-gray-800 font-medium">
            <div className="flex items-start space-x-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5">
                1
              </span>
              <span>
                {lang === 'te'
                  ? 'క్రోమ్ బ్రౌజర్ పైభాగంలో కుడివైపున ఉన్న మూడు చుక్కలు (⋮) నొక్కండి.'
                  : 'Tap the three vertical dots (⋮) in the top-right corner of Chrome.'}
              </span>
            </div>

            <div className="flex items-start space-x-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5">
                2
              </span>
              <span>
                {lang === 'te'
                  ? '"యాప్‌ను ఇన్‌స్టాల్ చేయి" (Install app) లేదా "హోమ్ స్క్రీన్‌కు జోడించు" నొక్కండి.'
                  : 'Tap "Install app" (or "Add to Home screen").'}
              </span>
            </div>

            <div className="flex items-start space-x-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5">
                3
              </span>
              <span>
                {lang === 'te'
                  ? '"ఇన్‌స్టాల్" (Install) నిర్ధారించండి. మీ ఫోన్ స్క్రీన్ పై ఐకాన్ వస్తుంది!'
                  : 'Confirm "Install". The app icon 🌾 will appear on your phone home screen!'}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions for iPhone Safari */}
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl space-y-1.5 text-xs text-gray-800 font-medium">
          <span className="font-black text-blue-950 block">🍎 iPhone (Safari):</span>
          <p>
            {lang === 'te'
              ? 'షేర్ బటన్ (Share ⎋) నొక్కి "Add to Home Screen" ఎంచుకోండి.'
              : 'Tap the Share button (⎋) at bottom & select "Add to Home Screen".'}
          </p>
        </div>

        {/* Bottom Button */}
        <button
          type="button"
          onClick={handleClose}
          className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-1"
        >
          <CheckCircle className="w-4 h-4" />
          <span>{lang === 'te' ? 'అర్థమైంది' : 'Got it'}</span>
        </button>
      </div>
    </div>
  );
};
