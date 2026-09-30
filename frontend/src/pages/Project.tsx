import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Compass,
  ShieldCheck,
  Ruler,
  BarChart3,
  Download,
  FileCode,
  ArrowLeft,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { projectService, ProjectDetailResponse } from '../services/projectService';
import { evaluationService } from '../services/evaluationService';
import { ThreeViewer } from '../components/viewer/ThreeViewer';
import { MeasurementPanel } from '../components/measurements/MeasurementPanel';
import { ViewCoverageWidget } from '../components/analysis/ViewCoverageWidget';
import { ViewRecommendationCard } from '../components/analysis/ViewRecommendationCard';
import { ImageQualityCard } from '../components/analysis/ImageQualityCard';
import { Point3D, EvaluationResult } from '../types';

export const Project: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ProjectDetailResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'viewer' | 'overview' | 'analysis' | 'confidence' | 'measurements' | 'evaluation' | 'files'>('viewer');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedPointA, setSelectedPointA] = useState<Point3D | null>(null);
  const [selectedPointB, setSelectedPointB] = useState<Point3D | null>(null);
  const [distanceDisplay, setDistanceDisplay] = useState<string | null>(null);

  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const loadProject = () => {
    if (!id) return;
    setIsLoading(true);
    projectService.getProject(id)
      .then((res) => {
        setData(res);
        evaluationService.getLatestEvaluation(id).then(setEvaluation).catch(() => {});
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  const handlePointSelected = (point: Point3D) => {
    if (!selectedPointA) {
      setSelectedPointA(point);
    } else if (!selectedPointB) {
      setSelectedPointB(point);
    } else {
      setSelectedPointA(point);
      setSelectedPointB(null);
      setDistanceDisplay(null);
    }
  };

  const handleRunEvaluation = async () => {
    if (!id) return;
    setIsEvaluating(true);
    try {
      const res = await evaluationService.evaluateProject(id);
      setEvaluation(res);
    } catch (err: any) {
      alert("Evaluation failed: " + err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400 font-mono text-sm">
        Loading workspace...
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="p-8 border-l-4 border-rose-500 bg-rose-500/10 text-rose-300 font-mono text-sm space-y-3">
        <div className="font-bold">Failed to load project:</div>
        <div>{errorMsg || "Project not found"}</div>
        <Link to="/" className="text-white hover:underline block mt-4">Return to dashboard</Link>
      </div>
    );
  }

  const rec = data.latest_reconstruction;

  const tabs = [
    { id: 'viewer', label: '3D Viewer', icon: Box },
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'analysis', label: 'View Analysis', icon: Compass },
    { id: 'confidence', label: 'Confidence', icon: ShieldCheck },
    { id: 'measurements', label: 'Measurements', icon: Ruler },
    { id: 'evaluation', label: 'Evaluation', icon: BarChart3 },
    { id: 'files', label: 'Model Files', icon: FileCode },
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="mb-12 border-b border-surface-border pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 text-sm">
              <ArrowLeft className="w-4 h-4" />
              Back to dashboard
            </Link>
            <h1 className="text-4xl font-serif tracking-tight text-white mb-2">{data.project.name}</h1>
            <div className="text-sm font-mono text-slate-500 flex items-center gap-4">
              <span>{data.project.id}</span>
              <span>&middot;</span>
              <span>{data.images.length} Input Viewpoints</span>
              <span>&middot;</span>
              <span>{new Date(data.project.updated_at).toLocaleString()}</span>
              <span className={`px-2 py-0.5 border ${data.project.status === 'completed' ? 'border-brand-400 text-brand-400' : 'border-slate-500 text-slate-400'}`}>
                {data.project.status}
              </span>
            </div>
          </div>

          {rec && (
            <div className="flex gap-4">
              <a href={rec.model_urls.glb} download className="px-4 py-2 border border-brand-400 text-brand-400 hover:bg-brand-400 hover:text-black transition-colors text-sm flex items-center gap-2">
                <Download className="w-4 h-4" /> GLB
              </a>
              <a href={rec.model_urls.ply} download className="px-4 py-2 border border-surface-border text-slate-300 hover:border-slate-400 transition-colors text-sm flex items-center gap-2">
                <Download className="w-4 h-4" /> PLY
              </a>
            </div>
          )}
        </div>
      </header>

      <div className="flex gap-8 border-b border-surface-border mb-12 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 text-sm whitespace-nowrap transition-colors flex items-center gap-2 relative ${
                isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {isActive && <span className="absolute bottom-0 left-0 w-full h-[1px] bg-brand-400"></span>}
            </button>
          );
        })}
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'viewer' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-3">
              {rec ? (
                <div className="border border-surface-border p-1 bg-[#0a0a0a]">
                  <ThreeViewer
                    modelUrl={rec.model_urls.glb}
                    confidenceModelUrl={rec.model_urls.confidence_glb}
                    confidenceSummary={rec.spatial_confidence}
                    onPointSelected={handlePointSelected}
                    selectedPointA={selectedPointA}
                    selectedPointB={selectedPointB}
                    distanceResult={distanceDisplay}
                  />
                </div>
              ) : (
                <div className="border border-surface-border h-[600px] flex flex-col items-center justify-center p-12 text-center">
                  <h3 className="text-xl font-serif text-white mb-4">No 3D model generated</h3>
                  <p className="text-sm text-slate-400 mb-8 max-w-md">Run reconstruction to generate 3D mesh geometry from the uploaded viewpoints.</p>
                  <Link to="/new" className="px-6 py-2 bg-white text-black text-sm hover:bg-slate-200 transition-colors">
                    Start reconstruction
                  </Link>
                </div>
              )}
            </div>

            <div className="space-y-8">
              <MeasurementPanel
                projectId={data.project.id}
                reconstructionId={rec?.id}
                pointA={selectedPointA}
                pointB={selectedPointB}
                onClearPoints={() => {
                  setSelectedPointA(null);
                  setSelectedPointB(null);
                  setDistanceDisplay(null);
                }}
                onMeasurementCalculated={setDistanceDisplay}
              />

              {rec && (
                <div className="border-t border-surface-border pt-8 space-y-4">
                  <h3 className="text-sm font-medium text-white mb-4">Reconstruction metadata</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Engine</dt>
                      <dd className="text-brand-400 text-right w-1/2">{rec.engine_used}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Vertices</dt>
                      <dd className="text-white">{rec.vertex_count.toLocaleString()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Faces</dt>
                      <dd className="text-white">{rec.face_count.toLocaleString()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Processing Time</dt>
                      <dd className="text-white">{rec.processing_time_sec}s</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Peak Memory</dt>
                      <dd className="text-white">{rec.memory_peak_mb} MB</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="border-l border-surface-border pl-6">
                <div className="text-sm text-slate-500 mb-2">Input Views</div>
                <div className="text-3xl font-serif text-white">{data.images.length}</div>
              </div>
              <div className="border-l border-surface-border pl-6">
                <div className="text-sm text-slate-500 mb-2">View Coverage</div>
                <div className="text-3xl font-serif text-white">{data.view_analysis?.view_coverage || 0}%</div>
              </div>
              <div className="border-l border-surface-border pl-6">
                <div className="text-sm text-slate-500 mb-2">Geometry Confidence</div>
                <div className="text-3xl font-serif text-brand-400">{rec?.geometry_confidence || 0}%</div>
              </div>
              <div className="border-l border-surface-border pl-6">
                <div className="text-sm text-slate-500 mb-2">Visual Quality</div>
                <div className="text-3xl font-serif text-white">{rec?.visual_quality || 0}%</div>
              </div>
            </div>

            <div className="border border-surface-border p-6 max-w-3xl">
              <h3 className="text-sm font-medium text-white mb-2">Geometry Confidence vs Visual Quality</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Geometry Confidence ({rec?.geometry_confidence || 0}%) measures how strongly the 3D surface is supported by actual visual ray triangulation and feature evidence from the {data.images.length} viewpoints. Visual Quality ({rec?.visual_quality || 0}%) represents the aesthetic surface continuity and texture resolution. A model can appear photorealistic while possessing uncertain or unobserved geometry in blind spots.
              </p>
            </div>

            <section>
              <h3 className="text-lg font-serif text-white mb-6">Ingested viewpoints</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {data.images.map((img, idx) => (
                  <ImageQualityCard key={img.id} image={img} index={idx} />
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-12">
            {data.view_analysis ? (
              <ViewCoverageWidget coverage={data.view_analysis} />
            ) : (
              <div className="p-8 border border-surface-border text-center text-sm text-slate-500">
                No view coverage analysis available.
              </div>
            )}
            {data.view_recommendation && (
              <ViewRecommendationCard recommendation={data.view_recommendation} />
            )}
          </div>
        )}

        {activeTab === 'confidence' && (
          <div className="space-y-12">
            {rec?.spatial_confidence ? (
              <div className="space-y-12">
                <section>
                  <h3 className="text-xl font-serif text-white mb-2">Spatial Uncertainty</h3>
                  <p className="text-sm text-slate-400 mb-8">Calculated per-vertex from multi-view ray intersections and camera angular distances.</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                      <div className="text-sm text-emerald-400 mb-2">High Confidence</div>
                      <div className="text-3xl font-serif text-white mb-1">{rec.spatial_confidence.high_percentage}%</div>
                      <div className="text-xs text-slate-500">Observed from ≥ 2 rays</div>
                    </div>
                    <div>
                      <div className="text-sm text-brand-400 mb-2">Medium Confidence</div>
                      <div className="text-3xl font-serif text-white mb-1">{rec.spatial_confidence.medium_percentage}%</div>
                      <div className="text-xs text-slate-500">Glancing or single-view</div>
                    </div>
                    <div>
                      <div className="text-sm text-rose-400 mb-2">Low Confidence</div>
                      <div className="text-3xl font-serif text-white mb-1">{rec.spatial_confidence.low_percentage}%</div>
                      <div className="text-xs text-slate-500">Interpolated evidence</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 mb-2">Unknown</div>
                      <div className="text-3xl font-serif text-white mb-1">{rec.spatial_confidence.unknown_percentage}%</div>
                      <div className="text-xs text-slate-500">Occluded blind spot</div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-medium text-white mb-6 uppercase tracking-wider">Surface Quadrant Assessment</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    {Object.entries(rec.spatial_confidence.region_ratings).map(([region, rating]) => (
                      <div key={region} className="border border-surface-border p-4">
                        <div className="text-xs text-slate-500 mb-2">{region}</div>
                        <div className={`text-sm ${
                          rating === 'High' ? 'text-emerald-400' :
                          rating === 'Medium' ? 'text-brand-400' :
                          rating === 'Low' ? 'text-rose-400' : 'text-slate-400'
                        }`}>{rating}</div>
                      </div>
                    ))}
                  </div>
                </section>

                {rec.spatial_confidence.uncertain_regions.length > 0 && (
                  <div className="border-l-2 border-rose-500 pl-6 space-y-4 max-w-2xl">
                    <h4 className="text-sm font-medium text-rose-400">Missing or uncertain geometry detected</h4>
                    <ul className="text-sm text-slate-300 space-y-2 list-disc ml-4">
                      {rec.spatial_confidence.uncertain_regions.map((reg, i) => <li key={i}>{reg}</li>)}
                    </ul>
                    <p className="text-sm text-slate-400 mt-4">Recommendation: Capture additional views in the highlighted quadrants to increase geometric accuracy.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 border border-surface-border text-center text-sm text-slate-500">
                No spatial confidence data available.
              </div>
            )}
          </div>
        )}

        {activeTab === 'measurements' && (
          <div className="max-w-2xl space-y-12">
            <MeasurementPanel
              projectId={data.project.id}
              reconstructionId={rec?.id}
              pointA={selectedPointA}
              pointB={selectedPointB}
              onClearPoints={() => {
                setSelectedPointA(null);
                setSelectedPointB(null);
                setDistanceDisplay(null);
              }}
              onMeasurementCalculated={setDistanceDisplay}
            />

            <div className="border-t border-surface-border pt-8">
              <h3 className="text-sm font-medium text-white mb-4">Scale calibration guidance</h3>
              <ol className="text-sm text-slate-400 space-y-4 list-decimal ml-4">
                <li>Switch to the 3D Viewer tab and click the Measure button.</li>
                <li>Click on two recognizable points on the 3D surface with a known physical distance (e.g. width of a coin).</li>
                <li>Enter the known physical length and click Calibrate Scale to convert all relative model units to real coordinates.</li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'evaluation' && (
          <div className="space-y-12 max-w-4xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif text-white mb-2">Scientific quality evaluation</h2>
                <p className="text-sm text-slate-400">Ground-truth comparison metrics and computational efficiency profile.</p>
              </div>
              <button
                onClick={handleRunEvaluation}
                disabled={isEvaluating}
                className="px-6 py-2 bg-white text-black text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {isEvaluating ? 'Evaluating...' : 'Run evaluation'}
              </button>
            </div>

            {evaluation ? (
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {Object.entries(evaluation.metrics).map(([k, m]) => (
                    <div key={k} className="border-t border-surface-border pt-4">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-medium text-slate-300">{m.name}</span>
                        <span className={`text-xs px-2 py-0.5 border ${
                          m.available ? 'border-brand-400 text-brand-400' : 'border-slate-600 text-slate-500'
                        }`}>
                          {m.status_label}
                        </span>
                      </div>
                      <div className="text-3xl font-serif text-white mb-2">
                        {m.value !== null ? `${m.value} ${m.unit}` : 'N/A'}
                      </div>
                      <p className="text-sm text-slate-500">
                        {m.description}
                      </p>
                    </div>
                  ))}
                </div>

                {evaluation.notes && evaluation.notes.length > 0 && (
                  <div className="border border-surface-border p-6">
                    <h3 className="text-sm font-medium text-white mb-4">Methodology notes</h3>
                    <ul className="text-sm text-slate-400 space-y-2 list-disc ml-4">
                      {evaluation.notes.map((n, i) => <li key={i}>{n}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 border border-surface-border text-center text-sm text-slate-500">
                Click run evaluation to compute quantitative geometry and efficiency metrics for this reconstruction.
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="max-w-3xl space-y-8">
            <h2 className="text-xl font-serif text-white mb-8">Reconstructed 3D assets & exports</h2>
            {rec ? (
              <div className="divide-y divide-surface-border border-t border-b border-surface-border">
                <div className="py-6 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white text-sm mb-1">GLB (Binary glTF 2.0)</div>
                    <div className="text-slate-400 text-sm">Optimized for web delivery, Three.js, and AR viewing</div>
                  </div>
                  <a href={rec.model_urls.glb} download className="text-sm text-brand-400 hover:text-white transition-colors flex items-center gap-2">
                    Download
                  </a>
                </div>

                <div className="py-6 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white text-sm mb-1">Confidence-Color Mapped GLB</div>
                    <div className="text-slate-400 text-sm">3D surface with per-vertex spatial uncertainty colors baked</div>
                  </div>
                  <a href={rec.model_urls.confidence_glb} download className="text-sm text-brand-400 hover:text-white transition-colors flex items-center gap-2">
                    Download
                  </a>
                </div>

                <div className="py-6 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white text-sm mb-1">PLY Polygon File</div>
                    <div className="text-slate-400 text-sm">Standard research point cloud & triangle mesh format</div>
                  </div>
                  <a href={rec.model_urls.ply} download className="text-sm text-brand-400 hover:text-white transition-colors flex items-center gap-2">
                    Download
                  </a>
                </div>

                <div className="py-6 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white text-sm mb-1">Wavefront OBJ</div>
                    <div className="text-slate-400 text-sm">Universal 3D asset compatible with Blender, Unity, and CAD</div>
                  </div>
                  <a href={rec.model_urls.obj} download className="text-sm text-brand-400 hover:text-white transition-colors flex items-center gap-2">
                    Download
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-sm">No models exported yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

