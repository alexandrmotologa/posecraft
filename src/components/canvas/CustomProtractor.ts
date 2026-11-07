import { Point2D } from '../../engine/types';
import { calculateAngle2D } from '../../engine/geometry';

export class CustomProtractor {
  private points: Point2D[] = [];
  public isActive: boolean = false;

  public get pointsList(): Point2D[] {
    return [...this.points];
  }

  public get angleDegrees(): number | null {
    return this.getAngle();
  }

  public addPoint(point: Point2D): void {
    if (this.points.length >= 3) {
      this.points = [point];
    } else {
      this.points.push(point);
    }
  }

  public clear(): void {
    this.points = [];
  }

  public getAngle(): number | null {
    if (this.points.length === 3) {
      return Math.round(calculateAngle2D(this.points[0], this.points[1], this.points[2]));
    }
    return null;
  }

  public render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (this.points.length === 0) return;

    ctx.save();
    ctx.lineWidth = 2.5;

    // Draw lines between points
    if (this.points.length >= 2) {
      ctx.strokeStyle = '#f43f5e'; // rose
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.points[0].x * canvasWidth, this.points[0].y * canvasHeight);
      ctx.lineTo(this.points[1].x * canvasWidth, this.points[1].y * canvasHeight);
      if (this.points.length === 3) {
        ctx.lineTo(this.points[2].x * canvasWidth, this.points[2].y * canvasHeight);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw vertex points
    this.points.forEach((p, idx) => {
      const px = p.x * canvasWidth;
      const py = p.y * canvasHeight;

      ctx.beginPath();
      ctx.arc(px, py, idx === 1 ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = idx === 1 ? '#fb7185' : '#fda4af';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(idx === 1 ? 'Vertex B' : idx === 0 ? 'Point A' : 'Point C', px + 8, py - 4);
    });

    // Render calculated angle badge if 3 points are placed
    const angle = this.getAngle();
    if (angle !== null && this.points.length === 3) {
      const vx = this.points[1].x * canvasWidth;
      const vy = this.points[1].y * canvasHeight;

      const text = `Manual Angle: ${angle}°`;
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      const w = ctx.measureText(text).width + 12;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(vx - w / 2, vy - 35, w, 22, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fecdd3';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, vx, vy - 24);
    }

    ctx.restore();
  }
}
