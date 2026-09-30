import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileCheck,
  Scale,
  ShieldCheck,
  Layers,
  Info
} from 'lucide-react';
import { projectService } from '../services/projectService';
import { evaluationService } from '../services/evaluationService';
import { ProjectSummary, EvaluationResult } from '../types';

export const Evaluation: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    projectService.getProjects()
      .then((projs) => {
        setProjects(projs);
        if (projs.length > 0) {
          setSelectedProjectId(projs[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      evaluationService.getLatestEvaluation(selectedProjectId)
        .then(setEvaluation)
        .catch(() => setEvaluation(null));
    }
  }, [selectedProjectId]);

  const handleEvaluate = async () => {
    if (!selectedProjectId) return;
    setIsEvaluating(true);
    try {
      const res = await evaluationService.evaluateProject(selectedProjectId);
      setEvaluation(res);
    } catch (err: any) {
      alert("Evaluation failed: " + err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent-cyan" />
            <h2 className="text-xl font-bold text-white tracking-tight">Quantitative Evaluation & Ground Truth Benchmarks</h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Separating measured geometric error against ground-truth meshes from estimated spatial confidence.
          </p>
        </div>

        {projects.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-black/40 border border-surface-border rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.image_count} views)
                </option>
              ))}
            </select>

            <button
              onClick={handleEvaluate}
              disabled={isEvaluating}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 transition-colors disabled:opacity-50"
            >
              {isEvaluating ? 'Evaluating...' : 'Re-Evaluate'}
            </button>
          </div>
        )}
      </div>

      {/* Scientific Principle Card */}
      <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white font-mono">
          <Info className="w-4 h-4 text-brand-400" />
          <span>Scientific Standard: Measured Accuracy vs Estimated Confidence</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-mono">
          In peer-reviewed computer vision literature, "Reconstruction Accuracy" (e.g. Chamfer Distance, Hausdorff Distance) can <strong>ONLY</strong> be calculated when a physical or synthetic ground-truth 3D model exists for direct point-to-point geometric comparison. When ground truth is unavailable, Sparse3D reports <strong>"Estimated Geometry Confidence"</strong> derived from multi-view ray inliers and camera baseline angles.
        </p>
      </div>

      {/* Evaluation Metrics Cards */}
      {evaluation ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(evaluation.metrics).map(([key, metric]) => (
              <div
                key={key}
                className="glass-panel p-5 rounded-2xl border border-surface-border space-y-2 text-xs font-mono"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold text-white">{metric.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                    metric.available
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    {metric.status_label}
                  </span>
                </div>

                <div className="text-2xl font-bold font-mono text-accent-cyan">
                  {metric.value !== null ? `${metric.value} ${metric.unit}` : 'N/A'}
                </div>

                <p className="text-[11px] text-slate-400 leading-snug">
                  {metric.description}
                </p>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="glass-panel p-5 rounded-2xl border border-surface-border space-y-2 text-xs font-mono">
            <div className="font-semibold text-slate-200">Evaluation Observations:</div>
            <ul className="space-y-1 text-slate-400">
              {evaluation.notes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-brand-400">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-2xl text-center text-xs font-mono text-slate-400">
          No evaluation computed yet for this project. Click 'Re-Evaluate' above.
        </div>
      )}
    </div>
  );
};
