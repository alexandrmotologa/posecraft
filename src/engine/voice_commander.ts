/**
 * Hands-Free Voice Commander for PoseCraft.
 * Uses the Web Speech Recognition API for on-device, hands-free voice control.
 * Supports commands: "start set", "stop set", "reset", "next", "previous", "report", "fullscreen", "mute".
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
  | 'stop_recording';

export interface RecognizedCommand {
  action: VoiceCommandAction;
  phrase: string;
  confidence: number;
  timestamp: number;
}

export class VoiceCommander {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSupported: boolean = false;
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
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          const lastResult = event.results[event.results.length - 1];
          if (lastResult && lastResult.isFinal) {
            const transcript = lastResult[0].transcript.trim().toLowerCase();
            const confidence = lastResult[0].confidence || 0.9;
            this.processTranscript(transcript, confidence);
          }
        };

        this.recognition.onerror = (e: any) => {
          // If network or not-allowed, stop listening
          if (e.error === 'not-allowed') {
            this.stop();
          }
        };

        this.recognition.onend = () => {
          // Auto restart if still marked as listening
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
      this.recognition.start();
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
      this.recognition.stop();
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

    if (transcript.includes('start') || transcript.includes('begin') || transcript.includes('go')) {
      action = 'start_set';
    } else if (transcript.includes('stop') || transcript.includes('pause') || transcript.includes('finish')) {
      action = 'stop_set';
    } else if (transcript.includes('reset') || transcript.includes('clear')) {
      action = 'reset_workout';
    } else if (transcript.includes('next') || transcript.includes('forward')) {
      action = 'next_exercise';
    } else if (transcript.includes('back') || transcript.includes('previous')) {
      action = 'prev_exercise';
    } else if (transcript.includes('report') || transcript.includes('summary') || transcript.includes('stats')) {
      action = 'open_report';
    } else if (transcript.includes('fullscreen') || transcript.includes('full screen')) {
      action = 'toggle_fullscreen';
    } else if (transcript.includes('mute') || transcript.includes('unmute') || transcript.includes('sound')) {
      action = 'toggle_mute';
    } else if (transcript.includes('record') || transcript.includes('video')) {
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
