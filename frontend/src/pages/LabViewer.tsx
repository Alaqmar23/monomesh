import React, { useState, useRef, useEffect } from 'react';
import { projectService } from '../services/projectService';
import { reconstructionService } from '../services/reconstructionService';
import { ThreeViewer } from '../components/viewer/ThreeViewer';
import { ViewerMode } from '../components/viewer/ViewerControls';
import { Upload, Activity, AlertCircle, Loader, Layers } from 'lucide-react';

export const LabViewer: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('IDLE'); // IDLE, UPLOADING, RECONSTRUCTING, COMPLETED, FAILED
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [confModelUrl, setConfModelUrl] = useState<string | null>(null);
  const [genModelUrl, setGenModelUrl] = useState<string | null>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode>('solid');
  const [useGenerative, setUseGenerative] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      if (selected.length < 2) {
        setErrorMsg("Minimum 2 images required for reconstruction.");
        return;
      }
      setFiles(selected);
      setErrorMsg(null);
      setModelUrl(null);
      setConfModelUrl(null);
      setGenModelUrl(null);
    }
  };

  const handleStart = async () => {
    if (files.length < 2) return;
    setStatus('UPLOADING');
    setProgress(10);
    setErrorMsg(null);
    setLogs(['Initializing laboratory session...']);
    
    try {
      // 1. Create Project
      const proj = await projectService.createProject(`Session ${new Date().getTime()}`);
      setProjectId(proj.id);
      
      // 2. Upload Images
      setLogs(prev => [...prev, `Uploading ${files.length} images...`]);
      await projectService.uploadImages(proj.id, files);
      
      // 3. Start Reconstruction (remote worker mode)
      setLogs(prev => [...prev, 'Dispatching task to reconstruction matrix...']);
      const rec = await reconstructionService.startReconstruction({
        project_id: proj.id,
        engine: 'remote', // Prefer remote worker
        run_generative_track: useGenerative,
      });
      
      setJobId(rec.job_id);
      setStatus('RECONSTRUCTING');
      setProgress(20);
    } catch (err: any) {
      setStatus('FAILED');
      setErrorMsg(err.message || 'Upload phase failed.');
    }
  };

  useEffect(() => {
    let interval: any;
    if (status === 'RECONSTRUCTING' && jobId) {
      interval = setInterval(async () => {
        try {
          const res = await reconstructionService.getStatus(jobId);
          setProgress(res.progress);
          if (res.logs && res.logs.length > logs.length) {
            setLogs(res.logs);
          }
          
          if (res.status === 'COMPLETED') {
            setStatus('COMPLETED');
            clearInterval(interval);
            
            // Fetch result to get URLs
            const result = await reconstructionService.getResult(jobId);
            setModelUrl(`http://localhost:8000${result.model_urls.glb}`);
            setConfModelUrl(`http://localhost:8000${result.model_urls.confidence_glb}`);
            if (result.model_urls.generated_glb) {
                setGenModelUrl(`http://localhost:8000${result.model_urls.generated_glb}`);
            }
            setLogs(prev => [...prev, `Mesh acquired. V: ${result.vertex_count}, F: ${result.face_count}`]);
          } else if (res.status === 'FAILED') {
            setStatus('FAILED');
            clearInterval(interval);
            try {
              const errObj = JSON.parse(res.error_message || '{}');
              setErrorMsg(errObj.message || 'Worker processing failed.');
            } catch (e) {
              setErrorMsg(res.error_message || 'Worker processing failed.');
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, jobId, logs]);

  return (
    <div className="flex h-screen w-full bg-black overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-20"></div>
      
      {/* 3D Canvas Area */}
      <div className="absolute inset-0 z-0">
        {modelUrl ? (
          <ThreeViewer
            modelUrl={viewerMode === 'confidence' && confModelUrl ? confModelUrl : modelUrl}
            generatedModelUrl={genModelUrl}
            viewerMode={viewerMode}
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full">
            <div className="viewfinder-crosshair"></div>
            <span className="text-terminal-dim text-sm uppercase tracking-[0.2em]">Awaiting Geometry</span>
          </div>
        )}
      </div>

      {/* Lab UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-between">
        
        {/* Top Header */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="lab-panel p-3">
            <div className="text-terminal-bright font-bold tracking-widest uppercase flex items-center gap-2">
              <Layers size={16} className="text-status-ok" />
              Sparse3D Laboratory
            </div>
            <div className="text-terminal-mid text-xs mt-1">Phase 3 Matrix Active</div>
          </div>
          
          {/* Controls if model loaded */}
          {modelUrl && (
            <div className="lab-panel p-2 flex gap-2">
              {['solid', 'wireframe', 'point_cloud', 'confidence'].map((mode) => (
                <button 
                  key={mode}
                  onClick={() => setViewerMode(mode as ViewerMode)}
                  className={`px-3 py-1 text-xs uppercase border ${viewerMode === mode ? 'border-[#00ff00] text-[#00ff00]' : 'border-transparent text-terminal-mid hover:text-terminal-bright'}`}
                >
                  {mode.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Panel */}
        <div className="flex gap-4 items-end pointer-events-auto">
          <div className="lab-panel p-4 flex flex-col w-[350px]">
            {status === 'IDLE' && (
              <>
                <div className="text-terminal-mid text-xs uppercase mb-3 border-b border-[#222] pb-2">Data Ingestion</div>
                
                {/* Generative Toggle */}
                <div className="mb-4 flex items-center justify-between border border-[#333] p-2 hover:border-[#555] transition-colors cursor-pointer" onClick={() => setUseGenerative(!useGenerative)}>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-terminal-bright tracking-widest uppercase">Generative Extrapolation</span>
                    <span className="text-[10px] text-terminal-mid uppercase">Track B Hallucination</span>
                  </div>
                  <div className={`w-10 h-4 border ${useGenerative ? 'border-status-warn' : 'border-[#444]'} relative transition-colors`}>
                    <div className={`absolute top-0 bottom-0 w-4 bg-${useGenerative ? 'status-warn' : '[#444]'} transition-all ${useGenerative ? 'right-0' : 'left-0'}`}></div>
                  </div>
                </div>

                <input 
                  type="file" 
                  multiple 
                  accept="image/jpeg,image/png"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 border border-[#444] p-3 text-terminal-bright hover:border-[#00ff00] transition-colors w-full"
                >
                  <Upload size={16} />
                  {files.length > 0 ? `${files.length} images selected` : 'SELECT IMAGES'}
                </button>
                
                {files.length >= 2 && (
                  <button 
                    onClick={handleStart}
                    className="mt-3 bg-[#00ff00] text-black font-bold uppercase p-3 hover:bg-[#00cc00] w-full"
                  >
                    Initialize Scan
                  </button>
                )}
              </>
            )}

            {(status === 'UPLOADING' || status === 'RECONSTRUCTING') && (
              <>
                <div className="text-status-warn text-xs uppercase mb-3 flex items-center gap-2 border-b border-[#222] pb-2">
                  <Loader size={12} className="animate-spin" />
                  Processing Job: {jobId?.split('_')[1] || 'Pending'}
                </div>
                
                <div className="h-1 bg-[#222] w-full mb-3">
                  <div className="h-full bg-status-warn transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                
                <div className="h-[120px] overflow-y-auto text-xs text-terminal-mid space-y-1">
                  {logs.map((log, i) => (
                    <div key={i}>&gt; {log}</div>
                  ))}
                </div>
              </>
            )}

            {status === 'COMPLETED' && (
              <>
                <div className="text-status-ok text-xs uppercase mb-3 flex items-center gap-2 border-b border-[#222] pb-2">
                  <Activity size={12} />
                  Reconstruction Complete
                </div>
                <button 
                  onClick={() => {
                    setStatus('IDLE');
                    setFiles([]);
                    setModelUrl(null);
                  }}
                  className="border border-[#444] p-2 text-terminal-mid hover:text-terminal-bright text-xs uppercase"
                >
                  New Scan
                </button>
              </>
            )}

            {status === 'FAILED' && (
              <>
                <div className="text-status-err text-xs uppercase mb-3 flex items-center gap-2 border-b border-[#222] pb-2">
                  <AlertCircle size={12} />
                  Matrix Failure
                </div>
                <div className="text-status-err text-xs mb-3">{errorMsg}</div>
                <button 
                  onClick={() => setStatus('IDLE')}
                  className="border border-[#444] p-2 text-terminal-mid hover:text-terminal-bright text-xs uppercase"
                >
                  Reset
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
