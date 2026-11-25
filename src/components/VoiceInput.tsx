import React, { useState } from 'react';
import { Mic, MicOff, Volume2, CheckCircle2, X } from 'lucide-react';
import { voice } from '../services/voice';
import { Language } from '../i18n/translations';

interface VoiceInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  lang: Language;
  placeholder?: string;
  promptText?: string;
  fieldId?: string;
  className?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  label,
  value,
  onChange,
  lang,
  placeholder,
  promptText,
  fieldId,
  className = '',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [heardText, setHeardText] = useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      voice.stop();
    };
  }, []);

  const startVoiceInput = () => {
    voice.playTone('tap');
    setIsListening(true);
    setHeardText(lang === 'te' ? 'వింటున్నాను... పేరు చెప్పండి...' : 'Listening... please speak...');

    const prompt =
      promptText ||
      (lang === 'te' ? 'దయచేసి పేరు స్పష్టంగా చెప్పండి' : 'Please speak the name clearly');

    voice.listenSpeech({
      lang,
      promptSpeech: prompt,
      onListeningStart: () => {
        setIsListening(true);
      },
      onResult: (transcript) => {
        setIsListening(false);
        setHeardText(transcript);
        onChange(transcript);
        voice.playTone('success');

        // Spoken confirmation to the farmer
        const confirmMsg =
          lang === 'te'
            ? `పేరు: ${transcript} నమోదు చేయబడింది`
            : `Recorded name: ${transcript}`;
        voice.speak(confirmMsg, lang);

        setTimeout(() => setHeardText(null), 3500);
      },
      onError: (err) => {
        setIsListening(false);
        voice.playTone('alert');
        setHeardText(lang === 'te' ? 'మాట స్పష్టంగా రాలేదు. మళ్లీ నొక్కండి.' : 'Could not hear clearly. Tap again.');
        setTimeout(() => setHeardText(null), 3000);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
  };

  const stopVoiceInput = () => {
    voice.stop();
    setIsListening(false);
    setHeardText(null);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={fieldId} className="block text-xs font-black uppercase text-gray-700">
            {label}
          </label>
          <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
            <Mic className="w-3 h-3 text-emerald-600 animate-pulse" />
            <span>{lang === 'te' ? 'నోటితో పేరు చెప్పవచ్చు' : 'You can speak the name'}</span>
          </span>
        </div>
      )}

      {/* Main Input + Big Prominent Mic Button */}
      <div className="flex items-stretch space-x-2">
        <div className="relative flex-1">
          <input
            id={fieldId}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || (lang === 'te' ? 'పేరు చెప్పండి లేదా ఎంచుకోండి...' : 'Speak or select name...')}
            className="w-full text-base sm:text-lg font-bold text-gray-900 bg-white border-2 border-gray-300 rounded-xl px-3.5 py-3 outline-none focus:border-emerald-600 shadow-sm"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                voice.playTone('tap');
                const readout = lang === 'te' ? `పేరు: ${value}` : `Name: ${value}`;
                voice.speak(readout, lang);
              }}
              className="absolute right-3 top-3 text-gray-400 hover:text-emerald-700 p-1"
              title="Hear name readout"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* PROMINENT SPEAK NAME BUTTON - Very large, eye-catching for illiterate farmer */}
        <button
          type="button"
          onClick={isListening ? stopVoiceInput : startVoiceInput}
          className={`px-4 sm:px-5 rounded-xl font-black text-sm flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition-all select-none ${
            isListening
              ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-300'
              : 'bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white border border-emerald-500'
          }`}
          title={lang === 'te' ? 'పేరు మాట్లాడి చెప్పండి' : 'Speak Name'}
        >
          {isListening ? (
            <>
              <MicOff className="w-5 h-5" />
              <span>{lang === 'te' ? 'ఆపు' : 'Stop'}</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span>{lang === 'te' ? 'పేరు చెప్పండి' : 'Speak'}</span>
            </>
          )}
        </button>
      </div>

      {/* Live Voice Status Banner */}
      {(isListening || heardText) && (
        <div
          className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all animate-fadeIn ${
            isListening
              ? 'bg-amber-100 text-amber-950 border border-amber-300'
              : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {isListening ? (
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            <span>{heardText}</span>
          </div>
          {isListening && (
            <button
              type="button"
              onClick={stopVoiceInput}
              className="p-1 text-amber-900 hover:text-black"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
