import React from 'react';
import {
  Layers,
  Palette,
  Eye,
  Grid,
  ShieldCheck,
  Maximize2,
  Camera,
  RotateCcw,
  Ruler,
  Sun
} from 'lucide-react';

export type ViewerMode = 'textured' | 'solid' | 'wireframe' | 'point_cloud' | 'confidence';

interface ViewerControlsProps {
  mode: ViewerMode;
  onModeChange: (mode: ViewerMode) => void;
  onResetCamera: () => void;
  onToggleFullscreen: () => void;
  onScreenshot: () => void;
  isMeasurementActive: boolean;
  onToggleMeasurement: () => void;
}

export const ViewerControls: React.FC<ViewerControlsProps> = ({
  mode,
  onModeChange,
  onResetCamera,
  onToggleFullscreen,
  onScreenshot,
  isMeasurementActive,
  onToggleMeasurement
}) => {
  const modes: Array<{ id: ViewerMode; label: string; icon: any }> = [
    { id: 'textured', label: 'Textured', icon: Palette },
    { id: 'solid', label: 'Solid', icon: Eye },
    { id: 'wireframe', label: 'Wireframe', icon: Grid },
    { id: 'point_cloud', label: 'Points', icon: Layers },
    { id: 'confidence', label: 'Confidence', icon: ShieldCheck },
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-surface/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-surface-border shadow-glass pointer-events-auto">
      {/* Viewer Render Modes */}
      <div className="flex items-center bg-black/40 p-1 rounded-xl border border-surface-border">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                ${isActive
                  ? m.id === 'confidence'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-px h-6 bg-surface-border mx-1"></div>

      {/* Measurement Mode Toggle */}
      <button
        onClick={onToggleMeasurement}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors
          ${isMeasurementActive
            ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
            : 'bg-surface hover:bg-surface-hover text-slate-300 border-surface-border'
          }
        `}
        title="Measure distance between two points on the 3D surface"
      >
        <Ruler className="w-3.5 h-3.5" />
        <span>Measure</span>
      </button>

      {/* Reset Camera */}
      <button
        onClick={onResetCamera}
        className="p-2 rounded-xl bg-surface hover:bg-surface-hover text-slate-300 hover:text-white border border-surface-border transition-colors"
        title="Reset Camera View"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      {/* Screenshot */}
      <button
        onClick={onScreenshot}
        className="p-2 rounded-xl bg-surface hover:bg-surface-hover text-slate-300 hover:text-white border border-surface-border transition-colors"
        title="Export Screenshot"
      >
        <Camera className="w-4 h-4" />
      </button>

      {/* Fullscreen */}
      <button
        onClick={onToggleFullscreen}
        className="p-2 rounded-xl bg-surface hover:bg-surface-hover text-slate-300 hover:text-white border border-surface-border transition-colors"
        title="Toggle Fullscreen"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  );
};
