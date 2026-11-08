import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Landmark } from '../../engine/types';
import { orbit3dEngine, AnatomicalViewPreset } from '../../engine/orbit3d';
import { Rotate3d, Compass, Maximize2, Minimize2, X, RefreshCw } from 'lucide-react';

interface Orbit3DViewProps {
  worldLandmarks?: Landmark[];
  isOpen: boolean;
  onClose: () => void;
}

export const Orbit3DView: React.FC<Orbit3DViewProps> = ({
  worldLandmarks,
  isOpen,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen || isMinimized || !canvasRef.current || !worldLandmarks) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    orbit3dEngine.render(ctx, worldLandmarks, canvas.width, canvas.height);
  }, [isOpen, isMinimized, worldLandmarks]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      orbit3dEngine.rotate(dx * 0.015, dy * 0.015);

      if (canvasRef.current && worldLandmarks) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          orbit3dEngine.render(ctx, worldLandmarks, canvasRef.current.width, canvasRef.current.height);
        }
      }
    },
    [isDragging, worldLandmarks]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      orbit3dEngine.zoom(-e.deltaY * 0.2);
      if (canvasRef.current && worldLandmarks) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          orbit3dEngine.render(ctx, worldLandmarks, canvasRef.current.width, canvasRef.current.height);
        }
      }
    },
    [worldLandmarks]
  );

  const applyPreset = (preset: AnatomicalViewPreset) => {
    orbit3dEngine.applyPreset(preset);
    if (canvasRef.current && worldLandmarks) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        orbit3dEngine.render(ctx, worldLandmarks, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const resetCamera = () => {
    orbit3dEngine.resetCamera();
    if (canvasRef.current && worldLandmarks) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        orbit3dEngine.render(ctx, worldLandmarks, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-40 transition-all duration-200 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col ${
        isMinimized
          ? 'bottom-4 right-4 w-64 h-12'
          : 'bottom-4 right-4 w-80 h-96 sm:w-96 sm:h-[420px]'
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/60 select-none">
        <div className="flex items-center gap-2">
          <Rotate3d className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            3D Orbit Viewport
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono">
            Metric 3D
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* 3D Canvas Area */}
          <div
            className="relative flex-1 bg-slate-950 cursor-grab active:cursor-grabbing overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <canvas
              ref={canvasRef}
              width={384}
              height={320}
              className="w-full h-full block"
            />

            {/* Hint overlay */}
            <div className="absolute top-2 left-2 pointer-events-none text-[10px] font-mono text-slate-400 bg-slate-900/70 px-2 py-0.5 rounded border border-slate-800">
              Drag to orbit • Scroll to zoom
            </div>

            {/* Reset button */}
            <button
              onClick={resetCamera}
              className="absolute top-2 right-2 p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-xs flex items-center gap-1 shadow"
              title="Reset View"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Preset Buttons Footer */}
          <div className="p-2 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-1 text-[11px]">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Compass className="w-3 h-3 text-cyan-400" />
              Presets:
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => applyPreset('frontal')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors"
                title="Frontal Coronal View (Valgus & Symmetry)"
              >
                Front
              </button>
              <button
                onClick={() => applyPreset('sagittal_left')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors"
                title="Left Sagittal View (Depth & Lumbar Curve)"
              >
                Left
              </button>
              <button
                onClick={() => applyPreset('sagittal_right')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors"
                title="Right Sagittal View"
              >
                Right
              </button>
              <button
                onClick={() => applyPreset('transverse_top')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors"
                title="Top-Down Transverse View (Rotation & Pelvic Flare)"
              >
                Top
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
