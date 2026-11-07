/**
 * Hands-Free Pre-Set Countdown Timer for PoseCraft.
 * Provides auditory and visual countdown before starting an exercise set.
 */
import { audioEngine } from './audio';

export interface CountdownState {
  isActive: boolean;
  secondsRemaining: number;
  initialSeconds: number;
}

export class CountdownTimer {
  private timerId: any = null;
  private state: CountdownState = {
    isActive: false,
    secondsRemaining: 0,
    initialSeconds: 5,
  };
  private onTickCallback: ((state: CountdownState) => void) | null = null;
  private onCompleteCallback: (() => void) | null = null;

  public setOnTick(cb: (state: CountdownState) => void) {
    this.onTickCallback = cb;
  }

  public getState(): CountdownState {
    return { ...this.state };
  }

  public start(seconds: number = 5, onComplete?: () => void) {
    this.cancel();

    this.state = {
      isActive: true,
      secondsRemaining: seconds,
      initialSeconds: seconds,
    };
    this.onCompleteCallback = onComplete || null;
    this.notify();

    // Play initial countdown beep
    audioEngine.playCountdown(false);

    this.timerId = setInterval(() => {
      this.state.secondsRemaining -= 1;

      if (this.state.secondsRemaining > 0) {
        audioEngine.playCountdown(false);
        this.notify();
      } else {
        // Finished! Play start chime
        audioEngine.playCountdown(true);
        this.cancel();
        this.onCompleteCallback?.();
      }
    }, 1000);
  }

  public cancel() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    const wasActive = this.state.isActive;
    this.state.isActive = false;
    this.state.secondsRemaining = 0;
    if (wasActive) {
      this.notify();
    }
  }

  private notify() {
    this.onTickCallback?.({ ...this.state });
  }
}

export const countdownTimer = new CountdownTimer();
