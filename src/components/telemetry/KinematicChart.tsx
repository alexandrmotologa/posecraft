import React, { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';

interface KinematicChartProps {
  currentValue: number;
  timestampMs: number;
  metricLabel: string;
  metricUnit: string;
}

export const KinematicChart: React.FC<KinematicChartProps> = ({
  currentValue,
  timestampMs,
  metricLabel,
  metricUnit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dataPointsRef = useRef<{ value: number; time: number; velocity: number }[]>([]);
  const peakVelocityRef = useRef<number>(0);

  useEffect(() => {
    const points = dataPointsRef.current;
    let velocity = 0;

    if (points.length > 0) {
      const prev = points[points.length - 1];
      const dt = Math.max(1, (timestampMs - prev.time) / 1000); // delta in seconds
      velocity = Math.abs(currentValue - prev.value) / dt;

      if (velocity > peakVelocityRef.current) {
        peakVelocityRef.current = Math.round(velocity);
      }
    }

    points.push({ value: currentValue, time: timestampMs, velocity });
    if (points.length > 100) {
      points.shift();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Grid Lines
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.lineWidth = 1;
    for (let y = 20; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (points.length < 2) return;

    // Determine scale min and max
    let minVal = Infinity;
    let maxVal = -Infinity;
    points.forEach(p => {
      if (p.value < minVal) minVal = p.value;
      if (p.value > maxVal) maxVal = p.value;
    });

    const range = Math.max(10, maxVal - minVal);
    const padding = 15;

    // 2. Plot Displacement Curve
    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4'; // cyan
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(6, 182, 212, 0.4)';
    ctx.shadowBlur = 6;

    for (let i = 0; i < points.length; i++) {
      const x = (i / (points.length - 1)) * (w - 10) + 5;
      const normalizedY = (points[i].value - minVal) / range;
      const y = h - padding - normalizedY * (h - padding * 2);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 3. Current Point Lead Indicator
    const lastX = w - 5;
    const lastY = h - padding - ((currentValue - minVal) / range) * (h - padding * 2);

    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#22d3ee';
    ctx.fill();

    ctx.shadowBlur = 0;
  }, [currentValue, timestampMs]);

  return (
    <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-3.5 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Real-Time Kinematic Waveform ({metricLabel})</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span>Peak Velocity: <strong className="text-cyan-300">{peakVelocityRef.current} {metricUnit}/s</strong></span>
        </div>
      </div>

      <div className="relative w-full h-24 bg-[#080b12] rounded-lg border border-slate-800/80 overflow-hidden">
        <canvas ref={canvasRef} width={600} height={96} className="w-full h-full object-cover" />
      </div>
    </div>
  );
};
