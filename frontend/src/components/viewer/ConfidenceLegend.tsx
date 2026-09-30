import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

interface ConfidenceLegendProps {
  summary?: {
    high_percentage: number;
    medium_percentage: number;
    low_percentage: number;
    unknown_percentage: number;
    region_ratings: Record<string, string>;
    uncertain_regions: string[];
  };
}

export const ConfidenceLegend: React.FC<ConfidenceLegendProps> = ({ summary }) => {
  return (
    <div className="absolute top-4 left-4 z-10 bg-surface/90 backdrop-blur-md p-4 rounded-xl border border-surface-border shadow-glass text-xs font-mono w-64 space-y-3 pointer-events-auto">
      <div className="flex items-center justify-between border-b border-surface-border pb-2">
        <span className="font-semibold text-white flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Spatial Confidence
        </span>
        <span className="text-[10px] text-slate-400">Vertex Map</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span>
            <span className="text-slate-300">High Confidence</span>
          </div>
          <span className="text-emerald-400 font-bold">{summary ? `${summary.high_percentage}%` : '≥ 70%'}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm"></span>
            <span className="text-slate-300">Medium Confidence</span>
          </div>
          <span className="text-amber-400 font-bold">{summary ? `${summary.medium_percentage}%` : '40–70%'}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm"></span>
            <span className="text-slate-300">Low / Inferred</span>
          </div>
          <span className="text-rose-400 font-bold">{summary ? `${summary.low_percentage}%` : '20–40%'}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shadow-sm"></span>
            <span className="text-slate-300">Unobserved (Unknown)</span>
          </div>
          <span className="text-slate-400 font-bold">{summary ? `${summary.unknown_percentage}%` : '< 20%'}</span>
        </div>
      </div>

      {summary?.region_ratings && Object.keys(summary.region_ratings).length > 0 && (
        <div className="pt-2 border-t border-surface-border">
          <div className="text-[10px] uppercase text-slate-400 font-semibold mb-1">
            Quadrant Assessment
          </div>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            {Object.entries(summary.region_ratings).map(([region, rating]) => (
              <div key={region} className="flex justify-between bg-black/30 px-1.5 py-0.5 rounded">
                <span className="text-slate-400">{region}:</span>
                <span className={
                  rating === 'High' ? 'text-emerald-400' :
                  rating === 'Medium' ? 'text-amber-400' :
                  rating === 'Low' ? 'text-rose-400' : 'text-slate-400'
                }>{rating}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary?.uncertain_regions && summary.uncertain_regions.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg text-[11px] text-rose-300 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-400" />
          <span>Uncertain: {summary.uncertain_regions.join(', ')}</span>
        </div>
      )}
    </div>
  );
};
