import React from 'react';
import { Compass, Camera, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { ViewCoverageResult } from '../../types';

interface ViewCoverageWidgetProps {
  coverage: ViewCoverageResult;
}

export const ViewCoverageWidget: React.FC<ViewCoverageWidgetProps> = ({ coverage }) => {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-surface-border space-y-4">
      <div className="flex items-center justify-between border-b border-surface-border pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-accent-cyan" />
          <h3 className="text-sm font-semibold text-white">Multi-View Coverage Analysis</h3>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20">
          Epipolar Geometry
        </span>
      </div>

      {/* Main 5 Metric Badges */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-black/40 border border-surface-border">
          <div className="text-slate-400 text-[11px] mb-1">View Coverage</div>
          <div className="text-lg font-bold text-accent-cyan">{coverage.view_coverage}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">360° Arc Ratio</div>
        </div>

        <div className="p-3 rounded-xl bg-black/40 border border-surface-border">
          <div className="text-slate-400 text-[11px] mb-1">Image Overlap</div>
          <div className="text-lg font-bold text-brand-400">{coverage.image_overlap}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Feature Co-visibility</div>
        </div>

        <div className="p-3 rounded-xl bg-black/40 border border-surface-border">
          <div className="text-slate-400 text-[11px] mb-1">Camera Conf.</div>
          <div className="text-lg font-bold text-emerald-400">{coverage.camera_confidence}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">RANSAC Inliers</div>
        </div>

        <div className="p-3 rounded-xl bg-black/40 border border-surface-border">
          <div className="text-slate-400 text-[11px] mb-1">Feature Density</div>
          <div className={`text-base font-bold ${
            coverage.feature_density === 'High' ? 'text-emerald-400' :
            coverage.feature_density === 'Medium' ? 'text-amber-400' : 'text-rose-400'
          }`}>{coverage.feature_density}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Keypoints per MP</div>
        </div>

        <div className="p-3 rounded-xl bg-black/40 border border-surface-border col-span-2 md:col-span-1">
          <div className="text-slate-400 text-[11px] mb-1">Reconstruct Risk</div>
          <div className={`text-base font-bold ${
            coverage.reconstruction_risk === 'Low' ? 'text-emerald-400' :
            coverage.reconstruction_risk === 'Medium' ? 'text-amber-400' : 'text-rose-400'
          }`}>{coverage.reconstruction_risk}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Geometric Stability</div>
        </div>
      </div>

      {/* Camera Azimuth Compass Diagram */}
      <div className="p-4 rounded-xl bg-black/30 border border-surface-border flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Circular view visualizer */}
        <div className="relative w-36 h-36 rounded-full border border-slate-700/60 flex items-center justify-center flex-shrink-0">
          {/* Target object in center */}
          <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-400/40 flex items-center justify-center text-[10px] font-mono text-brand-300">
            Object
          </div>

          {/* Compass markers */}
          <span className="absolute top-1 text-[9px] font-mono text-slate-500">0° (Front)</span>
          <span className="absolute right-1 text-[9px] font-mono text-slate-500">90°</span>
          <span className="absolute bottom-1 text-[9px] font-mono text-slate-500">180°</span>
          <span className="absolute left-1 text-[9px] font-mono text-slate-500">270°</span>

          {/* Camera nodes on circumference */}
          {coverage.estimated_cameras.map((cam, idx) => {
            const rad = ((cam.azimuth_deg - 90) * Math.PI) / 180;
            const radius = 56; // px
            const x = 72 + radius * Math.cos(rad);
            const y = 72 + radius * Math.sin(rad);

            return (
              <div
                key={idx}
                style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}
                className="absolute w-5 h-5 rounded-full bg-accent-cyan text-black text-[9px] font-mono font-bold flex items-center justify-center shadow-glow-cyan border border-white"
                title={`${cam.image_name} (Azimuth: ${cam.azimuth_deg}°, Elevation: ${cam.elevation_deg}°)`}
              >
                {idx + 1}
              </div>
            );
          })}
        </div>

        {/* Sector Coverage Breakdown */}
        <div className="flex-1 space-y-2 text-xs font-mono">
          <div>
            <span className="text-slate-400">Observed Sectors ({coverage.covered_sectors.length}/8):</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {coverage.covered_sectors.map((sec, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px]">
                  ✓ {sec}
                </span>
              ))}
            </div>
          </div>

          {coverage.uncovered_sectors.length > 0 && (
            <div>
              <span className="text-slate-400">Unobserved Gaps ({coverage.uncovered_sectors.length}/8):</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {coverage.uncovered_sectors.map((sec, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[11px]">
                    ✕ {sec}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
