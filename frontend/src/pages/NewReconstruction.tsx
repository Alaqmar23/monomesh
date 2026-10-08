import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { projectService } from '../services/projectService';
import { analysisService } from '../services/analysisService';
import { reconstructionService } from '../services/reconstructionService';
import { systemService } from '../services/systemService';
import { ImageDropzone } from '../components/upload/ImageDropzone';
import { ImageQualityCard } from '../components/analysis/ImageQualityCard';
import { ViewCoverageWidget } from '../components/analysis/ViewCoverageWidget';
import { ViewRecommendationCard } from '../components/analysis/ViewRecommendationCard';
import { ProgressTracker } from '../components/reconstruction/ProgressTracker';
import {
  ProjectSummary,
  ProjectImage,
  ImageQualitySummary,
  ViewCoverageResult,
  ViewRecommendationResult,
  ReconstructionJobStatus,
  SystemStatus
} from '../types';

export const NewReconstruction: React.FC = () => {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [projectName, setProjectName] = useState<string>('Sparse Object Reconstruction');
  const [projectDescription, setProjectDescription] = useState<string>('Sparse-view 3D multi-view test capture');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);

  const [uploadedImages, setUploadedImages] = useState<ProjectImage[]>([]);
  const [qualitySummary, setQualitySummary] = useState<ImageQualitySummary | null>(null);
  const [viewCoverage, setViewCoverage] = useState<ViewCoverageResult | null>(null);
  const [viewRecommendation, setViewRecommendation] = useState<ViewRecommendationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [engine, setEngine] = useState<string>('auto');
  const [quality, setQuality] = useState<string>('balanced');
  const [outputFormat, setOutputFormat] = useState<string>('glb');
  const [refinement, setRefinement] = useState<string>('auto');
  const [system, setSystem] = useState<SystemStatus | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ReconstructionJobStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  useEffect(() => {
    systemService.getStatus().then(setSystem).catch(() => {});
  }, []);

  useEffect(() => {
    if (!jobId || !jobStatus || jobStatus.status === 'COMPLETED' || jobStatus.status === 'FAILED') return;

    const interval = setInterval(async () => {
      try {
        const res = await reconstructionService.getStatus(jobId);
        setJobStatus(res);
        if (res.status === 'COMPLETED' || res.status === 'FAILED') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Error polling reconstruction status:", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [jobId, jobStatus?.status]);

  const handleProceedToAnalysis = async () => {
    if (selectedFiles.length !== 1) {
      setErrorMsg("Please select exactly 1 image to proceed.");
      return;
    }
    setErrorMsg(null);
    setIsCreatingProject(true);

    try {
      const proj = await projectService.createProject(projectName, projectDescription);
      setProjectId(proj.id);
      const uploadRes = await projectService.uploadImages(proj.id, selectedFiles);
      setUploadedImages(uploadRes.images);
      setCurrentStep(2);
      runPipelineAnalysis(proj.id);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to stage project and upload images.");
    } finally {
      setIsCreatingProject(false);
    }
  };

  const runPipelineAnalysis = async (pid: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const qSummary = await analysisService.analyzeImages(pid);
      setQualitySummary(qSummary);
      const vCoverage = await analysisService.analyzeViewCoverage(pid);
      setViewCoverage(vCoverage);
      const vRec = await analysisService.getRecommendation(pid);
      setViewRecommendation(vRec);
    } catch (err: any) {
      setErrorMsg(err.message || "Error running visual geometry analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartReconstruction = async () => {
    if (!projectId) return;
    setErrorMsg(null);
    try {
      const res = await reconstructionService.startReconstruction({
        project_id: projectId,
        engine,
        quality,
        output_format: outputFormat,
        refinement
      });
      setJobId(res.job_id);
      setJobStatus({
        id: res.job_id,
        project_id: projectId,
        engine,
        quality,
        output_format: outputFormat,
        refinement,
        status: 'QUEUED',
        progress: 0,
        current_step: 'QUEUED',
        logs: ['Reconstruction job queued.'],
        error_message: null,
        started_at: new Date().toISOString(),
        completed_at: null
      });
      setCurrentStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate reconstruction job.");
    }
  };

  const wizardSteps = [
    { num: 1, label: 'Upload' },
    { num: 2, label: 'Analysis' },
    { num: 3, label: 'Configure' },
    { num: 4, label: 'Reconstruct' },
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <header className="mb-12 border-b border-surface-border pb-6">
        <h1 className="text-3xl font-serif tracking-tight text-white mb-6">New Reconstruction</h1>
        
        <div className="flex items-center gap-8 text-sm font-mono text-slate-500">
          {wizardSteps.map((step) => {
            const isActive = currentStep === step.num;
            const isDone = currentStep > step.num;
            return (
              <div
                key={step.num}
                className={`flex items-center gap-2 ${
                  isActive ? 'text-brand-400' : isDone ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                <span>{step.num.toString().padStart(2, '0')}</span>
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
      </header>

      {errorMsg && (
        <div className="mb-8 p-4 bg-rose-500/10 text-rose-300 text-sm font-mono border-l-2 border-rose-500">
          {errorMsg}
        </div>
      )}

      {currentStep === 1 && (
        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-serif text-white mb-6">Project details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Title</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-transparent border-b border-surface-border py-2 text-white focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="Artifact #42"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Description</label>
                <input
                  type="text"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="w-full bg-transparent border-b border-surface-border py-2 text-white focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="3-view baseline test"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-serif text-white mb-2">Source view</h2>
            <p className="text-sm text-slate-400 mb-6">Provide 1 photograph to generate a 3D model.</p>
            
            <ImageDropzone
              onFilesSelected={setSelectedFiles}
              maxFiles={1}
            />

            <div className="mt-8 flex justify-between items-center border-t border-surface-border pt-6">
              <div className="text-sm text-slate-500">
                {selectedFiles.length} views staged
              </div>
              <button
                onClick={handleProceedToAnalysis}
                disabled={selectedFiles.length !== 1 || isCreatingProject}
                className="px-6 py-2 text-sm text-black bg-white hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-400"
              >
                {isCreatingProject ? 'Staging...' : 'Proceed'}
              </button>
            </div>
          </section>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-12">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif text-white">Visual geometry analysis</h2>
              {isAnalyzing && (
                <div className="text-sm text-brand-400 animate-pulse">Analyzing baselines...</div>
              )}
            </div>

            {qualitySummary?.warnings && qualitySummary.warnings.length > 0 && (
              <div className="mb-8 p-4 bg-amber-500/10 text-amber-200 text-sm font-mono border-l-2 border-amber-500 space-y-2">
                <div className="font-semibold text-amber-400">Quality observations</div>
                <ul className="list-disc pl-5">
                  {qualitySummary.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {uploadedImages.map((img, idx) => (
                <ImageQualityCard key={img.id} image={img} index={idx} />
              ))}
            </div>

            {viewCoverage && <ViewCoverageWidget coverage={viewCoverage} />}
            {viewRecommendation && <ViewRecommendationCard recommendation={viewRecommendation} />}

          </section>

          <div className="flex justify-between items-center border-t border-surface-border pt-6">
            <button
              onClick={() => setCurrentStep(1)}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-2 text-sm text-black bg-white hover:bg-slate-200 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-serif text-white mb-6">Engine configuration</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-4">Reconstruction Engine</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { id: 'auto', label: 'Automatic', desc: 'Hardware-aware selection' },
                    { id: 'vggt', label: 'VGGT', desc: 'Geometric Transformer (CUDA)' },
                    { id: 'classical', label: 'Classical', desc: 'Epipolar Stereo (CPU)' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setEngine(opt.id)}
                      className={`text-left p-4 border ${engine === opt.id ? 'border-brand-400 bg-brand-400/5 text-white' : 'border-surface-border text-slate-400 hover:border-slate-500'} transition-colors`}
                    >
                      <div className="text-sm font-medium mb-1">{opt.label}</div>
                      <div className="text-xs text-slate-500">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-4">Target Quality</h3>
                <div className="flex gap-4">
                  {['fast', 'balanced', 'high'].map(q => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={`px-4 py-2 text-sm capitalize border ${quality === q ? 'border-brand-400 text-brand-400' : 'border-surface-border text-slate-400 hover:border-slate-500'} transition-colors`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-4">Output Format</h3>
                <div className="flex gap-4">
                  {['glb', 'ply', 'obj'].map(f => (
                    <button
                      key={f}
                      onClick={() => setOutputFormat(f)}
                      className={`px-4 py-2 text-sm uppercase border ${outputFormat === f ? 'border-brand-400 text-brand-400' : 'border-surface-border text-slate-400 hover:border-slate-500'} transition-colors`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-between items-center border-t border-surface-border pt-6">
            <button
              onClick={() => setCurrentStep(2)}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleStartReconstruction}
              className="px-6 py-2 text-sm text-black bg-brand-400 hover:bg-brand-300 transition-colors"
            >
              Start reconstruction
            </button>
          </div>
        </div>
      )}

      {currentStep === 4 && (
        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-serif text-white mb-6">Reconstruction in progress</h2>
            {jobStatus && <ProgressTracker status={jobStatus} />}

            {jobStatus?.status === 'COMPLETED' && (
              <div className="mt-12 p-8 border border-surface-border text-center">
                <h3 className="text-lg font-serif text-white mb-2">Reconstruction complete</h3>
                <p className="text-sm text-slate-400 mb-8">Geometry reconstructed and confidence metrics compiled.</p>
                <button
                  onClick={() => navigate(`/project/${projectId}`)}
                  className="px-6 py-2 text-sm text-black bg-white hover:bg-slate-200 transition-colors"
                >
                  View workstation
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
