// Audio and Speech Service for Farmer Accessibility

export interface SpeechListenOptions {
  lang: 'te' | 'en';
  promptSpeech?: string;
  onListeningStart?: () => void;
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

class VoiceService {
  private synth: SpeechSynthesis | null = null;
  private audioCtx: AudioContext | null = null;
  private activeRecognition: any = null;
  private promptTimer: any = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;

      // Stop speech immediately when user leaves, hides, or closes browser tab
      window.addEventListener('beforeunload', () => this.stop());
      window.addEventListener('pagehide', () => this.stop());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stop();
        }
      });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play pleasant intuitive sound effects for farmers who cannot read text
  playTone(type: 'tap' | 'success' | 'cash' | 'alert' | 'delete' | 'mic') {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'tap') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'mic') {
        // High soft beep indicating microphone started listening
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(900, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'success' || type === 'cash') {
        // Joyful two-tone chime for money or completed transaction
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'alert') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.setValueAtTime(280, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'delete') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(150, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch {
      // AudioContext blocked or not supported - silently ignore
    }
  }

  // Speak text in Telugu or English
  speak(text: string, lang: 'te' | 'en' = 'te', onEnd?: () => void) {
    if (!this.synth && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }

    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    try {
      this.stop(); // Stop any previous speech or timer first

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Calm, clear cadence suitable for rural users
      utterance.pitch = 1.0;
      this.currentUtterance = utterance;

      // Find best available voice
      const voices = this.synth.getVoices();
      if (lang === 'te') {
        const teluguVoice = voices.find(
          (v) => v.lang.startsWith('te') || v.name.toLowerCase().includes('telugu')
        );
        if (teluguVoice) {
          utterance.voice = teluguVoice;
          utterance.lang = teluguVoice.lang;
        } else {
          // Fallback to Indian English or default voice
          const indianVoice = voices.find(
            (v) => v.lang === 'en-IN' || v.name.toLowerCase().includes('india')
          );
          if (indianVoice) {
            utterance.voice = indianVoice;
            utterance.lang = 'en-IN';
          }
        }
      } else {
        const enVoice = voices.find((v) => v.lang === 'en-IN' || v.lang.startsWith('en'));
        if (enVoice) {
          utterance.voice = enVoice;
          utterance.lang = enVoice.lang;
        }
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      this.synth.speak(utterance);
    } catch {
      this.currentUtterance = null;
      if (onEnd) onEnd();
    }
  }

  // Listen to the user's voice (Crucial for farmers who cannot spell or type names)
  listenSpeech(options: SpeechListenOptions): () => void {
    const { lang, promptSpeech, onListeningStart, onResult, onError, onEnd } = options;

    this.stop();

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      const err =
        lang === 'te'
          ? 'మీ బ్రౌజర్‌లో వాయిస్ రికగ్నిషన్ సపోర్ట్ లేదు (దయచేసి క్రోమ్ వాడండి).'
          : 'Speech recognition is not supported in this browser. Please use Chrome.';
      if (onError) onError(err);
      this.speak(err, lang);
      return () => {};
    }

    const startRecognition = () => {
      try {
        this.playTone('mic');
        const recognition = new SpeechRecognitionClass();
        recognition.lang = lang === 'te' ? 'te-IN' : 'en-IN';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          if (onListeningStart) onListeningStart();
        };

        recognition.onresult = (event: any) => {
          if (event.results && event.results.length > 0) {
            const raw = event.results[0][0].transcript;
            const cleaned = raw.trim().replace(/[.,!?;:]+$/, '');
            onResult(cleaned);
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'no-speech') {
            const msg = lang === 'te' ? 'మాట వినపడలేదు. మళ్లీ చెప్పండి.' : 'No speech heard. Please try again.';
            if (onError) onError(msg);
          } else {
            if (onError) onError(event.error);
          }
        };

        recognition.onend = () => {
          this.activeRecognition = null;
          if (onEnd) onEnd();
        };

        this.activeRecognition = recognition;
        recognition.start();
      } catch (err: any) {
        if (onError) onError(String(err));
        if (onEnd) onEnd();
      }
    };

    if (promptSpeech) {
      this.speak(promptSpeech, lang, () => {
        // Slight pause after speaking before turning mic on so synth audio isn't picked up
        this.promptTimer = setTimeout(startRecognition, 350);
      });
    } else {
      startRecognition();
    }

    // Return cancellation function
    return () => {
      this.stop();
    };
  }

  // Immediately cancel any playing speech and active mic listening
  stop() {
    if (this.promptTimer) {
      clearTimeout(this.promptTimer);
      this.promptTimer = null;
    }

    if (this.currentUtterance) {
      this.currentUtterance.onend = null;
      this.currentUtterance.onerror = null;
      this.currentUtterance = null;
    }

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (this.synth) {
        this.synth.cancel();
      }
    } catch {
      // ignore
    }

    if (this.activeRecognition) {
      try {
        this.activeRecognition.abort();
      } catch {
        // ignore
      }
      this.activeRecognition = null;
    }
  }
}

export const voice = new VoiceService();
