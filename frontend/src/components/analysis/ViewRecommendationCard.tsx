import React from 'react';
import { Lightbulb, ArrowRight, Target, Sparkles, Navigation } from 'lucide-react';
import { ViewRecommendationResult } from '../../types';

interface ViewRecommendationCardProps {
  recommendation: ViewRecommendationResult;
}

export const ViewRecommendationCard: React.FC<ViewRecommendationCardProps> = ({ recommendation }) => {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-surface-border space-y-4">
      <div className="flex items-center justify-between border-b border-surface-border pb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Next Viewpoint Recommendation</h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
          {recommendation.method}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Missing Region Target */}
        <div className="p-3.5 rounded-xl bg-black/40 border border-surface-border space-y-1">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-rose-400" /> Weak / Unobserved Sector
          </div>
          <div className="text-base font-bold text-rose-300 font-mono">
            {recommendation.missing_region}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Target Azimuth: {recommendation.recommended_azimuth_deg}°
          </div>
        </div>

        {/* Actionable Camera Instruction */}
        <div className="md:col-span-2 p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 space-y-2">
          <div className="text-[11px] text-brand-300 font-mono flex items-center gap-1.5 font-semibold">
            <Navigation className="w-3.5 h-3.5 text-accent-cyan" /> Suggested Camera Motion
          </div>
          <p className="text-sm text-slate-100 font-medium leading-relaxed">
            {recommendation.guidance_text}
          </p>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Expected Coverage Improvement: <strong>+{recommendation.expected_coverage_improvement}%</strong></span>
          </div>
        </div>
      </div>

      {/* Candidate Angle Alternatives */}
      {recommendation.candidate_angles && recommendation.candidate_angles.length > 0 && (
        <div className="pt-2 border-t border-surface-border flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-400">Evaluated Candidates:</span>
          <div className="flex gap-2">
            {recommendation.candidate_angles.map((c) => (
              <span
                key={c.candidate_id}
                className="px-2.5 py-1 rounded-lg bg-surface/90 border border-surface-border text-slate-300"
              >
                {c.label} ({c.azimuth_deg}° / +{c.elevation_deg}°)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
