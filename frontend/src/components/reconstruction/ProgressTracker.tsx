import React from 'react';
import { CheckCircle2, Loader2, Circle, AlertCircle, Terminal } from 'lucide-react';
import { ReconstructionJobStatus } from '../../types';

interface ProgressTrackerProps {
  status: ReconstructionJobStatus;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ status }) => {
  const steps = [
    { key: 'VALIDATING', label: 'Image Validation & Resolution Scaling' },
    { key: 'ANALYZING_IMAGES', label: 'Feature Detection & Tensor Transformation' },
    { key: 'ESTIMATING_CAMERAS', label: 'Camera Pose & Multi-View Geometry' },
    { key: 'GENERATING_DEPTH', label: 'Depth Map & Geometric Point Projection' },
    { key: 'BUILDING_POINT_CLOUD', label: 'Point Cloud Fusion & Outlier Removal' },
    { key: 'GENERATING_MESH', label: 'Delaunay Surface Mesh Reconstruction' },
    { key: 'REFINING', label: 'AI Refinement Layer Evaluation' },
    { key: 'EVALUATING', label: 'Spatial Uncertainty & Confidence Mapping' },
  ];

  const getStepStatus = (stepKey: string, stepIndex: number) => {
    if (status.status === 'COMPLETED') return 'completed';
    if (status.status === 'FAILED') {
      if (status.current_step === stepKey) return 'failed';
      return 'pending';
    }

    const currentStepIndex = steps.findIndex((s) => s.key === status.current_step);
    if (currentStepIndex === -1) {
      return status.progress > 0 ? 'completed' : 'pending';
    }

    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Reconstruction Engine Active:</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
              {status.engine}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Status: <span className="text-slate-200 uppercase font-bold">{status.status}</span>
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold font-mono text-accent-cyan">
            {status.progress}%
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Job #{status.id}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden border border-surface-border">
        <div
          className={`h-full transition-all duration-300 ${
            status.status === 'FAILED'
              ? 'bg-rose-500'
              : status.status === 'COMPLETED'
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-brand-600 via-accent-cyan to-brand-400 animate-pulse'
          }`}
          style={{ width: `${Math.max(4, status.progress)}%` }}
        />
      </div>

      {/* Steps List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
        {steps.map((step, idx) => {
          const stepState = getStepStatus(step.key, idx);
          return (
            <div
              key={step.key}
              className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-colors ${
                stepState === 'completed'
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                  : stepState === 'active'
                  ? 'bg-brand-500/10 border-brand-500/30 text-white shadow-sm'
                  : stepState === 'failed'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-black/20 border-surface-border text-slate-400'
              }`}
            >
              {stepState === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
              {stepState === 'active' && <Loader2 className="w-4 h-4 text-accent-cyan animate-spin flex-shrink-0" />}
              {stepState === 'failed' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
              {stepState === 'pending' && <Circle className="w-4 h-4 text-slate-500 flex-shrink-0" />}
              <span className="truncate">{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Error Message if Failed */}
      {status.error_message && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs font-mono space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-rose-400">
            <AlertCircle className="w-4 h-4" /> Reconstruction Error:
          </div>
          <div>{status.error_message}</div>
        </div>
      )}

      {/* Live Terminal Log Stream */}
      {status.logs && status.logs.length > 0 && (
        <div className="rounded-xl bg-[#06070a] border border-surface-border p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 border-b border-surface-border pb-1.5">
            <Terminal className="w-3.5 h-3.5 text-brand-400" />
            <span>Process Standard Log Stream</span>
          </div>
          <div className="max-h-36 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1">
            {status.logs.map((log, i) => (
              <div key={i} className="leading-relaxed">
                <span className="text-slate-500">[{i + 1}]</span> {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
