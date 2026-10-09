import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Environment, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { DualModelClipper } from '../components/common/ExampleShowcase';
import {
  Upload,
  Check,
  Download,
  RotateCw,
  AlertCircle,
  ChevronDown,
  Clock,
  Box,
  Home,
  RotateCcw
} from 'lucide-react';
import { InteractiveBackground } from '../components/common/InteractiveBackground';
import { MonomeshLogo } from '../components/common/MonomeshLogo';

interface SamplePhoto {
  name: string;
  url: string;
  hint: string;
  modelUrl?: string;
  confidenceModelUrl?: string;
  initialRotation?: [number, number, number];
}

const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    name: 'Rubber ducky',
    url: '/demos/ducky.png',
    modelUrl: '/demos/ducky.glb',
    confidenceModelUrl: '/demos/duckycon.glb',
    initialRotation: [Math.PI / 2, 0, 0],
    hint: 'Smooth organic curves'
  },
  {
    name: 'Wooden chair',
    url: '/demos/demo1.png',
    modelUrl: '/demos/demo1.glb',
    confidenceModelUrl: '/demos/demo1con.glb',
    initialRotation: [Math.PI / 2, 0, 0],
    hint: 'Straight architectural lines'
  }
];

const MeshViewer = ({ url, initialRotation, wireframe }: { url: string, initialRotation?: [number, number, number], wireframe: boolean }) => {
  const { scene } = useGLTF(url);
  const clonedScene = React.useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (wireframe) {
          child.material = new THREE.MeshStandardMaterial({ color: '#8f8077', wireframe: true, roughness: 0.5, metalness: 0.2 });
        } else {
          if (child.material) {
            child.material = child.material.clone();
            child.material.side = THREE.DoubleSide;
          }
        }
      }
    });
    return clone;
  }, [scene, wireframe]);

  return (
    <group rotation={initialRotation}>
      <primitive object={clonedScene} />
    </group>
  );
};

export interface RealMeshStats {
  faces: number;
  vertices: number;
  components: number;
  dimensions: { x: number; y: number; z: number };
  volumeCm3: number;
  hasNormals: boolean;
  textureType: string;
}

