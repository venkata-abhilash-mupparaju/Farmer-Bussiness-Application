import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Sparkles } from 'lucide-react';
import { translations, Language } from '../i18n/translations';
import { voice } from '../services/voice';
import { DailySummary } from '../types';
import { formatRupees } from '../services/financialCalculations';

interface VoiceAssistantButtonProps {
  lang: Language;
  summary: DailySummary;
  onOpenBuy: () => void;
  onOpenSell: () => void;
  onOpenDebt: () => void;
  onOpenReports: () => void;
}

export const VoiceAssistantButton: React.FC<VoiceAssistantButtonProps> = ({
  lang,
  summary,
  onOpenBuy,
  onOpenSell,
  onOpenDebt,
  onOpenReports,
}) => {
  const t = translations[lang];
  const [isListening, setIsListening] = useState(false);
  const [spokenFeedback, setSpokenFeedback] = useState<string | null>(null);

  // Read out today's financial summary
  const handleReadSummary = () => {
    voice.playTone('tap');
    const msg =
      lang === 'te'
        ? `ఈ రోజు అమ్మకాలు రూ. ${Math.round(summary.total_sales)}. చేతికి వచ్చిన నగదు రూ. ${Math.round(
            summary.total_cash_received
          )}. ఈ రోజు నికర లాభం రూ. ${Math.round(summary.net_profit)}.`
        : `Today's sales are ₹${Math.round(summary.total_sales)}. Cash received is ₹${Math.round(
            summary.total_cash_received
          )}. Today's net profit is ₹${Math.round(summary.net_profit)}.`;

    setSpokenFeedback(msg);
    voice.speak(msg, lang, () => {
      setTimeout(() => setSpokenFeedback(null), 2000);
    });
  };

  // Optional Voice Input (Speech Recognition)
  const handleStartListening = () => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      handleReadSummary();
      return;
    }

    try {
      voice.playTone('tap');
      const recognition = new SpeechRecognitionClass();
      recognition.lang = lang === 'te' ? 'te-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      setIsListening(true);
      setSpokenFeedback(lang === 'te' ? 'మీరు చెప్పేది వింటున్నాను...' : 'Listening to your command...');

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        setIsListening(false);
        setSpokenFeedback(`"${transcript}"`);

        // Match voice commands
        if (transcript.includes('కొను') || transcript.includes('buy') || transcript.includes('కొనడం')) {
          onOpenBuy();
        } else if (transcript.includes('అమ్ము') || transcript.includes('sell') || transcript.includes('అమ్మకం')) {
          onOpenSell();
        } else if (transcript.includes('బాకీ') || transcript.includes('debt') || transcript.includes('అప్పు')) {
          onOpenDebt();
        } else if (transcript.includes('ఖర్చు') || transcript.includes('expense')) {
          // Open expenses if spoken
        } else if (transcript.includes('లెక్క') || transcript.includes('report') || transcript.includes('నివేదిక')) {
          onOpenReports();
        } else {
          // Default: speak summary
          handleReadSummary();
        }

        setTimeout(() => setSpokenFeedback(null), 3000);
      };

      recognition.onerror = () => {
        setIsListening(false);
        handleReadSummary();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      handleReadSummary();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end space-y-2 select-none no-print">
      {spokenFeedback && (
        <div className="bg-green-950 text-amber-200 border-2 border-amber-400 text-xs font-bold px-3 py-2 rounded-2xl shadow-xl max-w-xs animate-slideUp">
          📢 {spokenFeedback}
        </div>
      )}

      <button
        onClick={handleStartListening}
        aria-label="Voice Assistant"
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 border-3 active:scale-90 ${
          isListening
            ? 'bg-red-600 border-white text-white animate-pulse ring-4 ring-red-400'
            : 'bg-gradient-to-r from-amber-500 to-amber-600 border-white text-green-950 hover:scale-105 shadow-amber-900/30'
        }`}
        title={lang === 'te' ? 'వాయిస్ సహాయం (మాట్లాడండి లేదా వినండి)' : 'Voice Assistant (Speak or Listen)'}
      >
        {isListening ? <Mic className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
      </button>
    </div>
  );
};
