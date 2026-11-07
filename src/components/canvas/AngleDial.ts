import { Point2D } from '../../engine/types';

export interface AngleDialConfig {
  vertex: Point2D;
  pointA: Point2D;
  pointC: Point2D;
  angleDegrees: number;
  label?: string;
  targetRange?: [number, number]; // e.g. [80, 90]
  radius?: number;
}

export function renderAngleDial(
  ctx: CanvasRenderingContext2D,
  config: AngleDialConfig,
  canvasWidth: number,
  canvasHeight: number
): void {
  const { vertex, pointA, pointC, angleDegrees, label, targetRange, radius = 28 } = config;

  const vx = vertex.x * canvasWidth;
  const vy = vertex.y * canvasHeight;
  const ax = pointA.x * canvasWidth;
  const ay = pointA.y * canvasHeight;
  const cx = pointC.x * canvasWidth;
  const cy = pointC.y * canvasHeight;

  // Angles of ray VA and VC
  const startAngle = Math.atan2(ay - vy, ax - vx);
  const endAngle = Math.atan2(cy - vy, cx - vx);

  let dialColor = '#38bdf8'; // sky blue
  if (targetRange) {
    if (angleDegrees >= targetRange[0] && angleDegrees <= targetRange[1]) {
      dialColor = '#10b981'; // emerald valid
    } else {
      dialColor = '#f59e0b'; // amber
    }
  }

  ctx.save();

  // 1. Arc segment
  ctx.beginPath();
  ctx.arc(vx, vy, radius, startAngle, endAngle);
  ctx.strokeStyle = dialColor;
  ctx.lineWidth = 3;
  ctx.shadowColor = dialColor;
  ctx.shadowBlur = 8;
  ctx.stroke();

  // 2. Arc filled slice
  ctx.beginPath();
  ctx.moveTo(vx, vy);
  ctx.arc(vx, vy, radius, startAngle, endAngle);
  ctx.closePath();
  ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
  ctx.fill();

  // 3. Degree Text Badge
  const bisectorAngle = (startAngle + endAngle) / 2;
  const badgeX = vx + Math.cos(bisectorAngle) * (radius + 18);
  const badgeY = vy + Math.sin(bisectorAngle) * (radius + 18);

  const text = `${Math.round(angleDegrees)}°`;
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  const textMetrics = ctx.measureText(text);
  const badgeWidth = textMetrics.width + 10;
  const badgeHeight = 18;

  // Pill Background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = dialColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(badgeX - badgeWidth / 2, badgeY - badgeHeight / 2, badgeWidth, badgeHeight, 4);
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, badgeX, badgeY);

  if (label) {
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(label, badgeX, badgeY - 14);
  }

  ctx.restore();
}