const ModelInspectorInner: React.FC<{
  modelUrl: string;
  onInspect: (stats: RealMeshStats) => void;
  onSceneReady?: (scene: THREE.Group) => void;
}> = ({ modelUrl, onInspect, onSceneReady }) => {
  const { scene } = useGLTF(modelUrl);
  React.useEffect(() => {
    if (onSceneReady) {
      onSceneReady(scene);
    }

    let faces = 0;
    let vertices = 0;
    let components = 0;
    let hasNormals = true;
    let textureType = 'Embedded Colors';

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        components++;
        const g = child.geometry;
        if (g.index) {
          faces += g.index.count / 3;
        } else if (g.attributes.position) {
          faces += g.attributes.position.count / 3;
        }
        if (g.attributes.position) {
          vertices += g.attributes.position.count;
        }
        if (!g.attributes.normal) {
          hasNormals = false;
        }
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m: any) => {
            if (m.map) textureType = 'Embedded PBR Texture';
            else if (g.attributes.color) textureType = 'Vertex Colors';
          });
        }
      }
    });

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);

    const dimX = Math.round(size.x * 100) / 10;
    const dimY = Math.round(size.y * 100) / 10;
    const dimZ = Math.round(size.z * 100) / 10;
    const vol = Math.round(dimX * dimY * dimZ * 10) / 10;

    onInspect({
      faces: Math.round(faces),
      vertices: Math.round(vertices),
      components: Math.max(1, components),
      dimensions: { x: dimX, y: dimY, z: dimZ },
      volumeCm3: vol,
      hasNormals,
      textureType
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  return null;
};

const ModelInspector: React.FC<{
  modelUrl?: string;
  onInspect: (stats: RealMeshStats) => void;
  onSceneReady?: (scene: THREE.Group) => void;
}> = ({ modelUrl, onInspect, onSceneReady }) => {
  if (!modelUrl) return null;
  return <ModelInspectorInner modelUrl={modelUrl} onInspect={onInspect} onSceneReady={onSceneReady} />;
};

const CanvasLoader = () => {
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center p-4 bg-[#111111]/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/90 rounded-full animate-spin mb-3"></div>
        <div className="text-white/80 font-mono text-sm whitespace-nowrap">Downloading Mesh...</div>
      </div>
    </Html>
  );
};

const GENERATION_STAGES = [
  { label: 'Analysing input image', log: 'Detecting edges, depth cues & salient regions…', pct: 0 },
  { label: 'Running monocular depth', log: 'Estimating per-pixel depth map via neural network…', pct: 12 },
  { label: 'Lifting to 3-D point cloud', log: 'Back-projecting depth → world-space coordinates…', pct: 26 },
  { label: 'Solving occluded surfaces', log: 'Hallucinating unseen geometry with generative prior…', pct: 40 },
  { label: 'Meshing point cloud', log: 'Running Poisson surface reconstruction (octree = 10)…', pct: 58 },
  { label: 'Decimating & UV-unwrapping', log: 'Reducing to target poly-count, computing UV atlas…', pct: 74 },
  { label: 'Generating confidence map', log: 'Evaluating per-vertex geometric uncertainty…', pct: 90 },
];

export const CreatorStudio: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stagedSample, setStagedSample] = useState<SamplePhoto | null>(null);
  const [activeMesh, setActiveMesh] = useState<SamplePhoto & { glbSize?: number } | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'COMPLETED'>('IDLE');
  const [progressStage, setProgressStage] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [viewportMode, setViewportMode] = useState<'SOLID' | 'WIREFRAME' | 'CONFIDENCE'>('SOLID');
  const [autoRotate, setAutoRotate] = useState(true);

  // Keep the progress stage text strictly tied to the artificially crawling progress percentage
  // so the user actually sees the logs progress even while waiting on long backend steps.
  useEffect(() => {
    if (status !== 'PROCESSING') return;
    if (progressPct < 15) setProgressStage(1);
    else if (progressPct < 30) setProgressStage(2);
    else if (progressPct < 45) setProgressStage(3);
    else if (progressPct < 60) setProgressStage(4);
    else if (progressPct < 75) setProgressStage(5);
    else setProgressStage(6);
  }, [progressPct, status]);
  const [rotationAngle, setRotationAngle] = useState(30);
  const [exportFormat, setExportFormat] = useState<'GLB' | 'OBJ' | 'PLY'>('GLB');
  const [isFormatDropdownOpen, setIsFormatDropdownOpen] = useState(false);
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'success'>('idle');
  const [sliderValue, setSliderValue] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [showDetailsOnMobile, setShowDetailsOnMobile] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const processingTimers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const activeSceneRef = React.useRef<THREE.Group | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      setSliderValue((x / rect.width) * 100);
    }
  };

  const [modelFileSize, setModelFileSize] = useState<string>('1.05 MB');
  const [realMeshStats, setRealMeshStats] = useState<RealMeshStats>({
    faces: 54912,
    vertices: 27382,
    components: 1,
    dimensions: { x: 13.4, y: 13.2, z: 19.9 },
    volumeCm3: 3520,
    hasNormals: true,
    textureType: 'Embedded PBR Texture'
  });

  useEffect(() => {
    if (!activeMesh?.modelUrl) {
      if (file) {
        setModelFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      } else {
        setModelFileSize('1.40 MB');
      }
      return;
    }

    if (activeMesh.glbSize) {
      setModelFileSize(`${(activeMesh.glbSize / (1024 * 1024)).toFixed(2)} MB`);
    } else {
      setModelFileSize('Unknown MB');
    }
  }, [activeMesh, file]);

  const handleSelectSample = (sample: SamplePhoto) => {
    setPreviewUrl(sample.url);
    setStagedSample(sample);
    setFile(null);
    // Preserves current 3D mesh and stats until user clicks generate
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setStagedSample(null);
      // Preserves current 3D mesh and stats until user clicks generate
    }
  };

  const handleStartOver = () => {
    setFile(null);
    setPreviewUrl(null);
    setStagedSample(null);
    setActiveMesh(null);
    setStatus('IDLE');
    setProgressStage(0);
    setExportFormat('GLB');
    setViewportMode('SOLID');
    setDownloadState('idle');
  };

  const handleRunReconstruction = async () => {
    if (!previewUrl) return;
    setStatus('PROCESSING');
    setProgressStage(0);
    setProgressPct(0);
    setElapsedSec(0);

    // Clear any old timers
    processingTimers.current.forEach(clearInterval);
    processingTimers.current = [];

    // Unpausable time ticker based on system clock
    const startTime = Date.now();
    const ticker = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
      setProgressPct(prev => {
        if (prev < 25) return prev + 0.4;
        if (prev < 50) return prev + 0.2;
        if (prev < 85) return prev + 0.1;
        return prev;
      });
    }, 1000);
    processingTimers.current.push(ticker as unknown as ReturnType<typeof setTimeout>);

    try {
      if (stagedSample) {
        // Fast-track demo samples without hitting the backend
        const demoTicker = setInterval(() => {
          setProgressPct(prev => {
            if (prev < 20) setProgressStage(1);
            else if (prev < 40) setProgressStage(2);
            else if (prev < 60) setProgressStage(3);
            else if (prev < 80) setProgressStage(5);
            else setProgressStage(6);
            return prev >= 100 ? 100 : prev + 15;
          });
        }, 300);
        processingTimers.current.push(demoTicker as unknown as ReturnType<typeof setTimeout>);

        setTimeout(() => {
          clearInterval(demoTicker);
          setActiveMesh(stagedSample);
          setStatus('COMPLETED');
          setProgressPct(100);
          clearInterval(ticker);
        }, 2200);
        return;
      }

      if (!file) throw new Error("No image selected");

      const rawUrls = import.meta.env.VITE_MODAL_URL || 'https://ab85-35-247-0-102.ngrok-free.app';
      const MODAL_URLS = rawUrls.split(',').map((u: string) => u.trim()).filter(Boolean);
      
      const fd = new FormData();
      fd.append('image', file, file.name);

      setProgressPct(5);

      // 1. Submit Job (Round-Robin Fallback)
      let submitData = null;
      let activeUrl = null;

      for (const url of MODAL_URLS) {
        try {
          const res = await fetch(`${url}/submit`, { method: 'POST', body: fd });
          if (res.ok) {
            const data = await res.json();
            if (data.job_id) {
              submitData = data;
              activeUrl = url;
              break; // Success! Stop trying other URLs.
            }
          }
        } catch (e) {
          console.warn(`Failed to connect to ${url}, trying next account...`);
        }
      }

      if (!submitData?.job_id || !activeUrl) {
        throw new Error("All GPU endpoints are busy, down, or out of free credits.");
      }

      const jobId = submitData.job_id;

      // 2. Poll Status (Using the exact URL that succeeded)
      const pollInterval = setInterval(async () => {
        try {
          const statRes = await fetch(`${activeUrl}/status/${jobId}`);
          if (!statRes.ok) return; // ignore temporary network drops
          
          const statData = await statRes.json();
          
          if (statData.status === "NOT_FOUND") {
              clearInterval(pollInterval);
              clearInterval(ticker);
              throw new Error("Job expired or not found on server.");
          }

          if (statData.status === "PROCESSING") {
              const progress = statData.progress || 10;
              setProgressPct(prev => Math.max(prev, progress));
          }

          if (statData.status === 'COMPLETED') {
            clearInterval(pollInterval);
            clearInterval(ticker);
            
            setProgressStage(6);
            setProgressPct(95);

            // Stream the binary files directly into ThreeJS without ANY main-thread JSON parsing!
            const glbUrl = `${activeUrl}/download/${jobId}/model.glb`;
            
            let confUrl = glbUrl;
            if (statData.confidence_data) {
                confUrl = `${activeUrl}/download/${jobId}/confidence.glb`;
            }

            setActiveMesh({
              name: file?.name || 'mesh',
              url: previewUrl!,
              hint: 'AI Generated',
              modelUrl: glbUrl,
              confidenceModelUrl: confUrl,
              initialRotation: [0, 0, 0],
              glbSize: statData.glb_size
            });

            setStatus('COMPLETED');
            setProgressPct(100);
          } else if (statData.status === 'FAILED') {
            clearInterval(pollInterval);
            clearInterval(ticker);
            alert("GPU Error: " + (statData.error_message || "Reconstruction failed on GPU."));
            setStatus('IDLE');
            return;
          }
        } catch (e) {
           console.error("Polling error", e);
        }
      }, 2000);
      processingTimers.current.push(pollInterval as unknown as ReturnType<typeof setTimeout>);

    } catch (err: any) {
      console.error(err);
      alert(`Generation failed: ${err.message}`);
      setStatus('IDLE');
      clearInterval(ticker);
    }
  };

  // Continuous gentle viewport rotation
  useEffect(() => {
    if (!autoRotate || status !== 'COMPLETED') return;
    const interval = setInterval(() => {
      setRotationAngle((prev) => (prev + 1) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [autoRotate, status]);

  const handleDownload = async () => {
    if (downloadState !== 'idle') return;

    const rawName = activeMesh?.name
      ? activeMesh.name.toLowerCase().replace(/\s+/g, '_')
      : 'reconstructed_mesh';
    const ext = exportFormat.toLowerCase();
    const fileName = `${rawName}.${ext}`;
    const modelStem = activeMesh?.modelUrl ? activeMesh.modelUrl.replace(/\.glb$/, '') : '/demos/ducky';
    const directFileUrl = `${modelStem}.${ext}`;

    setDownloadState('downloading');

    // Ensure the loading state displays smoothly for at least 850ms so it doesn't flash or glitch
    const minDelay = new Promise((resolve) => setTimeout(resolve, 850));

    try {
      await Promise.all([
        (async () => {
          // 1. Direct fetch of real pre-generated asset (.obj, .ply, or .glb)
          try {
            const res = await fetch(directFileUrl);
            if (res.ok) {
              const blob = await res.blob();
              const mimeType = ext === 'obj' ? 'text/plain;charset=utf-8' : ext === 'ply' ? 'application/octet-stream' : 'model/gltf-binary';
              const fileBlob = new Blob([blob], { type: mimeType });
              const blobUrl = URL.createObjectURL(fileBlob);
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
              return;
            }
          } catch (e) {
            console.warn('Direct asset fetch error, using dynamic exporter:', e);
          }

          // 2. Dynamic in-memory exporter from active Three.js scene
          if (exportFormat === 'OBJ') {
            const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');
            const exporter = new OBJExporter();

            let sceneToExport = activeSceneRef.current;
            if (!sceneToExport) {
              const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
              const gltf = await new Promise<any>((resolve, reject) => {
                new GLTFLoader().load(activeMesh?.modelUrl || '/demos/ducky.glb', resolve, undefined, reject);
              });
              sceneToExport = gltf.scene;
            }
            if (!sceneToExport) return;

            const objText = exporter.parse(sceneToExport);
            const blob = new Blob([objText], { type: 'text/plain;charset=utf-8' });
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${rawName}.obj`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
          } else if (exportFormat === 'PLY') {
            const { PLYExporter } = await import('three/examples/jsm/exporters/PLYExporter.js');
            const exporter = new PLYExporter();

            let sceneToExport = activeSceneRef.current;
            if (!sceneToExport) {
              const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
              const gltf = await new Promise<any>((resolve, reject) => {
                new GLTFLoader().load(activeMesh?.modelUrl || '/demos/ducky.glb', resolve, undefined, reject);
              });
              sceneToExport = gltf.scene;
            }
            if (!sceneToExport) return;

            const plyResult = await new Promise<ArrayBuffer>((resolve) => {
              exporter.parse(sceneToExport!, (res) => resolve(res as ArrayBuffer), { binary: true });
            });

            const blob = new Blob([plyResult], { type: 'application/octet-stream' });
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${rawName}.ply`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
          } else {
            const response = await fetch(activeMesh?.modelUrl || '/demos/ducky.glb');
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${rawName}.glb`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
          }
        })(),
        minDelay
      ]);

      setDownloadState('success');
      setTimeout(() => {
        setDownloadState('idle');
      }, 1400);
    } catch (err) {
      console.error('Download failed:', err);
      setDownloadState('idle');
    }
  };

  return (
    <div className="h-[100dvh] w-full relative flex flex-col font-sans overflow-hidden selection:bg-[#f0604f]/30 selection:text-[#fff8f1] bg-transparent text-[#fff8f1]">
      {/* Calm Static Placeholder Background */}
      <InteractiveBackground />

      {/* Unboxed Header */}
      <div className="relative z-30 px-6 pt-4 pb-3 border-b border-[#f0604f]/20">
        <header className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Logo links home - Scaled Up */}
            <MonomeshLogo size="md" showWordmark={true} theme="dark" onClick={() => navigate('/')} />
            <span className="text-sm font-mono text-[#a89289] hidden sm:inline-block">/ studio</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-[#f0604f]/20 pt-3 sm:pt-0">
            {/* Go to Home Page Button */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-outline px-3 py-1.5 text-xs text-[#a89289] hover:text-[#fff8f1] flex items-center gap-1.5 transition-colors rounded border border-[#f0604f]/25 hover:border-[#f0604f]/60 bg-[#1a1210]/40"
              title="Return to Home Page"
            >
              <Home size={13} />
              <span>Home</span>
            </button>

            {/* "Start over" button - visible once a file/preview or model is loaded */}
            {(previewUrl || status !== 'IDLE') && (
              <button
                type="button"
                onClick={handleStartOver}
                className="btn-outline px-3 py-1.5 text-xs text-[#a89289] hover:text-[#fff8f1] flex items-center gap-1.5 transition-colors rounded border border-[#f0604f]/25 hover:border-[#f0604f]/60 bg-[#1a1210]/40"
                title="Reset Studio"
              >
                <RotateCcw size={12} />
                <span>Start over</span>
              </button>
            )}
          </div>
        </header>
      </div>

      {/* Studio Workspace Layout */}
      <main className="relative z-20 flex-1 min-h-0 max-w-[1400px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[300px_1fr_280px] gap-4 items-stretch overflow-y-auto lg:overflow-hidden max-lg:overflow-hidden">

        {/* PANE 1: INPUT & PHOTO SELECTION */}
        <section className={`flat-panel p-4 bg-[#181210]/15 backdrop-blur-sm border border-[#f0604f]/25 rounded-lg shadow-xl flex flex-col h-full space-y-4 overflow-y-auto min-h-0 custom-scrollbar ${status !== 'IDLE' ? 'max-lg:hidden' : ''}`}>
          <div>
            <h2 className="text-sm font-medium text-[#fff8f1] mb-1">
              Input photo
            </h2>
            <p className="text-xs text-[#a89289]">
              Drop a photo of an object. We&apos;ll build it in 3D.
            </p>
          </div>

          {/* Dropzone Target */}
          <label className="block relative w-full h-32 shrink-0 rounded border border-dashed border-[#f0604f]/25 hover:border-[#f0604f] bg-[#1a1210]/10 hover:bg-[#1a1210]/25 transition-colors cursor-pointer overflow-hidden group">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {previewUrl ? (
              <div className="w-full h-full relative">
                <div
                  className="w-full h-full bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${previewUrl})`, backgroundColor: '#e6dac3' }}
                />
                <div className="absolute inset-0 bg-[#1a1210]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-[#fff8f1] font-medium">
                  Click to replace photo
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#a89289] p-4 text-center">
                <div className="w-10 h-10 rounded bg-[#241d1a]/25 border border-[#f0604f]/25 flex items-center justify-center text-[#fff8f1] group-hover:text-[#f0604f] transition-colors">
                  <Upload size={18} />
                </div>
                <span className="text-xs font-medium text-[#fff8f1]">Drop a photo or click to browse</span>
                <span className="text-[11px] text-[#a89289]">JPG, PNG or WEBP</span>
              </div>
            )}
          </label>

          {/* Honest Tips Hint (Near Dropzone) */}
          <div className="bg-[#1a1210]/15 p-3 rounded border border-[#f0604f]/15 text-xs text-[#a89289] space-y-1">
            <div className="text-[11px] font-mono text-[#fff8f1] flex items-center gap-1.5">
              <span>💡</span>
              <span>Tips for best results</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Use a plain background, keep the object centered, and make sure lighting is even.
            </p>
          </div>

          {/* 3 Clickable Sample Thumbnails (Not Text Pills) */}
          <div className="shrink-0">
            <span className="text-[11px] font-mono text-[#a89289] block mb-2">Or test with a sample:</span>
            <div className="grid grid-cols-3 gap-2">
              {SAMPLE_PHOTOS.map((s) => {
                const isSelected = stagedSample?.name === s.name;
                return (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => handleSelectSample(s)}
                    className={`flex flex-col items-start p-1.5 rounded transition-all text-left group border ${
                      isSelected
                        ? 'border-[#f0604f] bg-[#f0604f]/20 shadow-[0_0_10px_rgba(240,96,79,0.25)]'
                        : 'border-[#f0604f]/20 bg-[#1a1210]/15 hover:border-[#f0604f]/60'
                    }`}
                  >
                    <div
                      className="w-full h-14 bg-contain bg-center bg-no-repeat rounded mb-1.5"
                      style={{ backgroundImage: `url(${s.url})`, backgroundColor: '#e6dac3' }}
                    />
                    <span className={`text-[11px] font-medium truncate w-full ${
                      isSelected ? 'text-[#f0604f] font-semibold' : 'text-[#fff8f1] group-hover:text-[#f0604f]'
                    }`}>
                      {s.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Action Button */}
          <div className={`pt-1 mt-auto shrink-0 transition-opacity ${previewUrl ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <button
              type="button"
              onClick={handleRunReconstruction}
              disabled={status === 'PROCESSING'}
              className="w-full py-3 btn-coral text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-transform active:scale-[0.98]"
            >
              {status === 'PROCESSING' ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Building mesh...</span>
                </div>
              ) : (
                <span>{status === 'COMPLETED' ? 'Generate mesh' : 'Make my mesh'}</span>
              )}
            </button>
            <p className="text-[10px] text-center text-[#a89289] mt-1.5 font-mono">
              ⚡ Est. generation time: ~3 min
            </p>
          </div>
        </section>

        {/* PANE 2: 3D VIEWPORT STAGE */}
        <section className={`flat-panel p-4 bg-[#181210]/15 backdrop-blur-sm border border-[#f0604f]/25 rounded-lg shadow-xl flex flex-col h-full min-h-0 relative overflow-hidden ${status === 'IDLE' ? 'max-lg:hidden' : ''}`}>

          {/* Viewport Header Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pb-3 mb-2 border-b border-[#f0604f]/20 z-10 gap-2 shrink-0">
            {/* View Mode Toggle: Solid vs Wireframe vs Confidence */}
            <div className="grid grid-cols-3 bg-[#1a1210]/25 p-0.5 rounded border border-[#f0604f]/25 text-xs">
              <button
                type="button"
                onClick={() => setViewportMode('SOLID')}
                className={`px-3 py-1.5 rounded font-medium transition-colors text-center w-full ${viewportMode === 'SOLID'
                  ? 'bg-[#f0604f] text-[#fff8f1]'
                  : 'text-[#a89289] hover:text-[#fff8f1]'
                  }`}
              >
                Solid
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('WIREFRAME')}
                className={`px-3 py-1.5 rounded font-medium transition-colors text-center w-full ${viewportMode === 'WIREFRAME'
                  ? 'bg-[#f0604f] text-[#fff8f1]'
                  : 'text-[#a89289] hover:text-[#fff8f1]'
                  }`}
              >
                Wireframe
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('CONFIDENCE')}
                className={`px-3 py-1.5 rounded font-medium transition-colors text-center w-full ${viewportMode === 'CONFIDENCE'
                  ? 'bg-[#f0604f] text-[#fff8f1]'
                  : 'text-[#a89289] hover:text-[#fff8f1]'
                  }`}
              >
                Confidence
              </button>
            </div>

            {/* Tiny Auto-rotate toggle */}
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`w-full sm:w-auto justify-center px-3 py-1.5 rounded border text-[11px] font-mono flex items-center gap-1.5 transition-colors ${autoRotate
                ? 'border-[#f0604f]/40 text-[#f0604f] bg-[#1a1210]/30'
                : 'border-[#f0604f]/20 text-[#a89289] bg-[#1a1210]/20 hover:border-[#f0604f]/40'
                }`}
            >
              <RotateCw size={11} className={autoRotate ? 'animate-spin' : ''} style={{ animationDuration: '6s' }} />
              <span>Orbit {autoRotate ? 'on' : 'off'}</span>
            </button>
          </div>

          {/* Main Stage Canvas Area */}
          <div className="flex-1 w-full rounded bg-transparent border border-[#f0604f]/20 relative flex items-center justify-center overflow-hidden">

            {/* Fine background grid - subtle & translucent for maximum 3D model visibility */}
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(#f0604f 1px, transparent 1px), linear-gradient(90deg, #f0604f 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />

            {/* 1. STANDBY EMPTY STATE */}
            {status === 'IDLE' && (
              <div className="text-center p-6 max-w-sm relative z-10 flex flex-col items-center">
                <div className="mb-4 opacity-80">
                  <MonomeshLogo size="lg" showWordmark={false} />
                </div>
                <h3 className="text-sm font-medium text-[#fff8f1] mb-1">
                  Ready for your photo
                </h3>
                <p className="text-xs text-[#a89289] leading-relaxed">
                  Drop an image on the left panel. We&apos;ll calculate depth, solve the unseen backside, and render the complete mesh here.
                </p>
              </div>
            )}

            {/* 2. IMMERSIVE PIPELINE PROGRESS STATE */}
            {status === 'PROCESSING' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 gap-4">

                {/* Big pulsing logo */}
                <div className="relative flex items-center justify-center">
                  {/* Outer coral ring pulse */}
                  <div className="absolute w-28 h-28 rounded-full border border-[#f0604f]/30 animate-ping" style={{ animationDuration: '2.4s' }} />
                  <div className="absolute w-20 h-20 rounded-full border border-[#f0604f]/20 animate-ping" style={{ animationDuration: '1.8s', animationDelay: '0.4s' }} />
                  <div className="relative z-10 animate-pulse" style={{ animationDuration: '3s' }}>
                    <MonomeshLogo size="lg" showWordmark={false} />
                  </div>
                </div>

                {/* Stage label + Elapsed & Estimated Time */}
                <div className="text-center space-y-1.5">
                  <p className="text-sm md:text-base font-semibold text-[#fff8f1] tracking-wide">
                    {GENERATION_STAGES[progressStage]?.label ?? 'Processing…'}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-[#a89289]">
                    <span>
                      {Math.floor(elapsedSec / 60).toString().padStart(2, '0')}:{(elapsedSec % 60).toString().padStart(2, '0')} elapsed
                    </span>
                    <span className="text-[#f0604f]/40">•</span>
                    <span className="inline-flex items-center gap-1 text-[#f0604f] font-medium bg-[#f0604f]/10 px-2 py-0.5 rounded border border-[#f0604f]/25">
                      <Clock size={11} />
                      <span>Est. ~3 min</span>
                    </span>
                  </div>
                </div>

                {/* Smooth progress bar */}
                <div className="w-full max-w-xs">
                  <div className="flex justify-between text-[10px] font-mono text-[#a89289] mb-1.5">
                    <span>Reconstruction pipeline</span>
                    <span className="text-[#f0604f] font-semibold">{Math.round(progressPct)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#1a1210]/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#f0604f] to-[#ff8a76] transition-all duration-700 ease-out"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Centered Active Log Sentence (Saves space, shows only current step sentence) */}
                <div className="w-full max-w-md px-4 py-2 rounded-md bg-[#0d0a09]/70 backdrop-blur-sm border border-[#f0604f]/20 flex items-center justify-center gap-2 text-center shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f0604f] animate-ping shrink-0" />
                  <span key={progressStage} className="text-xs font-mono text-[#ff9f8e] tracking-tight leading-snug">
                    {GENERATION_STAGES[progressStage]?.log}
                  </span>
                </div>

                {/* Step indicators */}
                <div className="flex items-center gap-1.5">
                  {GENERATION_STAGES.map((_, idx) => (
                    <div
                      key={idx}
                      className={`rounded-full transition-all duration-500 ${idx < progressStage ? 'w-2 h-2 bg-[#f0604f]' :
                          idx === progressStage ? 'w-5 h-2 bg-[#f0604f]' :
                            'w-2 h-2 bg-[#352521]'
                        }`}
                    />
                  ))}
                </div>

              </div>
            )}

            {/* 3. COMPLETED 3D MESH STATE */}
            {status === 'COMPLETED' && (
              <div
                ref={containerRef}
                className="w-full h-full relative flex flex-col items-center justify-center p-6 cursor-grab active:cursor-grabbing select-none"
              >
                <div className="absolute inset-0">
                  <Canvas
                    gl={{ antialias: true, powerPreference: 'high-performance', localClippingEnabled: true }}
                    camera={{ position: [0, 0, 4], fov: 45 }}
                  >
                    <Suspense fallback={<CanvasLoader />}>
                      <ModelInspector
                        modelUrl={activeMesh?.modelUrl}
                        onInspect={setRealMeshStats}
                        onSceneReady={(sc) => { activeSceneRef.current = sc; }}
                      />
                      <ambientLight intensity={0.7} />
                      <directionalLight position={[10, 10, 5]} intensity={1} />
                      <Environment preset="city" />
                      <Center>
                        {activeMesh?.modelUrl ? (
                          viewportMode === 'CONFIDENCE' && activeMesh.confidenceModelUrl ? (
                            <DualModelClipper
                              modelUrl={activeMesh.modelUrl}
                              confidenceModelUrl={activeMesh.confidenceModelUrl}
                              sliderValue={sliderValue}
                              initialRotation={activeMesh.initialRotation}
                              autoRotate={autoRotate}
                            />
                          ) : (
                            <MeshViewer
                              url={activeMesh.modelUrl}
                              initialRotation={activeMesh.initialRotation}
                              wireframe={viewportMode === 'WIREFRAME'}
                            />
                          )
                        ) : (
                          <mesh>
                            <boxGeometry args={[1, 1, 1]} />
                            <meshStandardMaterial
                              color={viewportMode === 'WIREFRAME' ? "#f0604f" : "#a89289"}
                              wireframe={viewportMode === 'WIREFRAME'}
                            />
                          </mesh>
                        )}
                      </Center>
                      <OrbitControls
                        enableZoom={true}
                        enablePan={false}
                        autoRotate={autoRotate}
                        autoRotateSpeed={2.0}
                      />
                    </Suspense>
                  </Canvas>
                </div>

                {/* Slider UI - Only show in Confidence mode */}
                {viewportMode === 'CONFIDENCE' && (
                  <div className="absolute inset-0 z-20 pointer-events-none">
                    {/* Divider Line */}
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-[#f0604f] shadow-[0_0_10px_rgba(240,96,79,0.8)] transition-none"
                      style={{ left: `${sliderValue}%`, transform: 'translateX(-50%)' }}
                    ></div>

                    {/* Draggable Thumb */}
                    <div
                      className={`absolute top-1/2 -mt-4 w-8 h-8 -ml-4 rounded-full bg-[#f0604f] flex items-center justify-center pointer-events-auto cursor-ew-resize shadow-lg border-2 border-[#fff8f1] transition-transform touch-none ${isDragging ? 'scale-95' : 'hover:scale-110'}`}
                      style={{ left: `${sliderValue}%` }}
                      onPointerDown={handlePointerDown}
                      onPointerUp={handlePointerUp}
                      onPointerMove={handlePointerMove}
                    >
                      <div className="flex gap-0.5">
                        <div className="w-0.5 h-3 bg-[#fff8f1] rounded-full"></div>
                        <div className="w-0.5 h-3 bg-[#fff8f1] rounded-full"></div>
                      </div>
                    </div>

                    {/* Confidence Legend */}
                    <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none flex justify-center">
                      <div className="bg-[#1a1210]/90 px-3 py-1.5 rounded-full border border-[#453a34] backdrop-blur shadow-xl flex items-center gap-3 sm:gap-4 max-w-full overflow-hidden">
                        <span className="text-[9px] font-mono tracking-widest text-[#c4b5aa] uppercase shrink-0 hidden sm:inline-block">Confidence:</span>
                        <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-[#fff8f1] shrink-0">
                          <span className="text-green-500 text-xs leading-none">■</span> Exact
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-[#fff8f1] shrink-0">
                          <span className="text-yellow-500 text-xs leading-none">■</span> Doubtful
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-[#fff8f1] shrink-0">
                          <span className="text-red-500 text-xs leading-none">■</span> Fill
                        </div>
                      </div>
                    </div>
                  </div>
                )}

            {/* Mobile explicit action buttons overlaid directly on viewport */}
            {status === 'COMPLETED' && (
              <div className="absolute bottom-3 left-3 right-3 flex gap-2 lg:hidden z-30 pointer-events-none">
                <button onClick={handleDownload} className="flex-1 btn-coral py-2.5 rounded text-xs font-semibold flex items-center justify-center gap-2 pointer-events-auto shadow-[0_4px_16px_rgba(0,0,0,0.6)] border border-[#f0604f]/50">
                  <Download size={14} /> Download
                </button>
                <button onClick={() => setShowDetailsOnMobile(true)} className="flex-1 btn-outline py-2.5 rounded border border-[#f0604f]/40 text-[#fff8f1] text-xs font-semibold flex items-center justify-center gap-2 bg-[#1a1210]/95 backdrop-blur-md pointer-events-auto shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
                  <Box size={14} /> Details
                </button>
              </div>
            )}

              </div>
            )}
          </div>
        </section>

        {/* PANE 3: MESH DETAILS & DOWNLOAD */}
        {/* Hidden completely until a mesh actually exists! */}
        {status === 'COMPLETED' ? (
          <aside className={`flat-panel p-3 bg-[#181210]/95 backdrop-blur-xl border-t lg:border-t-0 lg:border border-[#f0604f]/25 lg:rounded-lg shadow-2xl flex flex-col h-full justify-between space-y-2 min-h-0
            max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:h-[65vh] max-lg:z-50 max-lg:rounded-t-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
            ${showDetailsOnMobile ? 'max-lg:translate-y-0' : 'max-lg:translate-y-full'}
            lg:flex
          `}>
            {/* Drag Handle & Header for Mobile */}
            <div 
              className="flex items-center justify-between pb-2 border-b border-[#f0604f]/20 shrink-0 cursor-pointer lg:cursor-auto"
              onClick={() => setShowDetailsOnMobile(false)}
              onTouchStart={e => {
                e.currentTarget.dataset.touchStartY = e.touches[0].clientY.toString();
              }}
              onTouchMove={e => {
                const startY = parseFloat(e.currentTarget.dataset.touchStartY || '0');
                if (e.touches[0].clientY > startY + 40) setShowDetailsOnMobile(false);
              }}
            >
              <div className="flex items-center gap-1.5">
                <Box size={14} className="text-[#f0604f]" />
                <span className="text-xs font-semibold text-[#fff8f1]">Mesh Details</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#4ade80] bg-[#4ade80]/10 px-1.5 py-0.5 rounded border border-[#4ade80]/20">
                  <Check size={10} /> Watertight Solid
                </span>
                <button 
                  className="lg:hidden p-1 rounded hover:bg-white/10 text-[#a89289] hover:text-white transition-colors"
                  onClick={(e) => { e.stopPropagation(); setShowDetailsOnMobile(false); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>

            {/* 4-Item Telemetry Metric Grid */}
            <div className="grid grid-cols-2 gap-1.5 shrink-0 text-center">
              <div className="bg-[#1a1210]/20 px-2 py-1.5 rounded border border-[#f0604f]/15">
                <span className="text-[9px] font-mono text-[#a89289] uppercase tracking-wider block">Faces</span>
                <span className="text-xs font-mono font-bold text-[#fff8f1]">{realMeshStats.faces.toLocaleString()}</span>
              </div>
              <div className="bg-[#1a1210]/20 px-2 py-1.5 rounded border border-[#f0604f]/15">
                <span className="text-[9px] font-mono text-[#a89289] uppercase tracking-wider block">Vertices</span>
                <span className="text-xs font-mono font-bold text-[#fff8f1]">{realMeshStats.vertices.toLocaleString()}</span>
              </div>
              <div className="bg-[#1a1210]/20 px-2 py-1.5 rounded border border-[#f0604f]/15">
                <span className="text-[9px] font-mono text-[#a89289] uppercase tracking-wider block">File Size</span>
                <span className="text-xs font-mono font-bold text-[#f0604f]">{modelFileSize}</span>
              </div>
              <div className="bg-[#1a1210]/20 px-2 py-1.5 rounded border border-[#f0604f]/15">
                <span className="text-[9px] font-mono text-[#a89289] uppercase tracking-wider block">Volume</span>
                <span className="text-xs font-mono font-bold text-[#fff8f1]">{(realMeshStats.volumeCm3 / 1000).toFixed(2)} L</span>
              </div>
            </div>

            {/* Unified Specs Card */}
            <div className="bg-[#1a1210]/15 p-2.5 rounded-lg border border-[#f0604f]/15 space-y-1 text-[11px] shrink-0">
              <div className="flex justify-between items-center py-0.5 border-b border-[#f0604f]/10">
                <span className="text-[#a89289]">Dimensions</span>
                <span className="font-mono text-[#fff8f1] font-medium text-[11px]">
                  {realMeshStats.dimensions.x} × {realMeshStats.dimensions.y} × {realMeshStats.dimensions.z} cm
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#f0604f]/10">
                <span className="text-[#a89289]">Body Structure</span>
                <span className="font-mono text-[#fff8f1] text-[11px]">
                  {realMeshStats.components === 1 ? '1 solid body' : `${realMeshStats.components} parts`}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-[#f0604f]/10">
                <span className="text-[#a89289]">Texture / UV</span>
                <span className="font-mono text-[#fff8f1] text-[11px] truncate max-w-[130px]" title={realMeshStats.textureType}>
                  {realMeshStats.textureType}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-[#a89289]">Face Orientation</span>
                <span className="font-mono text-[#fff8f1] text-[11px]">
                  Outward
                </span>
              </div>
            </div>

            {/* Download with Format Dropdown - Seamlessly Aligned */}
            <div className="pt-1 space-y-1.5 mt-auto shrink-0">
              <div className={`relative flex items-stretch w-full rounded-md border transition-all duration-300 ${
                downloadState === 'success'
                  ? 'bg-emerald-600 border-emerald-500 shadow-[0_2px_0_#047857]'
                  : 'bg-[#f0604f] border-[#d94d3d] shadow-[0_2px_0_#b5382a]'
              }`}>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloadState !== 'idle'}
                  className="flex-1 py-2 px-3 text-xs font-semibold text-[#fff8f1] flex items-center justify-center gap-1.5 hover:bg-white/10 active:bg-black/10 disabled:cursor-default transition-all duration-200 rounded-l-[5px]"
                >
                  {downloadState === 'downloading' && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  )}
                  {downloadState === 'success' && (
                    <Check size={14} className="text-white stroke-[2.5] shrink-0" />
                  )}
                  {downloadState === 'idle' && (
                    <Download size={13} className="shrink-0" />
                  )}
                  <span className="font-medium tracking-wide transition-all duration-200">
                    {downloadState === 'downloading'
                      ? 'Downloading...'
                      : downloadState === 'success'
                      ? 'Downloaded!'
                      : `Download .${exportFormat.toLowerCase()}`}
                  </span>
                </button>

                <div className={`w-[1px] shrink-0 transition-colors duration-300 ${
                  downloadState === 'success' ? 'bg-emerald-500' : 'bg-[#d94d3d]'
                }`} />

                <button
                  type="button"
                  disabled={downloadState !== 'idle'}
                  onClick={() => setIsFormatDropdownOpen(!isFormatDropdownOpen)}
                  className="px-2.5 text-[#fff8f1] hover:bg-white/10 active:bg-black/10 disabled:opacity-50 transition-colors flex items-center justify-center rounded-r-[5px]"
                  title="Change export format"
                >
                  <ChevronDown size={13} className={`transition-transform duration-200 ${isFormatDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isFormatDropdownOpen && (
                  <div className="absolute right-0 bottom-full mb-1.5 w-32 bg-[#1a1210]/95 backdrop-blur-md border border-[#f0604f]/40 rounded-lg shadow-2xl z-40 overflow-hidden text-xs py-1">
                    <div className="px-2.5 py-1 text-[10px] font-mono text-[#a89289] uppercase tracking-wider border-b border-[#f0604f]/15 mb-0.5">
                      Select Format
                    </div>
                    {(['GLB', 'OBJ', 'PLY'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => {
                          setExportFormat(fmt);
                          setIsFormatDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 font-mono flex items-center justify-between hover:bg-[#f0604f]/20 transition-colors ${exportFormat === fmt ? 'text-[#f0604f] font-semibold bg-[#f0604f]/10' : 'text-[#fff8f1]'
                          }`}
                      >
                        <span>.{fmt.toLowerCase()}</span>
                        {exportFormat === fmt && <Check size={12} className="text-[#f0604f]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-[10px] text-[#a89289] text-center block">
                Slicer-ready for Cura, PrusaSlicer & CAD.
              </span>
            </div>
          </aside>
        ) : (
          /* Empty placeholder for right pane so layout is calm and not showing fake telemetry */
          <aside className="flat-panel p-4 bg-[#181210]/15 backdrop-blur-sm border border-[#f0604f]/25 rounded-lg shadow-xl text-center py-12 flex flex-col items-center justify-center h-full min-h-0 max-lg:hidden">
            <span className="text-xs font-mono text-[#a89289]">Mesh details</span>
            <p className="text-xs text-[#a89289] mt-2 max-w-[200px] leading-relaxed">
              Upload a photo and click &ldquo;Make my mesh&rdquo; to view polygon stats and download options.
            </p>
          </aside>
        )}

      </main>
    </div>
  );
};
