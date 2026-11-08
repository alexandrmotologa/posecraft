/**
 * Hands-Free Voice Commander for PoseCraft.
 * Uses the Web Speech Recognition API with bilingual English (en-US) and Romanian (ro-RO) support.
 * Supports commands: "start set", "stop set", "reset", "next", "previous", "report", "fullscreen", "mute", "orbit 3d", "sonification".
 */

export type VoiceCommandAction =
  | 'start_set'
  | 'stop_set'
  | 'reset_workout'
  | 'next_exercise'
  | 'prev_exercise'
  | 'open_report'
  | 'toggle_fullscreen'
  | 'toggle_mute'
  | 'start_recording'
  | 'stop_recording'
  | 'toggle_orbit3d'
  | 'toggle_sonification';

export interface RecognizedCommand {
  action: VoiceCommandAction;
  phrase: string;
  confidence: number;
  timestamp: number;
}

export type VoiceLanguage = 'en-US' | 'ro-RO';

export class VoiceCommander {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSupported: boolean = false;
  private currentLanguage: VoiceLanguage = 'en-US';
  private onCommandCallback: ((cmd: RecognizedCommand) => void) | null = null;
  private onStatusChangeCallback: ((listening: boolean) => void) | null = null;
  private restartTimeout: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.isSupported = true;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = this.currentLanguage;

        this.recognition.onresult = (event: any) => {
          const lastResult = event.results[event.results.length - 1];
          if (lastResult && lastResult.isFinal) {
            const transcript = lastResult[0].transcript.trim().toLowerCase();
            const confidence = lastResult[0].confidence || 0.9;
            this.processTranscript(transcript, confidence);
          }
        };

        this.recognition.onerror = (e: any) => {
          if (e.error === 'not-allowed') {
            this.stop();
          }
        };

        this.recognition.onend = () => {
          if (this.isListening) {
            clearTimeout(this.restartTimeout);
            this.restartTimeout = setTimeout(() => {
              try {
                this.recognition.start();
              } catch {
                // Ignore already started
              }
            }, 300);
          }
        };
      }
    }
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getLanguage(): VoiceLanguage {
    return this.currentLanguage;
  }

  public setLanguage(lang: VoiceLanguage) {
    this.currentLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
      if (this.isListening) {
        // Restart with new language
        this.recognition.stop();
      }
    }
  }

  public setOnCommand(cb: (cmd: RecognizedCommand) => void) {
    this.onCommandCallback = cb;
  }

  public setOnStatusChange(cb: (listening: boolean) => void) {
    this.onStatusChangeCallback = cb;
  }

  public start() {
    if (!this.isSupported || this.isListening) return;
    try {
      this.isListening = true;
      if (this.recognition) {
        this.recognition.lang = this.currentLanguage;
        this.recognition.start();
      }
      this.onStatusChangeCallback?.(true);
    } catch {
      this.isListening = false;
      this.onStatusChangeCallback?.(false);
    }
  }

  public stop() {
    if (!this.isSupported || !this.isListening) return;
    this.isListening = false;
    clearTimeout(this.restartTimeout);
    try {
      this.recognition?.stop();
    } catch {
      // Ignored
    }
    this.onStatusChangeCallback?.(false);
  }

  public toggle(): boolean {
    if (this.isListening) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public processTranscript(transcript: string, confidence: number) {
    let action: VoiceCommandAction | null = null;
    const t = transcript.toLowerCase();

    // 1. Start set (English + Romanian)
    if (
      t.includes('start') ||
      t.includes('begin') ||
      t.includes('go') ||
      t.includes('porneste') ||
      t.includes('pornește') ||
      t.includes('incepe') ||
      t.includes('începe')
    ) {
      action = 'start_set';
    }
    // 2. Stop set
    else if (
      t.includes('stop') ||
      t.includes('pause') ||
      t.includes('finish') ||
      t.includes('opreste') ||
      t.includes('oprește') ||
      t.includes('pauza') ||
      t.includes('pauză')
    ) {
      action = 'stop_set';
    }
    // 3. Reset
    else if (
      t.includes('reset') ||
      t.includes('clear') ||
      t.includes('sterge') ||
      t.includes('șterge') ||
      t.includes('resetare')
    ) {
      action = 'reset_workout';
    }
    // 4. Next exercise
    else if (
      t.includes('next') ||
      t.includes('forward') ||
      t.includes('urmatorul') ||
      t.includes('următorul') ||
      t.includes('inainte') ||
      t.includes('înainte')
    ) {
      action = 'next_exercise';
    }
    // 5. Previous exercise
    else if (
      t.includes('back') ||
      t.includes('previous') ||
      t.includes('anterior') ||
      t.includes('inapoi') ||
      t.includes('înapoi')
    ) {
      action = 'prev_exercise';
    }
    // 6. Open report
    else if (
      t.includes('report') ||
      t.includes('summary') ||
      t.includes('stats') ||
      t.includes('raport') ||
      t.includes('rezumat') ||
      t.includes('statistici')
    ) {
      action = 'open_report';
    }
    // 7. Toggle fullscreen
    else if (
      t.includes('fullscreen') ||
      t.includes('full screen') ||
      t.includes('ecran complet') ||
      t.includes('ecran')
    ) {
      action = 'toggle_fullscreen';
    }
    // 8. Toggle 3D Orbit
    else if (
      t.includes('orbit') ||
      t.includes('3d') ||
      t.includes('schelet') ||
      t.includes('model')
    ) {
      action = 'toggle_orbit3d';
    }
    // 9. Toggle Sonification
    else if (
      t.includes('sonificare') ||
      t.includes('pitch') ||
      t.includes('biofeedback')
    ) {
      action = 'toggle_sonification';
    }
    // 10. Toggle mute
    else if (
      t.includes('mute') ||
      t.includes('unmute') ||
      t.includes('sunet') ||
      t.includes('mut')
    ) {
      action = 'toggle_mute';
    }
    // 11. Start recording
    else if (
      t.includes('record') ||
      t.includes('video') ||
      t.includes('inregistrare') ||
      t.includes('înregistrare') ||
      t.includes('filmeaza') ||
      t.includes('filmează')
    ) {
      action = 'start_recording';
    }

    if (action && this.onCommandCallback) {
      this.onCommandCallback({
        action,
        phrase: transcript,
        confidence,
        timestamp: Date.now(),
      });
    }
  }
}

export const voiceCommander = new VoiceCommander();
