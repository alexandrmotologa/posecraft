import { Landmark } from './types';

export class KalmanFilter1D {
  private x: number; // estimated state
  private p: number; // estimation error covariance
  private q: number; // process noise covariance
  private r: number; // measurement noise covariance
  private k: number = 0; // Kalman gain
  private initialized: boolean = false;

  constructor(processNoise: number = 0.005, measurementNoise: number = 0.02) {
    this.x = 0;
    this.p = 1;
    this.q = processNoise;
    this.r = measurementNoise;
  }

  public update(measurement: number): number {
    if (!this.initialized) {
      this.x = measurement;
      this.p = 1;
      this.initialized = true;
      return measurement;
    }

    // Prediction step
    this.p = this.p + this.q;

    // Adaptive noise adjustment based on innovation
    const innovation = Math.abs(measurement - this.x);
    const adaptiveQ = innovation > 0.05 ? this.q * 5 : this.q;

    // Measurement update step
    this.k = (this.p + adaptiveQ) / (this.p + adaptiveQ + this.r);
    this.x = this.x + this.k * (measurement - this.x);
    this.p = (1 - this.k) * (this.p + adaptiveQ);

    return this.x;
  }

  public reset(): void {
    this.initialized = false;
    this.p = 1;
    this.x = 0;
  }
}

export class LandmarkKalmanFilter {
  private filtersX: Map<number, KalmanFilter1D> = new Map();
  private filtersY: Map<number, KalmanFilter1D> = new Map();
  private filtersZ: Map<number, KalmanFilter1D> = new Map();

  constructor(processNoise: number = 0.004, measurementNoise: number = 0.015) {
    for (let i = 0; i < 33; i++) {
      this.filtersX.set(i, new KalmanFilter1D(processNoise, measurementNoise));
      this.filtersY.set(i, new KalmanFilter1D(processNoise, measurementNoise));
      this.filtersZ.set(i, new KalmanFilter1D(processNoise * 1.5, measurementNoise * 2.0));
    }
  }

  public filter(landmarks: Landmark[]): Landmark[] {
    if (!landmarks || landmarks.length === 0) return [];

    return landmarks.map((lm, idx) => {
      const fx = this.filtersX.get(idx);
      const fy = this.filtersY.get(idx);
      const fz = this.filtersZ.get(idx);

      if (!fx || !fy || !fz) return { ...lm };

      return {
        ...lm,
        x: fx.update(lm.x),
        y: fy.update(lm.y),
        z: lm.z !== undefined ? fz.update(lm.z) : 0,
      };
    });
  }

  public reset(): void {
    this.filtersX.forEach(f => f.reset());
    this.filtersY.forEach(f => f.reset());
    this.filtersZ.forEach(f => f.reset());
  }
}
